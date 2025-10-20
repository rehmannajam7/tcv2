# Flow execution service for triggering and executing flows in conversations
class Flows::ExecutionService
  include Events::Types

  attr_reader :flow, :conversation, :contact, :trigger_data

  def initialize(flow:, conversation:, trigger_data: {})
    @flow = flow
    @conversation = conversation
    @contact = conversation.contact
    @trigger_data = trigger_data
  end

  def perform
    return unless flow&.active?
    return unless should_execute_flow?

    Rails.logger.info "Executing flow #{flow.id} for conversation #{conversation.id}"
    
    begin
      execute_flow_definition
      log_flow_execution
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
    return unless current_node

    execution_context = {
      conversation: conversation,
      contact: contact,
      flow: flow,
      variables: {}
    }

    while current_node
      current_node = execute_node(current_node, flow_definition, execution_context)
    end
  end

  def find_entry_node(flow_definition)
    nodes = flow_definition['nodes'] || []
    nodes.find { |node| node['type'] == 'entry' } || nodes.first
  end

  def execute_node(node, flow_definition, context)
    Rails.logger.debug "Executing node: #{node['type']} - #{node['uuid']}"

    case node['type']
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
    when 'switch'
      return execute_switch_node(node, flow_definition, context)
    when 'split_by_expression'
      return execute_split_by_expression_node(node, flow_definition, context)
    else
      Rails.logger.warn "Unknown node type: #{node['type']}"
    end

    # Find next node
    find_next_node(node, flow_definition)
  end

  def execute_send_message_node(node, context)
    message_text = node['text'] || node['actions']&.first&.dig('text')
    return unless message_text

    # Replace variables in message text
    processed_text = replace_variables(message_text, context)

    # Send message through Chatwoot's message system
    params = {
      content: processed_text,
      private: false,
      content_attributes: { flow_id: flow.id, node_uuid: node['uuid'] }
    }

    Messages::MessageBuilder.new(nil, conversation, params).perform
  end

  def execute_wait_for_response_node(node, context)
    # This node pauses execution until the next user message
    # In a real implementation, this would store the flow state
    # and resume when the next message arrives
    Rails.logger.info "Flow paused at wait_for_response node: #{node['uuid']}"
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

  def execute_add_contact_groups_node(node, context)
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
    webhook_url = node['url']
    method = node['method'] || 'POST'
    headers = node['headers'] || {}
    body = node['body'] || {}

    return unless webhook_url

    # Replace variables in webhook data
    processed_body = replace_variables_in_hash(body, context)
    
    # Execute webhook
    WebhookJob.perform_later(webhook_url, processed_body.merge(
      conversation_id: conversation.id,
      contact_id: contact.id,
      flow_id: flow.id
    ))
  end

  def execute_switch_node(node, flow_definition, context)
    # Switch nodes route based on categories/cases
    categories = node['router']&.dig('categories') || []
    
    # For now, use simple keyword matching
    last_message = conversation.messages.incoming.last
    message_text = last_message&.content&.downcase || ''

    matching_category = categories.find do |category|
      category_name = category['name']&.downcase
      message_text.include?(category_name) if category_name
    end

    if matching_category
      exit_uuid = matching_category['exit_uuid']
      find_node_by_exit(exit_uuid, flow_definition)
    else
      # Use default exit
      default_exit = node['router']&.dig('default_category_uuid')
      find_node_by_exit(default_exit, flow_definition) if default_exit
    end
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

  def evaluate_expression(arguments, context)
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

    connections = flow_definition['connections'] || []
    connection = connections.find { |conn| conn['source_uuid'] == exit_uuid }
    
    return nil unless connection

    target_uuid = connection['target_uuid']
    nodes = flow_definition['nodes'] || []
    nodes.find { |node| node['uuid'] == target_uuid }
  end

  def replace_variables(text, context)
    return text unless text.is_a?(String)

    # Replace common variables
    text.gsub(/@contact\.name/i, contact.name || 'there')
        .gsub(/@contact\.email/i, contact.email || '')
        .gsub(/@contact\.phone/i, contact.phone_number || '')
        .gsub(/@conversation\.id/i, conversation.display_id.to_s)
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
end