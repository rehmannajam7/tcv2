# Flow execution service for triggering and executing flows in conversations
class Flows::ExecutionService
  include Events::Types
  include ::FileTypeHelper

  attr_reader :flow, :conversation, :contact, :trigger_data

  # Maximum time to wait for a contact response at a wait node
  # After this timeout, the session will follow the default route (if available)
  WAIT_TIMEOUT_SECONDS = 15.minutes.to_i

  def initialize(flow:, conversation:, trigger_data: {})
    @flow = flow
    @conversation = conversation
    @contact = conversation.contact
    @trigger_data = trigger_data
  end

  def perform
    return unless flow&.active?

    # If we're resuming an existing execution, handle it differently
    if trigger_data[:resume_execution_id]
      resume_flow_execution
      return
    end

    # Guard against duplicate concurrent starts for the same conversation/contact/flow
    if FlowExecution.exists?(conversation_id: conversation.id,
                             contact_id: contact.id,
                             flow_id: flow.id,
                             status: [:pending, :running])
      Rails.logger.info "Active execution already exists for flow #{flow.id} in conversation #{conversation.id}; skipping new start"
      return
    end

    return unless should_execute_flow?

    Rails.logger.info "Executing flow #{flow.id} for conversation #{conversation.id}"

    begin
      # Create or update a running execution record for visibility and race prevention
      running_execution = FlowExecution.find_by(
        conversation_id: conversation.id,
        contact_id: contact.id,
        flow_id: flow.id
      )
      if running_execution
        running_execution.update!(status: :running, started_at: Time.current)
      else
        running_execution = FlowExecution.create!(
          flow: flow,
          conversation: conversation,
          contact: contact,
          account: conversation.account,
          status: :running,
          started_at: Time.current,
          context: {},
          results: {}
        )
      end

      # Log flow execution immediately when flow starts, not after completion
      log_flow_execution

      execute_flow_definition
      # If we didn't pause at a wait node, mark the execution completed
      if running_execution&.persisted?
        # Only mark completed if there is no pending execution for this flow/conversation/contact
        still_pending = FlowExecution.exists?(id: running_execution.id,
                                              status: :pending)
        unless still_pending
          running_execution.update!(status: :completed, completed_at: Time.current)
          # Clean up all flow-related cache keys for this conversation
          cleanup_flow_session_cache(conversation, flow)
        end
      end
      # After completing a flow, attempt to start the next queued flow
      start_next_queued_flow_if_any
    rescue StandardError => e
      Rails.logger.error "Flow execution error: #{e.message}"
      ChatwootExceptionTracker.new(e, account: conversation.account).capture_exception
    end
  end

  private

  def should_execute_flow?
    case flow.trigger_type
    when 'manual'
      # Manual flows are triggered explicitly
      true
    when 'automatic'
      # Check trigger conditions for automatic flows
      evaluate_trigger_conditions
    when 'webhook'
      # Webhook flows are triggered by external events
      trigger_data.present?
    else
      false
    end
  end

  def evaluate_trigger_conditions
    return true if flow.trigger_conditions.blank?

    conditions = JSON.parse(flow.trigger_conditions)
    conditions.all? { |condition| evaluate_condition(condition) }
  rescue JSON::ParserError
    Rails.logger.error "Invalid trigger conditions JSON for flow #{flow.id}"
    false
  end

  def evaluate_condition(condition)
    attribute = condition['attribute']
    operator = condition['operator']
    value = condition['value']

    case attribute
    when 'message_content'
      evaluate_message_condition(operator, value)
    when 'conversation_status'
      evaluate_status_condition(operator, value)
    when 'contact_attribute'
      evaluate_contact_condition(condition['contact_attribute'], operator, value)
    when 'inbox_id'
      evaluate_inbox_condition(operator, value)
    when 'trigger_keyword'
      evaluate_keyword_condition(value)
    else
      false
    end
  end

  def evaluate_message_condition(operator, value)
    last_message = conversation.messages.incoming.last
    return false unless last_message

    case operator
    when 'contains'
      last_message.content&.downcase&.include?(value.downcase)
    when 'equals'
      last_message.content&.downcase == value.downcase
    when 'starts_with'
      last_message.content&.downcase&.start_with?(value.downcase)
    else
      false
    end
  end

  def evaluate_status_condition(operator, value)
    case operator
    when 'equals'
      conversation.status == value
    when 'not_equals'
      conversation.status != value
    else
      false
    end
  end

  def evaluate_contact_condition(attribute, operator, value)
    contact_value = contact.send(attribute) if contact.respond_to?(attribute)

    case operator
    when 'equals'
      contact_value == value
    when 'contains'
      contact_value&.downcase&.include?(value.downcase)
    else
      false
    end
  end

  def evaluate_inbox_condition(operator, value)
    case operator
    when 'equals'
      conversation.inbox_id.to_s == value.to_s
    else
      false
    end
  end

  def evaluate_keyword_condition(keyword)
    return false if keyword.blank?

    last_message = conversation.messages.incoming.last
    return false unless last_message

    last_message.content&.downcase&.include?(keyword.downcase)
  end

  def execute_flow_definition
    return if flow.flow_data.blank?

    flow_definition = JSON.parse(flow.flow_data)
    execute_flow_nodes(flow_definition)
  rescue JSON::ParserError
    Rails.logger.error "Invalid flow definition JSON for flow #{flow.id}"
  end

  def execute_flow_nodes(flow_definition)
    # Start from the entry node
    current_node = find_entry_node(flow_definition)
    unless current_node
      Rails.logger.error "[Flow] No entry node found in flow definition for flow #{flow.id}"
      return
    end

    Rails.logger.info "[Flow] Starting flow execution from entry node: #{current_node['uuid']}"

    execution_context = {
      conversation: conversation,
      contact: contact,
      flow: flow,
      variables: {},
      flow_definition: flow_definition, # Store flow definition in context for proper state management
      execution_started_at: Time.current # Track when execution started for proper timing
    }

    node_count = 0
    max_nodes = 100 # Prevent infinite loops

    while current_node && node_count < max_nodes
      node_count += 1
      Rails.logger.debug { "[Flow] Executing node #{node_count}: #{current_node['uuid']} - #{current_node['type']}" }

      current_node = execute_node(current_node, flow_definition, execution_context)

      # If we hit a wait_for_response node, store the flow state and pause
      return if execution_context[:flow_paused]
    end

    return unless node_count >= max_nodes

    Rails.logger.error "[Flow] Flow execution stopped due to max node limit reached for flow #{flow.id}"
  end

  def find_entry_node(flow_definition)
    nodes = flow_definition['nodes'] || []
    nodes.find { |node| node['type'] == 'entry' } || nodes.first
  end

  def determine_node_type(node)
    # Check if node has explicit type
    return node['type'] if node['type'].present?

    # Check if actions are present and use first action type
    actions = node['actions'] || []
    return actions.first['type'] if actions.any? && actions.first['type'].present?

    # Infer router-based types when router or top-level categories/cases exist
    if node['router'].present? || node['categories'].present? || node['cases'].present?
      # If waiting for a response, treat as wait_for_response
      return 'wait_for_response' if node['router']&.dig('wait', 'type') == 'msg' || node.dig('wait', 'type') == 'msg'

      # Otherwise treat as switch/router
      return 'switch'
    end

    'unknown'
  end

  def execute_node(node, flow_definition, context)
    node_type = determine_node_type(node)
    Rails.logger.debug { "Executing node: #{node_type} - #{node['uuid']}" }

    # Check if this node should pause for user response
    has_wait_msg = (node['wait']&.dig('type') == 'msg') || (node['router']&.dig('wait', 'type') == 'msg')
    return execute_wait_for_response_node(node, context) if has_wait_msg

    case node_type
    when 'execute_actions'
      execute_all_node_actions(node, context)
    when 'send_msg'
      execute_send_message_node(node, context)
    when 'wait_for_response'
      execute_wait_for_response_node(node, context)
    when 'set_contact_field'
      execute_set_contact_field_node(node, context)
    when 'add_contact_groups'
      execute_add_contact_groups_node(node, context)
    when 'call_webhook'
      execute_call_webhook_node(node, context)
    when 'send_email'
      execute_send_email_node(node, context)
    when 'set_run_result'
      execute_set_run_result_node(node, context)
    when 'switch', 'router'
      return execute_switch_node(node, flow_definition, context)
    when 'split_by_expression'
      return execute_split_by_expression_node(node, flow_definition, context)
    else
      Rails.logger.warn "Unknown node type: #{node_type}"
    end

    # Find next node
    find_next_node(node, flow_definition)
  end

  def execute_all_node_actions(node, context)
    actions = node['actions'] || []
    actions.each do |action|
      case action['type']
      when 'send_msg'
        execute_send_message_node(node, context)
      when 'set_run_result'
        virtual_node = { 'actions' => [action], 'uuid' => node['uuid'] }
        execute_set_run_result_node(virtual_node, context)
      when 'set_contact_field'
        virtual_node = node.merge('field' => action['field'], 'value' => action['value'])
        execute_set_contact_field_node(virtual_node, context)
      when 'call_webhook'
        execute_call_webhook_node(node, context)
      when 'send_email'
        execute_send_email_node(node, context)
      when 'add_contact_groups'
        execute_add_contact_groups_node(node, context)
      else
        Rails.logger.debug { "[Flow] Skipping unknown action type: #{action['type']}" }
      end
    end

    # If there were no recognized actions but there is message text, fall back to send_msg
    execute_send_message_node(node, context) if actions.empty?
  end

  def execute_send_message_node(node, context)
    message_text = node['text'] || node['actions']&.first&.dig('text')
    flow_attachments = node['actions']&.first&.dig('attachments') || node['attachments'] || []
    return if message_text.blank? && flow_attachments.blank?

    # Replace variables in message text
    processed_text = message_text.present? ? replace_variables(message_text, context) : ''

    # Ensure conversation is open if silent mode would block outgoing messages
    if Conversations::SilentModeValidationService.should_skip_outgoing_message?(conversation)
      Rails.logger.info "Flow #{flow.id} reopening resolved conversation #{conversation.id} to send a message"
      conversation.open!
    end

    # Get quick replies from the action or top-level fallback
    quick_replies = node['actions']&.first&.dig('quick_replies') || node['quick_replies'] || []
    Rails.logger.info "Quick replies found: #{quick_replies.inspect}" if quick_replies.any?

    # Build content_attributes with flow metadata
    content_attrs = {
      flow_id: flow.id,
      node_uuid: node['uuid']
    }

    # Send message through Chatwoot's message system
    params = {
      content: processed_text,
      private: false
    }

    # When quick replies exist, use input_select content_type with items array
    # so the widget renders clickable buttons
    if quick_replies.present?
      params[:content_type] = 'input_select'
      content_attrs[:items] = quick_replies.map { |qr| { title: qr.to_s, value: qr.to_s } }
    end

    params[:content_attributes] = content_attrs

    # Attribute sender to active bot or Captain Assistant if available
    inbox = conversation.inbox
    if inbox&.agent_bot_inbox&.active? && inbox.agent_bot
      params[:sender_type] = 'AgentBot'
      params[:sender_id] = inbox.agent_bot.id
    elsif inbox.respond_to?(:captain_assistant) && inbox.captain_assistant.present?
      params[:sender_type] = 'Captain::Assistant'
      params[:sender_id] = inbox.captain_assistant.id
    end

    msg_id = conversation.messages.incoming.last&.id
    idk_base = "flow:send_idempotency:#{conversation.id}:#{flow.id}:#{node['uuid']}"
    idk = msg_id ? "#{idk_base}:msg:#{msg_id}" : idk_base
    return if Rails.cache.exist?(idk)

    Rails.cache.write(idk, true, expires_in: 60.seconds)

    message = Messages::MessageBuilder.new(nil, conversation, params).perform

    if flow_attachments.present?
      attach_flow_media(message, flow_attachments)
      # Touch the message so after_update_commit dispatches MESSAGE_UPDATED,
      # which broadcasts the message (now including attachments) to the widget.
      message.touch
    end

    message
  end

  def attach_flow_media(message, attachment_strings)
    attachment_strings.each do |att_string|
      next if att_string.blank?

      split_pos = att_string.index(':')
      next unless split_pos

      declared_type = att_string[0...split_pos]
      url = att_string[(split_pos + 1)..]
      next if url.blank?

      begin
        downloaded = Down.download(url)
        # Prefer the actual content type from the download for accurate file_type mapping;
        # fall back to the declared type from FlowEditor (e.g. "image", "audio")
        resolved_type = downloaded.content_type.presence || declared_type
        attachment = message.attachments.new(
          account_id: message.account_id,
          file_type: file_type(resolved_type),
          external_url: url,
          file: {
            io: downloaded,
            filename: downloaded.original_filename,
            content_type: downloaded.content_type
          }
        )
        attachment.save!
        Rails.logger.info "[Flow] Attached #{resolved_type} to message #{message.id}"
      rescue Down::Error => e
        Rails.logger.error "[Flow] Failed to download attachment #{url}: #{e.message}"
        create_flow_attachment_fallback(message, url, declared_type)
      rescue StandardError => e
        Rails.logger.error "[Flow] Failed to attach file from #{url}: #{e.message}"
        create_flow_attachment_fallback(message, url, declared_type)
      end
    end
  end

  # When download fails, create a fallback attachment so the widget can show the URL as a link
  def create_flow_attachment_fallback(message, url, _declared_type)
    fallback_title = begin
      File.basename(URI.parse(url).path)
    rescue URI::InvalidURIError
      'Attachment'
    end
    fallback_title = fallback_title.presence || 'Attachment'
    message.attachments.create!(
      account_id: message.account_id,
      file_type: :fallback,
      external_url: url,
      fallback_title: fallback_title
    )
    Rails.logger.info "[Flow] Created fallback attachment for #{url} on message #{message.id}"
  end

  def execute_wait_for_response_node(node, context)
    # This node pauses execution until the next user message
    # Store the flow state and create a pending execution

    Rails.logger.info "Flow paused at wait_for_response node: #{node['uuid']}"

    # Store the current flow state - prefer context flow_definition if available
    parsed_definition = context[:flow_definition] || begin
      flow.flow_data.is_a?(String) ? JSON.parse(flow.flow_data) : flow.flow_data
    rescue JSON::ParserError
      {}
    end

    # Ensure we have a valid flow definition
    if parsed_definition.blank?
      Rails.logger.error 'No valid flow definition found for wait_for_response node'
      return nil
    end

    # Capture router metadata to help deterministic option routing on resume
    # Prefer quick replies from the latest outgoing send_msg node when available
    quick_replies = node['actions']&.first&.dig('quick_replies') || []
    if quick_replies.blank?
      begin
        # Try to locate the previous node via exit/connection graph
        prev = find_previous_node(node, parsed_definition)
        if prev
          prev_qr = prev['actions']&.first&.dig('quick_replies') || []
          quick_replies = prev_qr if prev_qr.present?
        end
      rescue StandardError
        # no-op if graph traversal fails
      end
    end
    categories = node['router']&.dig('categories') || node['categories'] || []
    timeout_override = node['wait']&.dig('timeout_seconds') || node['router']&.dig('wait', 'timeout_seconds')

    flow_state = {
      current_node_uuid: node['uuid'],
      flow_definition: parsed_definition,
      context: context.except(:conversation, :contact, :flow, :flow_definition).merge({
                                                                                        router_metadata: {
                                                                                          quick_replies: Array(quick_replies).map(&:to_s),
                                                                                          category_names: Array(categories).map do |c|
                                                                                            c['name'].to_s
                                                                                          end,
                                                                                          categories_count: Array(categories).size,
                                                                                          timeout_seconds: timeout_override
                                                                                        }
                                                                                      }),
      paused_at: Time.current
    }

    # Use database transaction to prevent race conditions
    flow_execution = nil
    ActiveRecord::Base.transaction do
      # Lock the conversation to prevent concurrent flow executions
      conversation.lock!

      # Clean up any existing completed/failed executions for this conversation and flow
      # This ensures we don't have stale state interfering with new executions
      FlowExecution.where(
        conversation: conversation,
        flow: flow,
        status: %w[completed failed]
      ).destroy_all

      # Find or create flow execution record
      flow_execution = FlowExecution.find_by(
        conversation: conversation,
        contact: contact,
        flow: flow
      )

      if flow_execution
        # Only update if not already completed or failed
        if flow_execution.status.in?(%w[completed failed])
          Rails.logger.info "[Flow] Flow execution #{flow_execution.id} is already #{flow_execution.status}, not updating"
        else
          Rails.logger.info "[Flow] Updating existing flow execution #{flow_execution.id} from #{flow_execution.status} to pending"
          flow_execution.update!(
            status: :pending,
            context: flow_state
          )
        end
      else
        flow_execution = FlowExecution.create!(
          flow: flow,
          conversation: conversation,
          contact: contact,
          account: conversation.account,
          status: :pending,
          started_at: Time.current,
          context: flow_state,
          results: {}
        )
      end
    end

    # Mark the flow as paused in the context
    context[:flow_paused] = true

    Rails.logger.info "Flow execution #{flow_execution.id} paused for conversation #{conversation.id}"

    # CRITICAL: Clean up cache keys immediately when pausing to prevent race conditions
    # This ensures the next message can be processed without stale cache interference
    Rails.logger.info "[Flow] Cleaning up message event consumption keys immediately for conversation #{conversation.id}"
    Rails.cache.delete_matched("flow:event_consumed:conversation:#{conversation.id}:*")
    Rails.cache.delete_matched("flow:message_processing:conversation:#{conversation.id}:*")
    Rails.cache.delete_matched("flow:send_idempotency:#{conversation.id}:#{flow.id}:*")

    # Return nil to stop flow execution
    nil
  end

  # Attempt to find the previous node in the flow graph based on connections
  def find_previous_node(current_node, flow_definition)
    connections = flow_definition['connections'] || []
    # Find a connection whose target is current node's UUID
    incoming = connections.find { |conn| conn['target_uuid'] == current_node['uuid'] }
    return nil unless incoming

    source_exit_uuid = incoming['source_uuid']
    # Find the node that owns this source exit
    nodes = flow_definition['nodes'] || []
    nodes.find do |n|
      exits = n['exits'] || []
      exits.any? { |ex| ex['uuid'] == source_exit_uuid }
    end
  end

  def execute_set_contact_field_node(node, context)
    field_name = node['field']&.dig('key')
    field_value = node['value']

    return unless field_name && field_value

    processed_value = replace_variables(field_value, context)

    case field_name
    when 'name'
      contact.update(name: processed_value)
    when 'email'
      contact.update(email: processed_value)
    when 'phone_number'
      contact.update(phone_number: processed_value)
    else
      # Handle custom attributes
      custom_attrs = contact.custom_attributes || {}
      custom_attrs[field_name] = processed_value
      contact.update(custom_attributes: custom_attrs)
    end
  end

  def execute_set_run_result_node(node, context)
    action = node['actions']&.find { |a| a['type'] == 'set_run_result' } || node['actions']&.first || {}
    name = action['name'] || node['name']
    value = action['value'] || node['value']
    return if name.blank?

    resolved_value = value.present? ? replace_variables(value.to_s, context) : ''

    execution = current_flow_execution
    return unless execution

    results = execution.results || {}
    results[name] = {
      'value' => resolved_value,
      'category' => action['category'].presence || '',
      'input' => resolved_value
    }
    # Also store as a simple flow variable for @flow.<name> access
    results['flow'] ||= {}
    results['flow'][name] = resolved_value
    execution.update!(results: results)

    # Reset memoized execution so subsequent reads see the updated data
    @current_flow_execution = nil

    Rails.logger.info "[Flow] Set run result '#{name}' = '#{resolved_value}'"
  end

  def execute_add_contact_groups_node(node, _context)
    group_uuids = node['groups'] || []

    # In a real implementation, this would map FlowEditor group UUIDs
    # to Chatwoot contact groups/labels
    group_uuids.each do |group_uuid|
      # For now, add as labels
      label_name = "flow_group_#{group_uuid}"
      conversation.add_labels([label_name])
    end
  end

  def execute_call_webhook_node(node, context)
    # FlowEditor stores webhook config inside actions[0] for call_webhook type
    action = node['actions']&.find { |a| a['type'] == 'call_webhook' } || node['actions']&.first || {}
    webhook_url = action['url'] || node['url']
    (action['method'] || node['method'] || 'POST').to_s.upcase
    action['headers'] || node['headers'] || {}
    body = action['body'] || node['body'] || ''

    return unless webhook_url.present?

    # Replace variables in URL and body
    processed_url = replace_variables(webhook_url, context)
    processed_body = if body.is_a?(Hash)
                       replace_variables_in_hash(body, context)
                     elsif body.is_a?(String) && body.present?
                       replace_variables(body, context)
                     else
                       {}
                     end

    payload = if processed_body.is_a?(Hash)
                processed_body.merge(
                  conversation_id: conversation.id,
                  contact_id: contact.id,
                  flow_id: flow.id
                )
              else
                processed_body
              end

    WebhookJob.perform_later(processed_url, payload)

    # Record a provisional webhook status for router operand resolution
    begin
      exec = FlowExecution.where(conversation_id: conversation.id, contact_id: contact.id).order(updated_at: :desc).first
      if exec
        results = exec.results || {}
        results['webhook_status'] = (results['webhook_status'].presence || 'sent')
        exec.update!(results: results)
      end
    rescue StandardError
      # no-op
    end
  end

  def execute_send_email_node(node, context)
    action = node['actions']&.find { |a| a['type'] == 'send_email' } || node['actions']&.first || {}
    addresses = Array(action['addresses'] || node['addresses'])
    subject = action['subject'] || node['subject'] || ''
    body = action['body'] || node['body'] || ''

    return if addresses.blank?

    processed_subject = replace_variables(subject, context)
    processed_body = replace_variables(body, context)

    addresses.each do |to_address|
      next if to_address.blank?

      processed_to = replace_variables(to_address.to_s, context)
      begin
        FlowEmailMailer.flow_email(
          to: processed_to,
          subject: processed_subject,
          body: processed_body,
          account: conversation.account,
          conversation: conversation
        ).deliver_later
        Rails.logger.info "[Flow] Email queued to #{processed_to} for flow #{flow.id}"
      rescue StandardError => e
        Rails.logger.error "[Flow] Failed to send email to #{processed_to}: #{e.message}"
      end
    end
  end

  def execute_switch_node(node, flow_definition, context)
    # Switch nodes route based on categories/cases or simple exit routing

    Rails.logger.info '=== EXECUTING SWITCH NODE ==='
    Rails.logger.info "Node UUID: #{node['uuid']}"

    # First try to find cases (supports both router.cases and top-level cases)
    cases = node['router']&.dig('cases') || node['cases'] || []
    # Support categories in both router.categories and top-level categories
    categories = node['router']&.dig('categories') || node['categories'] || []
    # Operand determines the source of value used by operators
    operand = node['router']&.dig('operand') || node['operand'] || '@input.text'

    Rails.logger.info "Found #{cases.size} cases and #{categories.size} categories"

    if cases.present?
      # Get the last incoming message
      last_message = conversation.messages.incoming.last
      operand_value = resolve_operand_value(operand, last_message, context)
      message_text = operand_value.is_a?(String) ? normalize_text(operand_value) : normalize_text(last_message&.content)

      Rails.logger.info "Operand: '#{operand}', value for evaluation: '#{operand_value.inspect}'"
      Rails.logger.info "Last message text: '#{message_text}'"
      Rails.logger.info "Cases to evaluate: #{cases.inspect}"

      # Try to match cases first
      matching_case = cases.find do |case_item|
        Rails.logger.info "Evaluating case: #{case_item['type']} with args: #{case_item['arguments']}"
        type = case_item['type'].to_s
        case_args = case_item['arguments'] || []
        evaluate_case(type, case_args, operand, operand_value, last_message, message_text)
      end

      Rails.logger.info "Matching case: #{matching_case.inspect}"

      if matching_case
        # Find the corresponding category
        category_uuid = matching_case['category_uuid']
        Rails.logger.info "Found matching case, category UUID: #{category_uuid}"

        # Find the category with this UUID
        matching_category = categories.find { |cat| cat['uuid'] == category_uuid }

        if matching_category
          exit_uuid = matching_category['exit_uuid']
          Rails.logger.info "Found category exit UUID: #{exit_uuid}"
          next_node = find_node_by_exit(exit_uuid, flow_definition)
          Rails.logger.info "Next node: #{next_node&.dig('uuid')}"
          return next_node
        else
          Rails.logger.warn "No category found for UUID: #{category_uuid}"
        end
      end
    end

    # If no cases matched, try categories with simple name matching
    if categories.present?
      Rails.logger.info 'Trying category matching...'
      last_message = conversation.messages.incoming.last
      message_text = normalize_text(last_message&.content)

      matching_category = categories.find do |category|
        category_name = normalize_text(category['name'])
        Rails.logger.info "Checking category '#{category_name}' against message '#{message_text}'"
        message_text.present? && (message_text.include?(category_name) || includes_number_synonym?(message_text, category_name))
      end

      Rails.logger.info "Matching category: #{matching_category.inspect}"

      if matching_category
        exit_uuid = matching_category['exit_uuid']
        Rails.logger.info "Found exit UUID: #{exit_uuid}"
        next_node = find_node_by_exit(exit_uuid, flow_definition)
        Rails.logger.info "Next node: #{next_node&.dig('uuid')}"
        return next_node
      end
    end

    # If no matches found, use default category -> exit mapping
    # Support default at router level or top-level
    default_category_uuid = node['router']&.dig('default_category_uuid') || node['default_category_uuid']
    if default_category_uuid
      Rails.logger.info "Using default category UUID: #{default_category_uuid}"
      # In FlowEditor schema, default_category_uuid points to a category, not an exit
      categories ||= node['router']&.dig('categories') || node['categories'] || []
      default_category = categories.find { |cat| cat['uuid'] == default_category_uuid }

      if default_category
        exit_uuid = default_category['exit_uuid']
        Rails.logger.info "Default category exit UUID: #{exit_uuid}"
        next_node = find_node_by_exit(exit_uuid, flow_definition)
        Rails.logger.info "Next node: #{next_node&.dig('uuid')}"
        return next_node
      else
        # Fallback in case some payloads store exit UUID directly in default_category_uuid
        Rails.logger.warn 'Default category not found; attempting direct exit lookup'
        next_node = find_node_by_exit(default_category_uuid, flow_definition)
        Rails.logger.info "Next node via direct lookup: #{next_node&.dig('uuid')}"
        return next_node if next_node
      end
    end

    # Final fallback: use the first exit
    exits = node['exits'] || []
    if exits.any?
      first_exit = exits.first
      Rails.logger.info "Using first exit as fallback: #{first_exit['uuid']}"
      next_node = find_node_by_exit(first_exit['uuid'], flow_definition)
      Rails.logger.info "Next node: #{next_node&.dig('uuid')}"
      return next_node
    end

    Rails.logger.warn 'No valid exit found in switch node'
    nil
  end

  def execute_split_by_expression_node(node, flow_definition, context)
    # Split by expression evaluates conditions
    cases = node['router']&.dig('cases') || []

    matching_case = cases.find do |case_item|
      evaluate_expression(case_item['arguments'], context)
    end

    if matching_case
      exit_uuid = matching_case['category_uuid']
      find_node_by_exit(exit_uuid, flow_definition)
    else
      # Use default exit
      default_exit = node['router']&.dig('default_category_uuid')
      find_node_by_exit(default_exit, flow_definition) if default_exit
    end
  end

  def evaluate_expression(arguments, _context)
    # Simple expression evaluation
    # In a real implementation, this would be more sophisticated
    return true if arguments.blank?

    # For now, just return true for any expression
    true
  end

  def find_next_node(current_node, flow_definition)
    exits = current_node['exits'] || []
    return nil if exits.empty?

    # Use the first exit for simple nodes
    exit_uuid = exits.first['uuid']
    find_node_by_exit(exit_uuid, flow_definition)
  end

  def find_node_by_exit(exit_uuid, flow_definition)
    return nil unless exit_uuid

    # First try to find connections (standard approach)
    connections = flow_definition['connections'] || []
    connection = connections.find { |conn| conn['source_uuid'] == exit_uuid }

    if connection
      target_uuid = connection['target_uuid']
      nodes = flow_definition['nodes'] || []
      return nodes.find { |node| node['uuid'] == target_uuid }
    end

    # Fallback: Check if exits have destination_uuid directly (alternative approach)
    nodes = flow_definition['nodes'] || []
    nodes.each do |node|
      exits = node['exits'] || []
      exit_data = exits.find { |exit| exit['uuid'] == exit_uuid }
      if exit_data && exit_data['destination_uuid']
        target_node = nodes.find { |n| n['uuid'] == exit_data['destination_uuid'] }
        return target_node if target_node
      end
    end

    nil
  end

  def replace_variables(text, _context)
    return text unless text.is_a?(String)

    result = text.dup

    # 1) Evaluate @(...) function/expression blocks (supports nested parens)
    result = resolve_at_expressions(result)

    # 2) Replace @contact.* variables
    result.gsub!(/@contact\.name/i, contact.name.presence || 'there')
    result.gsub!(/@contact\.email/i, contact.email.to_s)
    result.gsub!(/@contact\.phone/i, contact.phone_number.to_s)
    result.gsub!(/@contact\.id/i, contact.id.to_s)
    result.gsub!(/@contact\.uuid/i, contact.id.to_s)
    result.gsub!(/@contact/i) { contact.name.presence || 'there' }

    # 3) Replace @conversation.* variables
    result.gsub!(/@conversation\.id/i, conversation.display_id.to_s)
    # Same phrase as Captain AI / bot handoff; use in flow messages for a consistent transfer line.
    result.gsub!(/@conversation\.standard_handoff\b/i) do
      Conversations::HandoffPublicText.message_for(conversation)
    end

    # 4) Replace @results.* variables (e.g. @results.Result 1.value)
    result.gsub!(/@results\.([a-z0-9_ \-]+)\.(category|value|input)\b/i) do
      key = Regexp.last_match(1).strip
      field = Regexp.last_match(2).downcase
      resolve_flow_result(key, field)
    end

    # 4b) Shorthand: @results.<name> without a field defaults to .value (FlowEditor shows @results.Result 1)
    result.gsub!(/@results\.([a-z0-9_ \-]+)(?!\.(?:category|value|input)\b)/i) do
      key = Regexp.last_match(1).strip
      resolve_flow_result(key, 'value')
    end

    # 5) Replace @flow.* variables (stored in FlowExecution.results under "flow" namespace)
    result.gsub!(/@flow\.([a-z0-9_\-]+)/i) do
      key = Regexp.last_match(1)
      resolve_flow_variable(key)
    end

    # 6) Replace standalone date/time tokens
    result.gsub!(/@DATE\b/i, Date.current.strftime('%Y-%m-%d'))
    result.gsub!(/@NOW\b/i, Time.current.iso8601)
    result.gsub!(/@TODAY\b/i, Date.current.strftime('%Y-%m-%d'))

    result
  end

  # ---------------------------------------------------------------------------
  # Expression evaluation helpers
  # ---------------------------------------------------------------------------

  def resolve_at_expressions(text)
    output = ''
    i = 0
    while i < text.length
      if text[i] == '@' && text[i + 1] == '('
        # Find matching closing paren accounting for nesting
        depth = 0
        start = i + 2
        j = i + 1
        while j < text.length
          if text[j] == '('
            depth += 1
          elsif text[j] == ')'
            depth -= 1
            if depth.zero?
              inner = text[start..j - 1]
              output << evaluate_expression(inner).to_s
              i = j + 1
              break
            end
          end
          j += 1
        end
        # If unbalanced, just pass through
        if depth != 0
          output << text[i]
          i += 1
        end
      else
        output << text[i]
        i += 1
      end
    end
    output
  end

  def evaluate_expression(expr)
    # Check if the entire expression is a single function call with balanced parens
    if (func_name, func_body = extract_top_level_function(expr))
      return evaluate_function(func_name.upcase, func_body)
    end

    # Otherwise treat as arithmetic / mixed expression: YEAR(NOW()) - flow.year_born
    evaluate_arithmetic(expr)
  rescue StandardError => e
    Rails.logger.warn "[Flow] Expression evaluation failed for '#{expr}': #{e.message}"
    "@(#{expr})"
  end

  def extract_top_level_function(expr)
    m = expr.match(/\A(\w+)\(/)
    return nil unless m

    func_name = m[1]
    # Walk from the opening paren to find the matching close
    start = func_name.length + 1
    depth = 1
    i = start
    while i < expr.length && depth > 0
      depth += 1 if expr[i] == '('
      depth -= 1 if expr[i] == ')'
      i += 1
    end
    # The function call ends at i-1; if that's the end of the string, it's a pure function call
    return [func_name, expr[start..i - 2]] if depth.zero? && i == expr.length

    nil
  end

  FLOW_FUNCTIONS = %w[PROPER UPPER LOWER TRIM LEN LEFT RIGHT YEAR MONTH DAY HOUR MINUTE NOW TODAY DATE
                      ABS ROUND MAX MIN IF AND OR NOT CONCATENATE TEXT VALUE SUBSTITUTE FIND SEARCH].freeze

  def evaluate_function(func, args_str)
    # Resolve variables inside arguments first
    resolved_args = resolve_expression_token(args_str)

    case func
    when 'PROPER'
      resolved_args.to_s.gsub(/\w+/) { |w| w.capitalize }
    when 'UPPER'
      resolved_args.to_s.upcase
    when 'LOWER'
      resolved_args.to_s.downcase
    when 'TRIM'
      resolved_args.to_s.strip
    when 'LEN'
      resolved_args.to_s.length.to_s
    when 'YEAR'
      parse_date_or_now(resolved_args)&.year.to_s
    when 'MONTH'
      parse_date_or_now(resolved_args)&.month.to_s
    when 'DAY'
      parse_date_or_now(resolved_args)&.day.to_s
    when 'HOUR'
      parse_date_or_now(resolved_args)&.hour.to_s
    when 'MINUTE'
      parse_date_or_now(resolved_args)&.min.to_s
    when 'NOW'
      Time.current.iso8601
    when 'TODAY', 'DATE'
      Date.current.strftime('%Y-%m-%d')
    when 'ABS'
      resolved_args.to_f.abs.to_s
    when 'ROUND'
      parts = split_function_args(args_str)
      val = resolve_expression_token(parts[0]).to_f
      digits = parts[1] ? resolve_expression_token(parts[1]).to_i : 0
      val.round(digits).to_s
    when 'MAX'
      nums = split_function_args(args_str).map { |a| resolve_expression_token(a).to_f }
      nums.max.to_s
    when 'MIN'
      nums = split_function_args(args_str).map { |a| resolve_expression_token(a).to_f }
      nums.min.to_s
    when 'CONCATENATE'
      parts = split_function_args(args_str)
      parts.map { |a| resolve_expression_token(a).to_s }.join
    when 'IF'
      parts = split_function_args(args_str)
      cond = resolve_expression_token(parts[0])
      truthy?(cond) ? resolve_expression_token(parts[1]).to_s : resolve_expression_token(parts[2]).to_s
    when 'TEXT'
      parts = split_function_args(args_str)
      val = resolve_expression_token(parts[0])
      fmt = parts[1]&.gsub(/["']/, '')
      format_as_text(val, fmt)
    when 'LEFT'
      parts = split_function_args(args_str)
      resolve_expression_token(parts[0]).to_s[0, resolve_expression_token(parts[1]).to_i]
    when 'RIGHT'
      parts = split_function_args(args_str)
      s = resolve_expression_token(parts[0]).to_s
      n = resolve_expression_token(parts[1]).to_i
      s[-n..] || s
    when 'SUBSTITUTE'
      parts = split_function_args(args_str)
      resolve_expression_token(parts[0]).to_s.gsub(resolve_expression_token(parts[1]).to_s, resolve_expression_token(parts[2]).to_s)
    when 'VALUE'
      resolve_expression_token(args_str).to_s.gsub(/[^\d.\-]/, '').to_f.to_s
    else
      # Unknown function: return raw
      "@(#{func}(#{args_str}))"
    end
  end

  def evaluate_arithmetic(expr)
    resolved = expr.dup

    # Repeatedly resolve innermost function calls first (no nested parens inside args)
    max_passes = 10
    max_passes.times do
      break unless resolved.gsub!(/(\w+)\(([^()]*)\)/) do
        func = Regexp.last_match(1).upcase
        inner = Regexp.last_match(2)
        evaluate_function(func, inner)
      end
    end

    # Resolve remaining variable references
    resolved = resolved.gsub(/@?([a-z][a-z0-9_.]*)/i) do
      token = Regexp.last_match(1)
      val = resolve_variable_token(token)
      val.nil? ? Regexp.last_match(0) : val.to_s
    end

    # Safely evaluate arithmetic (only digits, operators, whitespace, dots)
    sanitized = resolved.gsub(%r{[^0-9+\-*/().% ]}, '')
    return resolved if sanitized.blank?

    # rubocop:disable Security/Eval
    result = eval(sanitized)
    # rubocop:enable Security/Eval
    result.is_a?(Float) && result == result.to_i ? result.to_i.to_s : result.to_s
  rescue StandardError
    resolved
  end

  def resolve_expression_token(token)
    return '' if token.nil?

    token = token.strip
    # Quoted string
    return token[1..-2] if token.match?(/\A["'].*["']\z/)

    # Nested function call
    if (m = token.match(/\A(\w+)\((.+)\)\z/))
      return evaluate_function(m[1].upcase, m[2])
    end

    # Variable reference
    if token.match?(/\A@?[a-z]/i)
      val = resolve_variable_token(token.delete_prefix('@'))
      return val unless val.nil?
    end

    # Numeric literal
    return token.to_f if token.match?(/\A-?\d+(\.\d+)?\z/)

    token
  end

  def resolve_variable_token(path)
    case path
    when /\Acontact\.name\z/i then contact.name.presence || 'there'
    when /\Acontact\.email\z/i then contact.email.to_s
    when /\Acontact\.phone\z/i then contact.phone_number.to_s
    when /\Acontact\.id\z/i then contact.id.to_s
    when /\Acontact\z/i then contact.name.presence || 'there'
    when /\Aconversation\.id\z/i then conversation.display_id.to_s
    when /\Aresults\.(.+)\.(category|value|input)\z/i
      resolve_flow_result(Regexp.last_match(1).strip, Regexp.last_match(2).downcase)
    when /\Aresults\.(.+)\z/i
      resolve_flow_result(Regexp.last_match(1).strip, 'value')
    when /\Aflow\.(.+)\z/i
      resolve_flow_variable(Regexp.last_match(1))
    when /\Adate\z/i then Date.current.strftime('%Y-%m-%d')
    when /\Anow\z/i then Time.current.iso8601
    end
  end

  def resolve_flow_result(key, field)
    execution = current_flow_execution
    return '' unless execution

    results = execution.results || {}
    # Try exact key first, then normalized (underscored, lowercase)
    datum = results[key] || results[key.downcase] || results[key.tr(' ', '_').downcase]
    return '' if datum.nil?

    if datum.is_a?(Hash)
      (datum[field] || datum[field.to_sym] || '').to_s
    elsif field.to_s == 'value'
      datum.to_s
    else
      ''
    end
  end

  def resolve_flow_variable(key)
    execution = current_flow_execution
    return '' unless execution

    results = execution.results || {}
    # Flow variables can be stored directly or under a "flow" namespace
    flow_vars = results['flow'] || results
    (flow_vars[key] || flow_vars[key.downcase] || flow_vars[key.tr(' ', '_').downcase] || '').to_s
  end

  def current_flow_execution
    @current_flow_execution ||= FlowExecution.where(
      conversation_id: conversation.id,
      contact_id: contact.id
    ).order(updated_at: :desc).first
  end

  def split_function_args(args_str)
    # Split by commas but respect nested parentheses and quotes
    parts = []
    depth = 0
    current = ''
    in_quote = nil

    args_str.each_char do |c|
      if in_quote
        current << c
        in_quote = nil if c == in_quote
      elsif c == '"' || c == "'"
        in_quote = c
        current << c
      elsif c == '('
        depth += 1
        current << c
      elsif c == ')'
        depth -= 1
        current << c
      elsif c == ',' && depth.zero?
        parts << current.strip
        current = ''
      else
        current << c
      end
    end
    parts << current.strip if current.present?
    parts
  end

  def parse_date_or_now(value)
    return Time.current if value.blank? || value.to_s.match?(/\A\d{4}-\d{2}-\d{2}T/)

    Time.zone.parse(value.to_s)
  rescue ArgumentError, TypeError
    Time.current
  end

  def truthy?(val)
    return false if val.nil?
    return val if val.is_a?(TrueClass) || val.is_a?(FalseClass)

    !val.to_s.strip.empty? && val.to_s.strip != '0' && val.to_s.strip.downcase != 'false'
  end

  def format_as_text(val, fmt)
    return val.to_s if fmt.blank?

    case fmt
    when '0' then val.to_f.round.to_s
    when '0.0' then format('%.1f', val.to_f)
    when '0.00' then format('%.2f', val.to_f)
    else val.to_s
    end
  end

  def replace_variables_in_hash(hash, context)
    return hash unless hash.is_a?(Hash)

    hash.transform_values do |value|
      if value.is_a?(String)
        replace_variables(value, context)
      elsif value.is_a?(Hash)
        replace_variables_in_hash(value, context)
      else
        value
      end
    end
  end

  def log_flow_execution
    Rails.logger.info "Flow #{flow.id} executed for conversation #{conversation.id}"

    # Create activity message
    content = I18n.t('conversations.activity.flow_executed',
                     flow_name: flow.name,
                     user_name: 'System')

    ::Conversations::ActivityMessageJob.perform_later(
      conversation,
      {
        account_id: conversation.account_id,
        inbox_id: conversation.inbox_id,
        message_type: :activity,
        content: content
      }
    )
  end

  def resume_flow_execution
    # Resume a paused flow execution
    resume_context = trigger_data[:resume_context]
    execution_id = trigger_data[:resume_execution_id]

    Rails.logger.info '=== RESUME_FLOW_EXECUTION STARTED ==='
    Rails.logger.info "resume_context present: #{resume_context.present?}"
    Rails.logger.info "execution_id present: #{execution_id.present?}"
    Rails.logger.info "resume_context keys: #{resume_context&.keys}"

    return unless resume_context && execution_id

    Rails.logger.info "Resuming flow execution #{execution_id} for conversation #{conversation.id}"

    begin
      # Ensure we have a parsed flow definition Hash
      flow_definition = resume_context['flow_definition']
      if flow_definition.is_a?(String)
        begin
          flow_definition = JSON.parse(flow_definition)
        rescue JSON::ParserError
          Rails.logger.error 'Invalid flow_definition JSON in resume_context'
          flow_definition = {}
        end
      end

      # Fallback: if resume_context does not include flow_definition, parse from flow.flow_data
      if flow_definition.blank?
        Rails.logger.info 'flow_definition missing in resume_context; parsing from flow.flow_data'
        begin
          flow_definition = flow.flow_data.is_a?(String) ? JSON.parse(flow.flow_data) : (flow.flow_data || {})
        rescue JSON::ParserError
          Rails.logger.error "Invalid flow_data JSON for flow #{flow.id} during resume"
          flow_definition = {}
        end
      end
      # Cache parsed flow_definition for helpers during this resume
      @cached_flow_definition_for_resume = flow_definition if flow_definition.present?

      Rails.logger.debug { "Resume context: #{resume_context.inspect}" }
      Rails.logger.debug { "Current node UUID: #{resume_context['current_node_uuid']}" }

      # Find the next node after the wait_for_response node
      current_node = find_node_by_uuid(resume_context['current_node_uuid'], flow_definition)

      Rails.logger.debug { "Current node: #{current_node.inspect}" }

      if current_node
        # If we paused at a send_msg node with wait, the router is typically the next node.
        paused_on_wait = current_node['wait']&.dig('type') == 'msg' || current_node['router']&.dig('wait', 'type') == 'msg'

        router_node = nil
        if paused_on_wait
          # If the current node itself contains router config (hybrid send_msg + router), use it
          router_node = if current_node['router'].present? || current_node['categories'].present? || current_node['cases'].present?
                          current_node
                        else
                          find_next_node(current_node, flow_definition)
                        end
        end

        # Timeout handling: if the session waited too long, prefer default route
        begin
          paused_at = resume_context['paused_at']
          timed_out = paused_at && Time.zone.parse(paused_at.to_s) < WAIT_TIMEOUT_SECONDS.seconds.ago
        rescue StandardError
          timed_out = false
        end

        if router_node&.dig('router') || router_node&.dig('categories') || router_node&.dig('cases')
          Rails.logger.debug { "Resuming via router node #{router_node['uuid']}" }
          inbound_message = trigger_data&.dig(:event_data, :message)
          unless inbound_message&.incoming?
            FlowExecution.find(execution_id).update!(status: :pending)
            return
          end
          begin
            paused_at_time = resume_context['paused_at'] ? Time.zone.parse(resume_context['paused_at'].to_s) : nil
          rescue StandardError
            paused_at_time = nil
          end
          if paused_at_time && inbound_message.created_at && inbound_message.created_at <= paused_at_time
            FlowExecution.find(execution_id).update!(status: :pending)
            return
          end
          # Capture the last response for audit/persistence
          capture_last_response!(execution_id)
          # Prefer timeout override when available
          timeout_override = router_node['router']&.dig('wait',
                                                        'timeout_seconds') || router_node.dig('wait',
                                                                                              'timeout_seconds') || resume_context.dig('context',
                                                                                                                                       'router_metadata', 'timeout_seconds')
          timed_out = paused_at_time < timeout_override.to_i.seconds.ago if paused_at_time && timeout_override.to_i.positive?

          # Attempt deterministic routing based on numeric or quick reply matches first
          deterministic_next = route_via_router(router_node, flow_definition, resume_context.dig('context', 'router_metadata'))

          # Evaluate router as well to capture matched category details and candidate next
          eval_result = evaluate_switch_router(router_node, inbound_message)

          # Log the routing evaluation results for debugging
          Rails.logger.info '[Flow] Router evaluation results:'
          Rails.logger.info "[Flow]   eval_result: #{eval_result.inspect}"
          Rails.logger.info "[Flow]   deterministic_next: #{deterministic_next&.dig('uuid')}"
          Rails.logger.info "[Flow]   inbound_message: #{inbound_message&.content}"
          Rails.logger.info "[Flow]   router_node: #{router_node['uuid']}"

          if eval_result
            begin
              exec = FlowExecution.find(execution_id)
              results = exec.results || {}
              last_message = conversation.messages.incoming.last
              result_data = {
                'category_uuid' => eval_result[:category_uuid],
                'category_name' => eval_result[:category_name],
                'category' => eval_result[:category_name],
                'value' => last_message&.content.to_s,
                'input' => last_message&.content.to_s
              }
              results['wait_result'] = result_data

              # Also store under the router's result_name so @results.<name>.value works
              rname = router_node.dig('router', 'result_name') || router_node['result_name']
              results[rname] = result_data if rname.present?

              exec.update!(results: results)
            rescue StandardError => e
              Rails.logger.warn "Failed to persist wait_result for execution #{execution_id}: #{e.message}"
            end
          end

          # Log the routing decision components for debugging
          Rails.logger.info '[Flow] Routing decision components:'
          Rails.logger.info "[Flow]   eval_result: #{eval_result.inspect}"
          Rails.logger.info "[Flow]   deterministic_next: #{deterministic_next&.dig('uuid')}"
          Rails.logger.info "[Flow]   timed_out: #{timed_out}"

          # Ensure consistent routing: always use eval_result if available, fallback to deterministic_next
          next_node = if timed_out
                        default_node_for_router(router_node,
                                                flow_definition) || eval_result&.dig(:next_node) || deterministic_next || execute_switch_node(router_node, flow_definition,
                                                                                                                                              restore_execution_context(resume_context))
                      else
                        # Prioritize eval_result to ensure consistent routing for invalid inputs
                        eval_result&.dig(:next_node) || deterministic_next || execute_switch_node(router_node, flow_definition,
                                                                                                  restore_execution_context(resume_context))
                      end
          Rails.logger.debug { "Next node after router: #{next_node.inspect}" }
        else
          next_node = find_next_node(current_node, flow_definition)
          Rails.logger.debug { "Next node: #{next_node.inspect}" }
        end
      else
        Rails.logger.error "Current node not found: #{resume_context['current_node_uuid']}"
        return
      end

      if next_node.nil?
        Rails.logger.warn 'No next node found, completing execution'
        FlowExecution.find(execution_id).update!(status: :completed, completed_at: Time.current)
        # Clean up all flow-related cache keys for this conversation
        cleanup_flow_session_cache(conversation, flow)
        # Attempt to start the next queued flow after completion
        start_next_queued_flow_if_any
        return
      end

      # Restore the execution context
      execution_context = restore_execution_context(resume_context)

      Rails.logger.debug { "Starting execution from next node: #{next_node['uuid']} - #{next_node['type']}" }

      # Continue execution from the next node
      while next_node
        Rails.logger.debug { "Executing node: #{next_node['uuid']} - #{next_node['type']}" }
        next_node = execute_node(next_node, flow_definition, execution_context)
        # Stop early if execution paused at a wait node
        break if execution_context[:flow_paused]
      end

      # Update the flow execution status based on whether we paused again
      if execution_context[:flow_paused]
        Rails.logger.info "Flow execution #{execution_id} paused again; ensuring status is pending"
        # Ensure execution status is set to pending for next resume attempt
        FlowExecution.find(execution_id).update!(status: :pending)
        Rails.logger.info "Flow execution #{execution_id} status explicitly set to pending for next resume"
        # Clean up message event consumption keys to allow fresh processing of next message
        Rails.logger.info "Cleaning up message event consumption keys for conversation #{conversation.id}"
        Rails.cache.delete_matched("flow:event_consumed:conversation:#{conversation.id}:*")
        # Also clean up any message processing keys that might block subsequent messages
        Rails.cache.delete_matched("flow:message_processing:conversation:#{conversation.id}:*")
      else
        FlowExecution.find(execution_id).update!(status: :completed, completed_at: Time.current)
        log_flow_execution
        # Clean up all flow-related cache keys for this conversation
        cleanup_flow_session_cache(conversation, flow)
        # Attempt to start the next queued flow after completion
        start_next_queued_flow_if_any
      end
    rescue StandardError => e
      Rails.logger.error "Flow resume error: #{e.message}"
      Rails.logger.error e.backtrace.join("\n")
      # Update the flow execution status to failed
      begin
        FlowExecution.find(execution_id).update!(status: :failed)
      rescue StandardError
        nil
      end
      ChatwootExceptionTracker.new(e, account: conversation.account).capture_exception
    end
  end

  # Explicit resume entrypoint used by TriggerService when a new incoming
  # message arrives and there is a pending(waiting) execution. This performs
  # router evaluation against the user's reply and continues the flow.
  def resume_from_wait(execution:, message: nil)
    execution_id = execution.id
    Rails.logger.info "[Flow] === RESUME_FROM_WAIT STARTED (execution=#{execution_id}) ==="

    conversation = execution.conversation

    # CRITICAL: Clean up any stale cache keys before resuming to ensure fresh processing
    Rails.logger.info "[Flow] Cleaning up stale cache keys before resuming execution #{execution_id}"
    Rails.cache.delete_matched("flow:event_consumed:conversation:#{conversation.id}:*")
    Rails.cache.delete_matched("flow:message_processing:conversation:#{conversation.id}:*")

    # Ensure proper state transition before processing
    begin
      execution.with_lock do
        Rails.logger.info "[Flow] Execution #{execution_id} state transition check: current status = #{execution.status}"
        if execution.status == 'pending'
          execution.update!(status: :running)
          Rails.logger.info "[Flow] Successfully marked execution #{execution_id} as running"
        else
          Rails.logger.warn "[Flow] Execution #{execution_id} is not in pending state, current status: #{execution.status}"
          return
        end
      end
    rescue StandardError => e
      Rails.logger.warn "[Flow] Failed to mark execution #{execution_id} as running: #{e.message}"
      return
    end

    resume_context = execution.context || {}
    Rails.logger.debug { "[Flow] resume_context keys: #{resume_context.keys}" }

    # Ensure we have a parsed flow definition - with better error handling
    flow_definition = resume_context['flow_definition']
    if flow_definition.is_a?(String)
      begin
        flow_definition = JSON.parse(flow_definition)
      rescue JSON::ParserError => e
        Rails.logger.error "[Flow] Invalid flow_definition JSON in resume_context: #{e.message}"
        flow_definition = {}
      end
    end

    # Fallback to flow.flow_data if resume_context doesn't have flow_definition
    if flow_definition.blank?
      Rails.logger.info '[Flow] flow_definition missing in resume_context; parsing from flow.flow_data'
      begin
        flow_definition = flow.flow_data.is_a?(String) ? JSON.parse(flow.flow_data) : (flow.flow_data || {})
      rescue JSON::ParserError => e
        Rails.logger.error "[Flow] Invalid flow_data JSON for flow #{flow.id} during resume_from_wait: #{e.message}"
        flow_definition = {}
      end
    end

    # Ensure we have a valid flow definition
    if flow_definition.blank?
      Rails.logger.error "[Flow] No valid flow definition found for resuming execution #{execution_id}"
      begin
        execution.update!(status: :failed)
      rescue StandardError
        # ignore
      end
      return
    end

    # Cache parsed flow_definition for helpers used during this resume
    @cached_flow_definition_for_resume = flow_definition

    current_uuid = resume_context['current_node_uuid']
    unless current_uuid
      Rails.logger.error "[Flow] No current_node_uuid found in resume_context for execution #{execution_id}"
      begin
        execution.update!(status: :failed)
      rescue StandardError
        # ignore
      end
      return
    end

    current_node = find_node_by_uuid(current_uuid, flow_definition)
    Rails.logger.debug { "[Flow] current_node_uuid=#{current_uuid} node_present=#{current_node.present?}" }
    unless current_node
      Rails.logger.error "[Flow] Current node not found while resuming from wait: #{current_uuid}"
      begin
        execution.update!(status: :failed)
      rescue StandardError
        # ignore
      end
      return
    end

    paused_on_wait = current_node['wait']&.dig('type') == 'msg' || current_node['router']&.dig('wait', 'type') == 'msg'

    router_node = nil
    if paused_on_wait
      router_node = if current_node['router'].present? || current_node['categories'].present? || current_node['cases'].present?
                      current_node
                    else
                      find_next_node(current_node, flow_definition)
                    end
    end

    timed_out = false
    begin
      paused_at = resume_context['paused_at']
      timed_out = paused_at && Time.zone.parse(paused_at.to_s) < WAIT_TIMEOUT_SECONDS.seconds.ago
    rescue StandardError
      timed_out = false
    end

    next_node = nil
    if router_node&.dig('router') || router_node&.dig('categories') || router_node&.dig('cases')
      Rails.logger.debug { "[Flow] Resuming via router node #{router_node['uuid']}" }
      if message.nil?
        Rails.logger.info '[Flow] No incoming message provided for resume; keeping execution pending'
        begin
          execution.update!(status: :pending)
        rescue StandardError
        end
        return
      end
      capture_last_response!(execution_id)

      timeout_override = router_node['router']&.dig('wait', 'timeout_seconds') ||
                         router_node.dig('wait', 'timeout_seconds') ||
                         resume_context.dig('context', 'router_metadata', 'timeout_seconds')

      begin
        paused_at_time = resume_context['paused_at'] ? Time.zone.parse(resume_context['paused_at'].to_s) : nil
      rescue StandardError
        paused_at_time = nil
      end
      timed_out = paused_at_time < timeout_override.to_i.seconds.ago if paused_at_time && timeout_override.to_i.positive?

      deterministic_next = route_via_router(router_node, flow_definition, resume_context.dig('context', 'router_metadata'))
      eval_result = evaluate_switch_router(router_node, message)

      # Persist matched category details for audit/analytics
      if eval_result
        begin
          results = execution.results || {}
          result_data = {
            'category_uuid' => eval_result[:category_uuid],
            'category_name' => eval_result[:category_name],
            'category' => eval_result[:category_name],
            'value' => message&.content.to_s,
            'input' => message&.content.to_s
          }
          results['wait_result'] = result_data

          rname = router_node.dig('router', 'result_name') || router_node['result_name']
          results[rname] = result_data if rname.present?

          execution.update!(results: results)
        rescue StandardError => e
          Rails.logger.warn "[Flow] Failed to persist wait_result for execution #{execution_id}: #{e.message}"
        end
      end

      ctx = restore_execution_context(resume_context)

      # Handle timeout vs normal flow evaluation
      next_node = if timed_out
                    # On timeout, try default node first, then fallback to other options
                    default_node_for_router(router_node,
                                            flow_definition) || eval_result&.dig(:next_node) || deterministic_next || execute_switch_node(
                                              router_node, flow_definition, ctx
                                            )
                  else
                    # Normal flow: try evaluation result first, then deterministic, then fallback
                    eval_result&.dig(:next_node) || deterministic_next || execute_switch_node(router_node, flow_definition, ctx)
                  end

      # Ensure we have a next node - if all else fails, try to find any exit
      if next_node.nil?
        Rails.logger.warn '[Flow] No next node found via router evaluation, attempting fallback'
        exits = router_node['exits'] || []
        if exits.any?
          exit_uuid = exits.first['uuid']
          next_node = find_node_by_exit(exit_uuid, flow_definition)
          Rails.logger.info "[Flow] Fallback to first exit: #{exit_uuid} -> #{next_node&.dig('uuid')}"
        end
      end
      Rails.logger.debug { "[Flow] Next node after router: #{next_node&.dig('uuid')}" }
    else
      next_node = find_next_node(current_node, flow_definition)
      Rails.logger.debug { "[Flow] Next node (non-router): #{next_node&.dig('uuid')}" }
    end

    if next_node.nil?
      Rails.logger.warn "[Flow] No next node found while resuming; completing execution #{execution_id}"
      execution.update!(status: :completed, completed_at: Time.current)
      # Clean up all flow-related cache keys for this conversation
      cleanup_flow_session_cache(conversation, flow)
      start_next_queued_flow_if_any
      return
    end

    execution_context = restore_execution_context(resume_context)

    Rails.logger.debug { "[Flow] Continue execution from node #{next_node['uuid']}" }
    while next_node
      Rails.logger.debug { "[Flow] Executing node: #{next_node['uuid']} - #{next_node['type']}" }
      next_node = execute_node(next_node, flow_definition, execution_context)
      break if execution_context[:flow_paused]
    end

    if execution_context[:flow_paused]
      Rails.logger.info "[Flow] Execution #{execution_id} paused again; ensuring status is pending"
      # Ensure execution status is set to pending for next resume attempt
      execution.update!(status: :pending)
      Rails.logger.info "[Flow] Execution #{execution_id} status explicitly set to pending for next resume"
      # Clean up message event consumption keys to allow fresh processing of next message
      Rails.logger.info "[Flow] Cleaning up message event consumption keys for conversation #{conversation.id}"
      Rails.cache.delete_matched("flow:event_consumed:conversation:#{conversation.id}:*")
      # Also clean up any message processing keys that might block subsequent messages
      Rails.cache.delete_matched("flow:message_processing:conversation:#{conversation.id}:*")
    else
      execution.update!(status: :completed, completed_at: Time.current)
      log_flow_execution
      # Clean up all flow-related cache keys for this conversation
      cleanup_flow_session_cache(conversation, execution.flow)
      start_next_queued_flow_if_any
    end
  rescue StandardError => e
    Rails.logger.error "[Flow] Resume-from-wait error: #{e.message}"
    Rails.logger.error e.backtrace.join("\n")
    begin
      execution.update!(status: :failed)
    rescue StandardError
      # ignore
    end
    ChatwootExceptionTracker.new(e, account: conversation.account).capture_exception
  end

  # Evaluate switch/router node using current message and cases/categories.
  # Returns details about matched category and the resolved next node.
  def evaluate_switch_router(node, message = nil)
    Rails.logger.info "[Flow] === EVALUATE_SWITCH_ROUTER (node=#{node['uuid']}) ==="

    router = node['router'] || {}
    cases = router['cases'] || node['cases'] || []
    categories = router['categories'] || node['categories'] || []
    operand = router['operand'] || node['operand'] || '@input.text'

    last_message = message || conversation.messages.incoming.last
    operand_value = resolve_operand_value(operand, last_message, { conversation: conversation, contact: contact, flow: flow, variables: {} })
    message_text = operand_value.is_a?(String) ? normalize_text(operand_value) : normalize_text(last_message&.content)

    Rails.logger.info "[Flow] Router cases=#{cases.size} categories=#{categories.size} operand=#{operand}"
    Rails.logger.info "[Flow] Message text='#{message_text}' operand_value='#{operand_value.inspect}'"

    # First, try exact case matching with strict validation
    if cases.present?
      matching_case = cases.find do |case_item|
        type = case_item['type'].to_s
        args = case_item['arguments'] || []
        Rails.logger.info "[Flow] Evaluating case type='#{type}' args='#{args}'"
        # Only match if the message actually contains the expected content
        evaluate_case(type, args, operand, operand_value, last_message, message_text)
      end

      if matching_case
        category_uuid = matching_case['category_uuid']
        category = categories.find { |c| c['uuid'] == category_uuid }
        exit_uuid = category&.dig('exit_uuid')
        next_node = find_node_by_exit(exit_uuid, (resolve_flow_definition_from_cache || begin
          JSON.parse(flow.flow_data)
        rescue StandardError
          {}
        end))
        Rails.logger.info "[Flow] Case matched -> category='#{category&.dig('name')}' exit='#{exit_uuid}' next_node='#{next_node&.dig('uuid')}'"
        return {
          category_uuid: category_uuid,
          category_name: category&.dig('name') || 'Matched',
          exit_uuid: exit_uuid,
          next_node: next_node
        }
      end
    end

    # Enhanced category name matching with better validation
    if categories.present? && message_text.present?
      # Try number synonym index mapping first (most reliable)
      idx = number_index_from_text(message_text, categories.size)
      if idx && idx <= categories.size && idx.positive?
        chosen = categories[idx - 1]
        exit_uuid = chosen['exit_uuid']
        next_node = find_node_by_exit(exit_uuid, (resolve_flow_definition_from_cache || begin
          JSON.parse(flow.flow_data)
        rescue StandardError
          {}
        end))
        Rails.logger.info "[Flow] Number synonym matched -> '#{chosen['name']}'"
        return { category_uuid: chosen['uuid'], category_name: chosen['name'], exit_uuid: exit_uuid, next_node: next_node }
      end

      # More strict category name matching
      category = categories.find do |cat|
        name = normalize_text(cat['name'])
        # Require exact match or very close match to prevent false positives
        message_text == name ||
          (message_text.include?(name) && name.length > 2) || # Only match longer words to avoid false positives
          includes_number_synonym?(message_text, name)
      end

      if category
        exit_uuid = category['exit_uuid']
        next_node = find_node_by_exit(exit_uuid, (resolve_flow_definition_from_cache || begin
          JSON.parse(flow.flow_data)
        rescue StandardError
          {}
        end))
        Rails.logger.info "[Flow] Category name matched -> '#{category['name']}'"
        return { category_uuid: category['uuid'], category_name: category['name'], exit_uuid: exit_uuid, next_node: next_node }
      end
    end

    # Default category fallback (prefer explicit configuration, fallback to first category)
    default_uuid = router['default_category_uuid'] || node['default_category_uuid']
    categories = router['categories'] || node['categories'] || []

    if default_uuid
      default_category = categories.find { |c| c['uuid'] == default_uuid }
      exit_uuid = default_category&.dig('exit_uuid') || default_uuid
      next_node = find_node_by_exit(exit_uuid, (resolve_flow_definition_from_cache || begin
        JSON.parse(flow.flow_data)
      rescue StandardError
        {}
      end))
      Rails.logger.info "[Flow] Using explicit default category -> '#{default_category&.dig('name') || default_uuid}'"
      return { category_uuid: default_uuid, category_name: default_category&.dig('name') || 'Other', exit_uuid: exit_uuid, next_node: next_node }
    elsif categories.any?
      # Fallback: use the first category as default to ensure consistent routing
      first_category = categories.first
      exit_uuid = first_category['exit_uuid']
      next_node = find_node_by_exit(exit_uuid, (resolve_flow_definition_from_cache || begin
        JSON.parse(flow.flow_data)
      rescue StandardError
        {}
      end))
      Rails.logger.info "[Flow] Using first category as fallback default -> '#{first_category['name']}'"
      return { category_uuid: first_category['uuid'], category_name: first_category['name'], exit_uuid: exit_uuid, next_node: next_node }
    end

    # No match found - stay at current node (don't jump)
    Rails.logger.warn '[Flow] No route matched in evaluate_switch_router - staying at current node'
    nil
  end

  # Supply cached flow_definition if available in a previously restored context
  def resolve_flow_definition_from_cache
    # Provide cached flow definition during resume to avoid reparsing and ensure consistency
    @cached_flow_definition_for_resume
  end

  def find_node_by_uuid(uuid, flow_definition)
    return nil unless uuid

    nodes = flow_definition['nodes'] || []
    nodes.find { |node| node['uuid'] == uuid }
  end

  # Choose the default next node for a router when timing out or no matches
  def default_node_for_router(router_node, flow_definition)
    default_category_uuid = router_node['router']&.dig('default_category_uuid') || router_node['default_category_uuid']
    categories = router_node['router']&.dig('categories') || router_node['categories'] || []

    if default_category_uuid
      default_category = categories.find { |cat| cat['uuid'] == default_category_uuid }
      exit_uuid = default_category&.dig('exit_uuid') || default_category_uuid
      return find_node_by_exit(exit_uuid, flow_definition)
    elsif categories.any?
      # Fallback: use the first category to ensure consistent routing
      first_category = categories.first
      exit_uuid = first_category['exit_uuid']
      return find_node_by_exit(exit_uuid, flow_definition)
    end

    exits = router_node['exits'] || []
    return find_node_by_exit(exits.first['uuid'], flow_definition) if exits.any?

    nil
  end

  # Build execution context from resume_context with router metadata restored
  def restore_execution_context(resume_context)
    {
      conversation: conversation,
      contact: contact,
      flow: flow,
      variables: resume_context.dig('context', 'variables') || {},
      router_metadata: resume_context.dig('context', 'router_metadata') || {},
      flow_definition: resume_context['flow_definition'] || @cached_flow_definition_for_resume
    }
  end

  # Determine next node from router using deterministic matching rules
  def route_via_router(router_node, flow_definition, router_metadata)
    # Support categories at router level or top-level
    categories = router_node['router']&.dig('categories') || router_node['categories'] || []
    return nil if categories.blank?

    last_message = conversation.messages.incoming.last
    message_text = normalize_text(last_message&.content)

    # 1) Numeric index mapping (exact token match)
    idx = number_index_from_text(message_text, categories.size)
    if idx
      exit_uuid = categories[idx - 1]['exit_uuid']
      return find_node_by_exit(exit_uuid, flow_definition)
    end

    # 2) Exact match against category names
    categories.each_with_index do |cat, _i|
      return find_node_by_exit(cat['exit_uuid'], flow_definition) if normalize_text(cat['name']) == message_text
    end

    # 3) Quick reply index mapping: align quick replies order to categories order
    raw_quick_replies = Array(router_metadata&.dig('quick_replies'))
    quick_replies = raw_quick_replies.map { |qr| normalize_text(qr) }
    if quick_replies.any?
      match_index = quick_replies.index(message_text)
      return find_node_by_exit(categories[match_index]['exit_uuid'], flow_definition) if match_index && categories[match_index]
    end

    # Fallback to standard switch logic
    nil
  end

  # Persist last response to FlowExecution.results and contact custom attributes
  def capture_last_response!(execution_id)
    last_message = conversation.messages.incoming.last
    response_text = last_message&.content.to_s
    begin
      execution = FlowExecution.find(execution_id)
      results = execution.results || {}
      results['last_response'] = response_text
      execution.update!(results: results)
    rescue StandardError
      # no-op
    end
    return if response_text.blank?

    attrs = contact.custom_attributes || {}
    attrs['last_flow_response'] = response_text
    contact.update(custom_attributes: attrs)
  end

  # Normalize text for comparison
  def normalize_text(text)
    text.to_s.downcase.strip
  end

  # Resolve the value for a given operand string
  def resolve_operand_value(operand, last_message, _context)
    case operand.to_s
    when '@input.text', '@input_text', '@input.text()'
      last_message&.content.to_s
    when '@input'
      # For media/location waits, operand is the full input payload
      {
        text: last_message&.content.to_s,
        attachments: Array(last_message&.attachments)
      }
    when /@results\.(.+)\.(category|value|input)$/
      resolve_flow_result(Regexp.last_match(1).strip, Regexp.last_match(2).downcase)
    when /@results\.(.+)$/
      resolve_flow_result(Regexp.last_match(1).strip, 'value')
    when /@flow\.(.+)$/
      resolve_flow_variable(Regexp.last_match(1).strip)
    when '@contact.groups'
      # Return label names used as groups proxy
      begin
        Array(conversation.labels&.map(&:name))
      rescue StandardError
        []
      end
    when '@child.status'
      # Not currently tracked; return nil
      nil
    when /@\(default\(resume\.dial\.status,\s*""\)\)/
      # Dial status used in dial routers; if stored in results, surface it
      begin
        execution = FlowExecution.where(conversation_id: conversation.id, contact_id: contact.id).order(updated_at: :desc).first
        (execution&.results || {})['dial_status']
      rescue StandardError
        nil
      end
    when /@\(default\(resume\.webhook\.status,\s*""\)\)/
      # Webhook status used in webhook routers; if stored in results, surface it
      begin
        execution = FlowExecution.where(conversation_id: conversation.id, contact_id: contact.id).order(updated_at: :desc).first
        (execution&.results || {})['webhook_status']
      rescue StandardError
        nil
      end
    when /@\(urn_parts\(contact\.urn\)\.scheme\)/
      # Scheme of the contact URN if present (e.g., whatsapp, sms)
      begin
        urn = contact.phone_number || contact.email
        urn.present? ? urn.split(':').first : nil
      rescue StandardError
        nil
      end
    else
      # Fallback to message text
      last_message&.content.to_s
    end
  end

  # Evaluate a case based on operator type and operand-derived value
  def evaluate_case(type, args, operand, operand_value, last_message, message_text)
    case type
    when 'has_any_word'
      Rails.logger.info "Checking has_any_word with args: #{args}"
      cmp_text = operand_value.is_a?(String) ? normalize_text(operand_value) : message_text
      text_includes_any?(cmp_text, args)
    when 'has_all_words'
      Rails.logger.info "Checking has_all_words with args: #{args}"
      cmp_text = operand_value.is_a?(String) ? normalize_text(operand_value) : message_text
      text_includes_all?(cmp_text, args)
    when 'has_phrase'
      cmp_text = operand_value.is_a?(String) ? normalize_text(operand_value) : message_text
      Array(args).any? { |arg| cmp_text.include?(normalize_text(arg)) }
    when 'has_only_phrase'
      cmp_text = operand_value.is_a?(String) ? normalize_text(operand_value) : message_text
      Array(args).any? { |arg| cmp_text == normalize_text(arg) }
    when 'starts_with', 'has_beginning'
      cmp_text = operand_value.is_a?(String) ? normalize_text(operand_value) : message_text
      Array(args).any? { |arg| cmp_text.start_with?(normalize_text(arg)) }
    when 'has_text'
      if operand.to_s == '@input'
        # Any text or attachment counts as a response
        (operand_value.is_a?(Hash) && (operand_value[:text].present? || operand_value[:attachments].any?)) || message_text.present?
      else
        cmp_text = operand_value.is_a?(String) ? normalize_text(operand_value) : message_text
        cmp_text.present?
      end
    when 'has_only_text'
      # Equality check to the provided argument(s)
      cmp_text = operand_value.is_a?(String) ? normalize_text(operand_value) : message_text
      Array(args).any? { |arg| cmp_text == normalize_text(arg) }
    when 'has_number'
      num = extract_first_number(operand_value, message_text)
      !num.nil?
    when 'has_number_between'
      num = extract_first_number(operand_value, message_text)
      low, high = args.map(&:to_f)
      num && num >= low && num <= high
    when 'has_number_lt'
      num = extract_first_number(operand_value, message_text)
      threshold = args.first.to_f
      num && num < threshold
    when 'has_number_lte'
      num = extract_first_number(operand_value, message_text)
      threshold = args.first.to_f
      num && num <= threshold
    when 'has_number_eq'
      num = extract_first_number(operand_value, message_text)
      target = args.first.to_f
      num && num == target
    when 'has_number_gte'
      num = extract_first_number(operand_value, message_text)
      threshold = args.first.to_f
      num && num >= threshold
    when 'has_number_gt'
      num = extract_first_number(operand_value, message_text)
      threshold = args.first.to_f
      num && num > threshold
    when 'has_date'
      dt = detect_date(operand_value, message_text)
      !dt.nil?
    when 'has_date_lt'
      dt = detect_date(operand_value, message_text)
      arg_dt = parse_date_safely(args.first)
      dt && arg_dt && dt < arg_dt
    when 'has_date_eq'
      dt = detect_date(operand_value, message_text)
      arg_dt = parse_date_safely(args.first)
      dt && arg_dt && dt.to_date == arg_dt.to_date
    when 'has_date_gt'
      dt = detect_date(operand_value, message_text)
      arg_dt = parse_date_safely(args.first)
      dt && arg_dt && dt > arg_dt
    when 'has_time'
      tm = detect_time(operand_value, message_text)
      !tm.nil?
    when 'has_phone'
      text = operand_value.is_a?(String) ? operand_value.to_s : last_message&.content.to_s
      !!(text =~ /\b\+?\d[\d\s\-()]{6,}\b/)
    when 'has_email'
      text = operand_value.is_a?(String) ? operand_value.to_s : last_message&.content.to_s
      !!(text =~ /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/)
    when 'has_pattern'
      text = operand_value.is_a?(String) ? operand_value.to_s : last_message&.content.to_s
      begin
        regex = Regexp.new(args.first.to_s)
        !!(text =~ regex)
      rescue RegexpError
        Rails.logger.warn "Invalid regex in has_pattern: #{args.first}"
        false
      end
    when 'has_group'
      groups = operand_value.is_a?(Array) ? operand_value : Array(conversation.labels&.map(&:name))
      wanted = args.map { |g| normalize_text(g) }
      groups.map { |g| normalize_text(g) }.any? { |g| wanted.include?(g) }
    when 'has_image'
      attachments_include_type?(operand_value, last_message, :image)
    when 'has_audio'
      attachments_include_type?(operand_value, last_message, :audio)
    when 'has_video'
      attachments_include_type?(operand_value, last_message, :video)
    when 'has_location'
      attachments_include_type?(operand_value, last_message, :location)
    when 'has_category'
      # Treat as equality check similar to has_only_text
      cmp_text = operand_value.is_a?(String) ? normalize_text(operand_value) : message_text
      Array(args).any? { |arg| cmp_text == normalize_text(arg) }
    else
      # Unknown case type should not match
      Rails.logger.info "Unknown case type: #{type}, skipping"
      false
    end
  end

  def extract_first_number(operand_value, message_text)
    text = operand_value.is_a?(String) ? operand_value.to_s : message_text.to_s
    return nil if text.blank?

    match = text.match(/[-+]?\d*\.?\d+/)
    match ? match[0].to_f : nil
  end

  def detect_date(operand_value, message_text)
    text = operand_value.is_a?(String) ? operand_value.to_s : message_text.to_s
    parse_date_safely(text)
  end

  def parse_date_safely(text)
    return nil if text.blank?

    begin
      Date.parse(text)
    rescue ArgumentError
      nil
    end
  end

  def detect_time(operand_value, message_text)
    text = operand_value.is_a?(String) ? operand_value.to_s : message_text.to_s
    begin
      Time.zone ? Time.zone.parse(text) : Time.zone.parse(text)
    rescue ArgumentError, TypeError
      nil
    end
  end

  # Helper to check if attachments include a given type
  def attachments_include_type?(operand_value, last_message, type_sym)
    attachments = if operand_value.is_a?(Hash) && operand_value.key?(:attachments)
                    Array(operand_value[:attachments])
                  else
                    Array(last_message&.attachments)
                  end
    return false if attachments.blank?

    attachments.any? do |att|
      att_type = if att.respond_to?(:file_type)
                   att.file_type.to_s
                 else
                   (att.is_a?(Hash) ? att[:file_type].to_s : '')
                 end
      att_type.to_sym == type_sym
    end
  end

  NUMBER_SYNONYMS = {
    '0' => %w[0 zero],
    '1' => %w[1 one first],
    '2' => %w[2 two second],
    '3' => %w[3 three third],
    '4' => %w[4 four fourth],
    '5' => %w[5 five fifth],
    '6' => %w[6 six sixth],
    '7' => %w[7 seven seventh],
    '8' => %w[8 eight eighth],
    '9' => %w[9 nine ninth],
    '10' => %w[10 ten tenth]
  }.freeze

  def includes_number_synonym?(text, word)
    return false if text.blank? || word.blank?

    synonyms = NUMBER_SYNONYMS[word] || []
    tokens = text.scan(/[[:alnum:]]+/).map { |t| normalize_text(t) }
    synonyms.any? { |syn| tokens.include?(normalize_text(syn)) }
  end

  def text_includes_any?(text, args)
    Array(args).any? do |arg|
      tokens = arg.to_s.split(/[\s,]+/).map { |t| normalize_text(t) }.reject(&:blank?)
      tokens.any? { |tok| text.include?(tok) || includes_number_synonym?(text, tok) }
    end
  end

  def text_includes_all?(text, args)
    words = Array(args).flat_map do |arg|
      arg.to_s.split(/[\s,]+/).map { |t| normalize_text(t) }.reject(&:blank?)
    end
    return false if words.empty?

    words.all? do |tok|
      text.include?(tok) || includes_number_synonym?(text, tok)
    end
  end

  # Return numeric index (1-based) from message text if a number synonym is present as a token
  def number_index_from_text(text, count)
    return nil if text.blank? || count.to_i <= 0

    tokens = text.scan(/[[:alnum:]]+/).map { |t| normalize_text(t) }
    (1..count).each do |i|
      synonyms = NUMBER_SYNONYMS[i.to_s] || []
      return i if synonyms.map { |s| normalize_text(s) }.intersect?(tokens)
    end
    nil
  end

  # Dequeue and start the next queued flow if no active executions remain
  def start_next_queued_flow_if_any
    # Only proceed if there are no active executions left for this conversation/contact
    active_exists = FlowExecution.exists?(conversation_id: conversation.id,
                                          contact_id: contact.id,
                                          status: [:pending, :running])

    return if active_exists

    queue = Flows::QueueService.new(conversation)
    # Skip queued entries that point to the same flow we just completed
    next_entry = nil
    loop do
      candidate = queue.dequeue_next
      break unless candidate

      if candidate[:flow_id] == flow.id
        Rails.logger.info "Skipping queued entry for same flow #{flow.id} to avoid restart"
        next
      end
      next_entry = candidate
      break
    end
    return unless next_entry

    next_flow = Flow.find_by(id: next_entry[:flow_id], account_id: conversation.account_id)
    unless next_flow&.active?
      Rails.logger.warn "Queued flow #{next_entry&.dig(:flow_id)} not found or inactive for conversation #{conversation.id}"
      return
    end

    Rails.logger.info "Starting next queued flow #{next_flow.id} for conversation #{conversation.id}"
    Flows::ExecutionJob.perform_later(
      flow_id: next_flow.id,
      conversation_id: conversation.id,
      trigger_data: {
        event_name: :queued_flow_start,
        triggered_at: Time.current,
        queued: true
      }
    )
  end

  def cleanup_flow_session_cache(conversation, flow)
    # Clean up all flow-related cache keys for this conversation to ensure fresh starts
    Rails.logger.info "Cleaning up flow session cache for conversation #{conversation.id}"

    # Clean up message event consumption keys
    Rails.cache.delete_matched("flow:event_consumed:conversation:#{conversation.id}:*")

    # Clean up message processing keys
    Rails.cache.delete_matched("flow:message_processing:conversation:#{conversation.id}:*")

    # Clean up send idempotency keys for this flow
    Rails.cache.delete_matched("flow:send_idempotency:#{conversation.id}:#{flow.id}:*")

    # Clean up execution deduplication keys
    Rails.cache.delete_matched("flow_execution:*:conversation:#{conversation.id}:*")

    # Clean up rate limiting keys for this conversation
    Rails.cache.delete_matched("flow_executions:conversation:#{conversation.id}:*")

    Rails.logger.info "Flow session cache cleanup completed for conversation #{conversation.id}"
  rescue StandardError => e
    Rails.logger.error "Error cleaning up flow session cache: #{e.message}"
    # Don't re-raise to avoid breaking the main flow
  end
end
