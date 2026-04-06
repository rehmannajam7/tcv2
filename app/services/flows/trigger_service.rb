# Service to trigger flows based on conversation events
class Flows::TriggerService
  include Events::Types

  attr_reader :event_name, :event_data

  # Rate limiting configuration
  RATE_LIMIT_CONFIG = {
    max_executions_per_minute: 60,
    max_executions_per_conversation_per_minute: 5,
    deduplication_window: 30.seconds,
    circuit_breaker_threshold: 10,
    circuit_breaker_timeout: 5.minutes
  }.freeze

  def initialize(event_name:, event_data:)
    @event_name = event_name
    @event_data = event_data
  end

  def perform
    return unless should_process_event?

    conversation = extract_conversation_from_event
    return unless conversation

    Rails.logger.info "Processing flow triggers for event: #{event_name}, conversation: #{conversation.id}"

    # Apply rate limiting and deduplication
    return if rate_limited?(conversation)
    return if duplicate_execution?(conversation)

    # Check if there are any active flow executions to resume
    active_executions = find_active_flow_executions(conversation)

    if active_executions.any?
      # Only resume on incoming message events to avoid repeated resumes
      # triggered by our own outgoing messages.
      is_incoming_message_event = [MESSAGE_CREATED, FIRST_REPLY_CREATED].include?(event_name) && event_data[:message]&.incoming?

      if is_incoming_message_event
        # If the incoming message matches a different flow by keyword, interrupt
        # the active session(s) and start the matched flow immediately.
        matched_flows = find_keyword_matched_flows(conversation, exclude_flow_ids: [])
        if matched_flows.any?
          matched_flow = select_interrupt_flow(matched_flows)
          Rails.logger.info "Interrupting active session(s) to start keyword-matched flow #{matched_flow.id} for conversation #{conversation.id}"
          interrupt_active_executions_and_start_flow(conversation, matched_flow, active_executions)
          record_successful_execution(matched_flow, conversation)
          return
        end

        Rails.logger.info "Resuming active flow executions for conversation #{conversation.id} (incoming message)"

        active_executions.each do |execution|
          next if flow_circuit_breaker_open?(execution.flow)

          begin
            resume_flow_execution(execution, conversation)
            record_successful_execution(execution.flow, conversation)
          rescue StandardError => e
            handle_flow_execution_error(execution.flow, conversation, e)
          end
        end
        # While an execution is active, capture keyword-matched flows to run afterward
        enqueue_keyword_matched_flows(conversation)
      else
        Rails.logger.info "Active execution present; skipping resume for non-incoming event #{event_name}"
      end
      # In both cases, don't start new flows while an execution is active
      return
    end

    # Find and execute applicable flows with circuit breaker protection
    applicable_flows = find_applicable_flows(conversation)

    applicable_flows.each do |flow|
      next if flow_circuit_breaker_open?(flow)

      begin
        execute_flow_async(flow, conversation)
        record_successful_execution(flow, conversation)
      rescue StandardError => e
        handle_flow_execution_error(flow, conversation, e)
      end
    end
  end

  private

  def should_process_event?
    # Only process specific events that can trigger flows
    triggerable_events = [
      MESSAGE_CREATED,
      CONVERSATION_CREATED,
      CONVERSATION_OPENED,
      CONVERSATION_RESOLVED,
      CONVERSATION_STATUS_CHANGED,
      FIRST_REPLY_CREATED
    ]

    triggerable_events.include?(event_name)
  end

  def rate_limited?(conversation)
    # Check global rate limit
    global_key = "flow_executions:global:#{Time.current.strftime('%Y%m%d%H%M')}"
    global_count = Rails.cache.read(global_key) || 0

    if global_count >= RATE_LIMIT_CONFIG[:max_executions_per_minute]
      Rails.logger.warn "Global flow execution rate limit exceeded: #{global_count}/#{RATE_LIMIT_CONFIG[:max_executions_per_minute]}"
      return true
    end

    # Check per-conversation rate limit
    conversation_key = "flow_executions:conversation:#{conversation.id}:#{Time.current.strftime('%Y%m%d%H%M')}"
    conversation_count = Rails.cache.read(conversation_key) || 0

    if conversation_count >= RATE_LIMIT_CONFIG[:max_executions_per_conversation_per_minute]
      Rails.logger.warn "Conversation flow execution rate limit exceeded for conversation #{conversation.id}: #{conversation_count}/#{RATE_LIMIT_CONFIG[:max_executions_per_conversation_per_minute]}"
      return true
    end

    # Increment counters
    Rails.cache.write(global_key, global_count + 1, expires_in: 1.minute)
    Rails.cache.write(conversation_key, conversation_count + 1, expires_in: 1.minute)

    false
  end

  def duplicate_execution?(conversation)
    # Create a unique key for this execution context
    execution_key = generate_execution_key(conversation)

    # Check if we've already processed this exact scenario recently
    if Rails.cache.exist?(execution_key)
      Rails.logger.info "Duplicate flow execution detected for conversation #{conversation.id}, skipping"
      return true
    end

    # Enhanced duplicate detection for keyword-based flows
    # Allow immediate retriggering if the last execution completed recently
    if event_name.in?([MESSAGE_CREATED, FIRST_REPLY_CREATED]) && event_data[:message]&.incoming?
      message = event_data[:message]

      # Check if this is a keyword-based trigger
      if message.content.present?
        # Look for recent completed executions for keyword-based flows
        recent_executions = FlowExecution.where(
          conversation: conversation,
          status: :completed
        ).where('completed_at > ?', 30.seconds.ago)

        # If we have recent completions and the message is different from the last trigger,
        # allow retriggering
        if recent_executions.exists?
          last_message_key = "flow:last_trigger_message:conversation:#{conversation.id}"
          last_message = Rails.cache.read(last_message_key)

          if last_message != message.content
            Rails.logger.info 'Allowing retrigger - different message content detected'
            # Don't mark as duplicate, but still set the execution key for normal deduplication
            Rails.cache.write(execution_key, true, expires_in: 30.seconds)
            Rails.cache.write(last_message_key, message.content, expires_in: 5.minutes)
            return false
          end
        end
      end
    end

    # Mark this execution to prevent duplicates
    Rails.cache.write(execution_key, true, expires_in: 2.minutes)
    false
  end

  def generate_execution_key(conversation)
    # For message-based events, deduplicate across MESSAGE_CREATED and FIRST_REPLY_CREATED
    # using the message id when available (fallback to content hash).
    if event_data[:message]
      message = event_data[:message]
      message_identifier = message.id || Digest::MD5.hexdigest(message.content.to_s)
      exec_ids = FlowExecution.where(conversation_id: conversation.id, contact_id: conversation.contact_id,
                                     status: [:pending, :running]).pluck(:id).join('-')
      return "flow_execution:message_event:#{message_identifier}:conversation:#{conversation.id}:execs:#{exec_ids}"
    end

    # For non-message events, include event_name for specificity
    key_components = [
      event_name,
      conversation.id,
      conversation.status,
      conversation.updated_at.to_i
    ]

    "flow_execution:#{Digest::MD5.hexdigest(key_components.join(':'))}"
  end

  def flow_circuit_breaker_open?(flow)
    circuit_key = "flow_circuit_breaker:#{flow.id}"
    failure_count = Rails.cache.read("#{circuit_key}:failures") || 0

    if failure_count >= RATE_LIMIT_CONFIG[:circuit_breaker_threshold]
      last_failure = Rails.cache.read("#{circuit_key}:last_failure")
      if last_failure && (Time.current - last_failure) < RATE_LIMIT_CONFIG[:circuit_breaker_timeout]
        Rails.logger.warn "Circuit breaker open for flow #{flow.id}, skipping execution"
        return true
      else
        # Reset circuit breaker after timeout
        Rails.cache.delete("#{circuit_key}:failures")
        Rails.cache.delete("#{circuit_key}:last_failure")
      end
    end

    false
  end

  def record_successful_execution(flow, conversation)
    # Reset circuit breaker failure count on successful execution
    circuit_key = "flow_circuit_breaker:#{flow.id}"
    Rails.cache.delete("#{circuit_key}:failures")
    Rails.cache.delete("#{circuit_key}:last_failure")

    # Clean up session-specific cache keys for this conversation
    cleanup_conversation_flow_cache(conversation)
  end

  def cleanup_conversation_flow_cache(conversation)
    # Clean up conversation-specific flow cache keys
    Rails.cache.delete_matched("flow:last_trigger_message:conversation:#{conversation.id}")
    Rails.cache.delete_matched("flow_execution:*:conversation:#{conversation.id}:*")
    Rails.cache.delete_matched("flow_executions:conversation:#{conversation.id}:*")
  rescue StandardError => e
    Rails.logger.error "Error cleaning up conversation flow cache: #{e.message}"
  end

  def handle_flow_execution_error(flow, conversation, error)
    Rails.logger.error "Flow execution error for flow #{flow.id}, conversation #{conversation.id}: #{error.message}"

    # Increment circuit breaker failure count
    circuit_key = "flow_circuit_breaker:#{flow.id}"
    failure_count = (Rails.cache.read("#{circuit_key}:failures") || 0) + 1

    Rails.cache.write("#{circuit_key}:failures", failure_count, expires_in: RATE_LIMIT_CONFIG[:circuit_breaker_timeout])
    Rails.cache.write("#{circuit_key}:last_failure", Time.current, expires_in: RATE_LIMIT_CONFIG[:circuit_breaker_timeout])

    # Track error for monitoring
    ChatwootExceptionTracker.new(error, account: conversation.account).capture_exception
  end

  def extract_conversation_from_event
    case event_name
    when MESSAGE_CREATED, FIRST_REPLY_CREATED
      event_data[:message]&.conversation
    when CONVERSATION_CREATED, CONVERSATION_OPENED, CONVERSATION_RESOLVED, CONVERSATION_STATUS_CHANGED
      event_data[:conversation]
    end
  end

  def find_active_flow_executions(conversation)
    # Find active flow executions for this conversation and contact
    # This includes both pending and running executions
    contact = conversation.contact

    FlowExecution.where(
      conversation_id: conversation.id,
      contact_id: contact.id,
      status: [:pending, :running]
    ).order(created_at: :desc)
  end

  def find_applicable_flows(conversation)
    # Check if there are any active flow executions for this conversation/contact
    # If so, we should resume those instead of starting new flows
    active_executions = find_active_flow_executions(conversation)

    if active_executions.any?
      Rails.logger.info(
        "Found active flow executions for conversation #{conversation.id}: " \
        "#{active_executions.map(&:id).join(', ')}"
      )
      # If an active execution exists, queue any keyword-matched flows to run afterward
      enqueue_keyword_matched_flows(conversation)
      return [] # Don't start new flows if there are active executions
    end

    # Get all active flows for the account
    flows = conversation.account.flows.active

    # If the flow has inbox associations, only consider flows linked to this conversation's inbox
    # This enforces FlowEditor sidebar inbox selections at runtime
    associated_flows = flows.joins(:flow_inbox_associations)
                            .where(flow_inbox_associations: { inbox_id: conversation.inbox_id })
    
    # Filter flows individually: flows with associations only trigger on their associated inboxes,
    # flows without associations trigger on all inboxes (legacy behavior)
    flows_to_check = flows.select do |flow|
      if flow.flow_inbox_associations.exists?
        # Flow has specific associations - only include if associated with this inbox
        associated_flows.exists?(id: flow.id)
      else
        # Flow has no associations - include it (legacy behavior)
        true
      end
    end

    Rails.logger.info(
      "Flow selection: account_id=#{conversation.account_id} inbox_id=#{conversation.inbox_id} " \
      "active_flows=#{flows.count} associated_flows=#{associated_flows.count} " \
      "using_associations=#{associated_flows.exists?}"
    )

    # Filter flows based on trigger type and conditions
    flows_to_check.select do |flow|
      flow_applicable_for_event?(flow, conversation)
    end
  end

  # Queue keyword-matched flows when an execution is active, to run after completion
  def enqueue_keyword_matched_flows(conversation)
    # Only consider message-based events for keyword matching
    return unless [MESSAGE_CREATED, FIRST_REPLY_CREATED].include?(event_name)

    message = event_data[:message]
    return unless message&.incoming?

    # Avoid queuing flows that are currently active for this conversation/contact
    active_executions = find_active_flow_executions(conversation)
    active_flow_ids = active_executions.map(&:flow_id)

    flows = conversation.account.flows.active

    # Respect inbox associations
    associated_flows = flows.joins(:flow_inbox_associations)
                            .where(flow_inbox_associations: { inbox_id: conversation.inbox_id })
    
    # Filter flows individually: flows with associations only trigger on their associated inboxes,
    # flows without associations trigger on all inboxes (legacy behavior)
    flows_to_check = flows.select do |flow|
      if flow.flow_inbox_associations.exists?
        # Flow has specific associations - only include if associated with this inbox
        associated_flows.exists?(id: flow.id)
      else
        # Flow has no associations - include it (legacy behavior)
        true
      end
    end

    matched = flows_to_check.select do |flow|
      next false if flow.trigger_keyword.blank?
      next false if active_flow_ids.include?(flow.id)

      content = message.content.to_s
      keyword = flow.trigger_keyword.to_s
      regex = /(^|[^\p{Alnum}_])#{Regexp.escape(keyword)}([^\p{Alnum}_]|$)/i
      content.match?(regex)
    end

    return if matched.empty?

    queue = Flows::QueueService.new(conversation)
    matched.each { |flow| queue.enqueue(flow) }

    Rails.logger.info(
      "Queued #{matched.size} keyword-matched flow(s) for conversation #{conversation.id}: " \
      "#{matched.map(&:id).join(', ')}"
    )
  end

  # Find flows that are keyword-matched by the current incoming message.
  # Optionally exclude flows by id (e.g., active executions).
  def find_keyword_matched_flows(conversation, exclude_flow_ids: [])
    return [] unless [MESSAGE_CREATED, FIRST_REPLY_CREATED].include?(event_name)

    message = event_data[:message]
    return [] unless message&.incoming?

    flows = conversation.account.flows.active

    # Respect inbox associations
    associated_flows = flows.joins(:flow_inbox_associations)
                            .where(flow_inbox_associations: { inbox_id: conversation.inbox_id })
    
    # Filter flows individually: flows with associations only trigger on their associated inboxes,
    # flows without associations trigger on all inboxes (legacy behavior)
    flows_to_check = flows.select do |flow|
      if flow.flow_inbox_associations.exists?
        # Flow has specific associations - only include if associated with this inbox
        associated_flows.exists?(id: flow.id)
      else
        # Flow has no associations - include it (legacy behavior)
        true
      end
    end

    matched = flows_to_check.select do |flow|
      next false if flow.id.in?(exclude_flow_ids)

      keyword_matches?(flow, conversation)
    end

    # Enhanced flow selection logic for better retriggering
    # Prefer flows that haven't been executed recently to avoid immediate retrigger issues
    matched.sort_by do |flow|
      # Get last execution time for this flow and conversation
      last_execution = FlowExecution.where(
        flow: flow,
        conversation: conversation
      ).order(completed_at: :desc).first

      # Sort by most recent first, but give preference to flows with no recent executions
      last_execution_time = last_execution&.completed_at || Time.zone.at(0)
      [-last_execution_time.to_i, -flow.updated_at.to_i]
    end
  end

  # Choose which flow to interrupt to; default is most recently updated
  def select_interrupt_flow(matched_flows)
    matched_flows.first
  end

  # Interrupt active executions, mark them completed with interruption metadata,
  # log an activity, and start the new matched flow immediately.
  def interrupt_active_executions_and_start_flow(conversation, matched_flow, active_executions)
    # End current pending/running executions
    active_executions.each do |execution|
      results = execution.results || {}
      results['interrupted_by_flow_id'] = matched_flow.id
      results['interrupted_at'] = Time.current
      execution.update!(status: :completed, completed_at: Time.current, results: results)
    rescue StandardError => e
      Rails.logger.warn "Failed to mark execution #{execution.id} as interrupted: #{e.message}"
    end

    # Log activity about interruption
    begin
      content = "Flow session interrupted by keyword '#{matched_flow.trigger_keyword}' (starting flow: #{matched_flow.name})"
      ::Conversations::ActivityMessageJob.perform_later(
        conversation,
        {
          account_id: conversation.account_id,
          inbox_id: conversation.inbox_id,
          message_type: :activity,
          content: content
        }
      )
    rescue StandardError
      # no-op
    end

    # Start matched flow immediately
    execute_flow_async(matched_flow, conversation)
  end

  def flow_applicable_for_event?(flow, conversation)
    case flow.trigger_type
    when 'automatic'
      automatic_flow_applicable?(flow, conversation)
    when 'webhook'
      webhook_flow_applicable?(flow, conversation)
    else
      false # Manual flows are not triggered by events
    end
  end

  def automatic_flow_applicable?(flow, conversation)
    # Check if the flow should be triggered based on the event and conditions
    return false unless flow_event_matches?(flow)

    # Check trigger keyword if specified
    return false unless keyword_matches?(flow, conversation)

    # Evaluate trigger conditions
    evaluate_flow_conditions(flow, conversation)
  end

  def webhook_flow_applicable?(flow, _conversation)
    # Webhook flows are triggered by external events
    # For now, we'll trigger them on message creation if they have webhook triggers
    event_name == MESSAGE_CREATED && flow.trigger_keyword.present?
  end

  def flow_event_matches?(_flow)
    # Map flow trigger types to events
    case event_name
    when MESSAGE_CREATED
      true # Most flows can be triggered by new messages
    when CONVERSATION_CREATED
      true # Flows can be triggered when conversations start
    when CONVERSATION_OPENED
      true # Flows can be triggered when conversations are reopened
    when CONVERSATION_RESOLVED
      false # Usually don't trigger flows on resolution
    when FIRST_REPLY_CREATED
      true # Good trigger point for welcome flows
    else
      false
    end
  end

  def keyword_matches?(flow, conversation)
    # Require a non-empty keyword for any automatic triggering
    return false if flow.trigger_keyword.blank?

    # Only process keyword matching for incoming message-based events
    unless [MESSAGE_CREATED, FIRST_REPLY_CREATED].include?(event_name)
      Rails.logger.info(
        "Skipping non-message event for keyword-triggered flow: flow_id=#{flow.id} event=#{event_name}"
      )
      return false
    end

    message = event_data[:message]
    return false unless message&.incoming?

    content = message.content.to_s
    keyword = flow.trigger_keyword.to_s
    regex = /(^|[^\p{Alnum}_])#{Regexp.escape(keyword)}([^\p{Alnum}_]|$)/i
    matched = content.match?(regex)
    Rails.logger.info(
      "Flow keyword check: flow_id=#{flow.id} inbox_id=#{conversation.inbox_id} " \
      "event=#{event_name} keyword='#{flow.trigger_keyword}' message='#{message.content}' matched=#{matched}"
    )
    matched
  end

  def evaluate_flow_conditions(flow, conversation)
    return true if flow.trigger_conditions.blank?

    begin
      conditions = JSON.parse(flow.trigger_conditions)

      # All conditions must be met (AND logic)
      conditions.all? do |condition|
        evaluate_single_condition(condition, conversation)
      end
    rescue JSON::ParserError
      Rails.logger.error "Invalid trigger conditions JSON for flow #{flow.id}"
      false
    end
  end

  def evaluate_single_condition(condition, conversation)
    attribute = condition['attribute']
    operator = condition['operator']
    value = condition['value']

    case attribute
    when 'inbox_id'
      evaluate_inbox_condition(conversation, operator, value)
    when 'conversation_status'
      evaluate_status_condition(conversation, operator, value)
    when 'contact_email'
      evaluate_contact_condition(conversation.contact, 'email', operator, value)
    when 'contact_phone'
      evaluate_contact_condition(conversation.contact, 'phone_number', operator, value)
    when 'contact_name'
      evaluate_contact_condition(conversation.contact, 'name', operator, value)
    when 'message_content'
      evaluate_message_content_condition(conversation, operator, value)
    when 'assignee_id'
      evaluate_assignee_condition(conversation, operator, value)
    when 'team_id'
      evaluate_team_condition(conversation, operator, value)
    when 'custom_attribute'
      evaluate_custom_attribute_condition(conversation, condition)
    else
      Rails.logger.warn "Unknown condition attribute: #{attribute}"
      false
    end
  end

  def evaluate_inbox_condition(conversation, operator, value)
    case operator
    when 'equals'
      conversation.inbox_id.to_s == value.to_s
    when 'not_equals'
      conversation.inbox_id.to_s != value.to_s
    else
      false
    end
  end

  def evaluate_status_condition(conversation, operator, value)
    case operator
    when 'equals'
      conversation.status == value
    when 'not_equals'
      conversation.status != value
    else
      false
    end
  end

  def evaluate_contact_condition(contact, field, operator, value)
    return false unless contact

    contact_value = contact.send(field) if contact.respond_to?(field)

    case operator
    when 'equals'
      contact_value&.downcase == value&.downcase
    when 'not_equals'
      contact_value&.downcase != value&.downcase
    when 'contains'
      contact_value&.downcase&.include?(value&.downcase)
    when 'not_contains'
      !contact_value&.downcase&.include?(value&.downcase)
    when 'is_present'
      contact_value.present?
    when 'is_not_present'
      contact_value.blank?
    else
      false
    end
  end

  def evaluate_message_content_condition(conversation, operator, value)
    # Get the message from the current event if it's a message event
    message = case event_name
              when MESSAGE_CREATED, FIRST_REPLY_CREATED
                event_data[:message]
              else
                conversation.messages.incoming.last
              end

    return false unless message

    case operator
    when 'contains'
      message.content&.downcase&.include?(value&.downcase)
    when 'not_contains'
      !message.content&.downcase&.include?(value&.downcase)
    when 'equals'
      message.content&.downcase == value&.downcase
    when 'starts_with'
      message.content&.downcase&.start_with?(value&.downcase)
    when 'ends_with'
      message.content&.downcase&.end_with?(value&.downcase)
    else
      false
    end
  end

  def evaluate_assignee_condition(conversation, operator, value)
    case operator
    when 'equals'
      conversation.assignee_id.to_s == value.to_s
    when 'not_equals'
      conversation.assignee_id.to_s != value.to_s
    when 'is_present'
      conversation.assignee_id.present?
    when 'is_not_present'
      conversation.assignee_id.blank?
    else
      false
    end
  end

  def evaluate_team_condition(conversation, operator, value)
    case operator
    when 'equals'
      conversation.team_id.to_s == value.to_s
    when 'not_equals'
      conversation.team_id.to_s != value.to_s
    when 'is_present'
      conversation.team_id.present?
    when 'is_not_present'
      conversation.team_id.blank?
    else
      false
    end
  end

  def evaluate_custom_attribute_condition(conversation, condition)
    attribute_key = condition['custom_attribute_key']
    operator = condition['operator']
    value = condition['value']

    return false unless attribute_key

    # Check both conversation and contact custom attributes
    conversation_value = conversation.custom_attributes&.dig(attribute_key)
    contact_value = conversation.contact&.custom_attributes&.dig(attribute_key)

    actual_value = conversation_value || contact_value

    case operator
    when 'equals'
      actual_value&.to_s&.downcase == value&.to_s&.downcase
    when 'not_equals'
      actual_value&.to_s&.downcase != value&.to_s&.downcase
    when 'contains'
      actual_value&.to_s&.downcase&.include?(value&.to_s&.downcase)
    when 'is_present'
      actual_value.present?
    when 'is_not_present'
      actual_value.blank?
    else
      false
    end
  end

  def execute_flow_async(flow, conversation)
    # Execute flow in background to avoid blocking the main thread
    Flows::ExecutionJob.perform_later(
      flow_id: flow.id,
      conversation_id: conversation.id,
      trigger_data: {
        event_name: event_name,
        triggered_at: Time.current
      }
    )
  end

  def resume_flow_execution(execution, conversation)
    # Resume a paused flow execution
    Rails.logger.info "Resuming flow execution #{execution.id} for conversation #{conversation.id}"

    # Prevent async resume if the event was consumed by sync path
    if event_data[:message]
      msg = event_data[:message]
      consume_key = "flow:event_consumed:conversation:#{conversation.id}:message:#{msg.id}"
      if Rails.cache.exist?(consume_key)
        Rails.logger.info "Skipping async resume; event already consumed (#{consume_key})"
        return
      end
    end

    # Update the execution status to running
    execution.update!(status: :running)

    # Execute the flow in background with resume context
    Flows::ExecutionJob.perform_later(
      flow_id: execution.flow_id,
      conversation_id: conversation.id,
      trigger_data: {
        event_name: event_name,
        triggered_at: Time.current,
        resume_execution_id: execution.id,
        resume_context: execution.context
      }
    )
  end
end
