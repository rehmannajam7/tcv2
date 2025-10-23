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

    # Mark this execution to prevent duplicates
    Rails.cache.write(execution_key, true, expires_in: RATE_LIMIT_CONFIG[:deduplication_window])
    false
  end

  def generate_execution_key(conversation)
    # Create a unique key based on event, conversation, and recent message content
    key_components = [
      event_name,
      conversation.id,
      conversation.status,
      conversation.updated_at.to_i
    ]

    # Include message content hash for message-based events
    if event_data[:message]
      message = event_data[:message]
      key_components << Digest::MD5.hexdigest(message.content.to_s)
    end

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
    else
      nil
    end
  end

  def find_applicable_flows(conversation)
    # Get all active flows for the account
    flows = conversation.account.flows.active

    # Filter flows based on trigger type and conditions
    flows.select do |flow|
      flow_applicable_for_event?(flow, conversation)
    end
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

  def webhook_flow_applicable?(flow, conversation)
    # Webhook flows are triggered by external events
    # For now, we'll trigger them on message creation if they have webhook triggers
    event_name == MESSAGE_CREATED && flow.trigger_keyword.present?
  end

  def flow_event_matches?(flow)
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
    return true if flow.trigger_keyword.blank?

    # Check if the trigger keyword appears in the latest message
    case event_name
    when MESSAGE_CREATED, FIRST_REPLY_CREATED
      message = event_data[:message]
      return false unless message&.incoming?
      
      message.content&.downcase&.include?(flow.trigger_keyword.downcase)
    else
      true # For non-message events, keyword matching doesn't apply
    end
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
end