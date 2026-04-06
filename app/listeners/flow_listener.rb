# Event listener for triggering flows based on conversation events
class FlowListener < BaseListener
  include Events::Types

  def message_created(event)
    trigger_flows_for_event(MESSAGE_CREATED, event.data)
    broadcast_flow_activity_update(event.data)
  end

  def conversation_created(event)
    trigger_flows_for_event(CONVERSATION_CREATED, event.data)
    broadcast_flow_activity_update(event.data)
  end

  def conversation_opened(event)
    trigger_flows_for_event(CONVERSATION_OPENED, event.data)
    broadcast_flow_activity_update(event.data)
  end

  def conversation_resolved(event)
    trigger_flows_for_event(CONVERSATION_RESOLVED, event.data)
    broadcast_flow_activity_update(event.data)
  end

  def conversation_status_changed(event)
    trigger_flows_for_event(CONVERSATION_STATUS_CHANGED, event.data)
    broadcast_flow_activity_update(event.data)
  end

  def first_reply_created(event)
    trigger_flows_for_event(FIRST_REPLY_CREATED, event.data)
    broadcast_flow_activity_update(event.data)
  end

  private

  def trigger_flows_for_event(event_name, event_data)
    # Skip if flows are disabled for this account
    return unless flows_enabled_for_account?(event_data)

    # Check if this is a message event and there are active flow executions
    # If so, process synchronously to ensure flows have priority over other services
    if event_name == MESSAGE_CREATED && event_data[:message]&.incoming? && has_active_flow_executions?(event_data)
      Rails.logger.info "Processing flows synchronously for active execution: #{event_name}"
      begin
        # For synchronous processing, we need to execute the flows directly
        # rather than using the TriggerService which enqueues background jobs
        execute_flows_synchronously(event_name, event_data)
      rescue StandardError => e
        Rails.logger.error "Synchronous flow execution error: #{e.message}"
        ChatwootExceptionTracker.new(e).capture_exception
      end
    else
      # Trigger flows asynchronously for other cases
      Flows::TriggerJob.perform_later(
        event_name: event_name,
        event_data: serialize_event_data(event_data)
      )
    end
  rescue StandardError => e
    Rails.logger.error "Flow listener error: #{e.message}"
    ChatwootExceptionTracker.new(e).capture_exception
  end

  def broadcast_flow_activity_update(event_data)
    # Broadcast flow activity updates to connected clients via ActionCable
    # This replaces the need for aggressive polling in the flow editor
    account = extract_account_from_event_data(event_data)
    return unless account

    # Only broadcast if there are active flows for this account
    return unless account.flows.active.exists?

    # Prepare activity data for broadcast
    activity_data = {
      account_id: account.id,
      timestamp: Time.current.iso8601,
      event_type: 'flow_activity_update',
      has_activity: true
    }

    # Broadcast to account members (agents/admins who can access flows)
    tokens = account_member_tokens(account)

    ::ActionCableBroadcastJob.perform_later(
      tokens,
      'flow.activity_updated',
      activity_data
    )
  rescue StandardError => e
    Rails.logger.error "Flow activity broadcast error: #{e.message}"
    # Don't re-raise to avoid breaking the main flow
  end

  def account_member_tokens(account)
    # Get tokens for all account members who can access flows
    account.users.joins(:account_users).where(account_users: { role: %w[administrator agent] }).map(&:pubsub_token)
  end

  def flows_enabled_for_account?(event_data)
    # Extract account from event data
    account = extract_account_from_event_data(event_data)
    return false unless account

    # Check if the account has any active flows
    account.flows.active.exists?
  end

  def has_active_flow_executions?(event_data)
    # Check if there are active flow executions for this conversation
    conversation = extract_conversation_from_event_data(event_data)
    return false unless conversation&.contact

    # Check for any active flow executions (pending or running) for this conversation and contact
    FlowExecution.exists?(conversation_id: conversation.id,
                          contact_id: conversation.contact.id,
                          status: [:pending])
  end

  def extract_account_from_event_data(event_data)
    if event_data[:message]
      event_data[:message].account
    elsif event_data[:conversation]
      event_data[:conversation].account
    end
  end

  def extract_conversation_from_event_data(event_data)
    if event_data[:message]
      event_data[:message].conversation
    elsif event_data[:conversation]
      event_data[:conversation]
    end
  end

  def execute_flows_synchronously(event_name, event_data)
    conversation = extract_conversation_from_event_data(event_data)
    return unless conversation&.contact

    if event_data[:message]
      msg = event_data[:message]

      # Check if there's an active flow execution that might be waiting for this message
      has_active_execution = FlowExecution.exists?(
        conversation_id: conversation.id,
        contact_id: conversation.contact.id,
        status: [:pending]
      )

      # Only use message-level deduplication if there's no active flow execution
      # This allows consecutive invalid inputs to be processed when flow is waiting
      if has_active_execution
        Rails.logger.info "Allowing message #{msg.id} processing - pending flow execution detected"
      else
        consume_key = "flow:event_consumed:conversation:#{conversation.id}:message:#{msg.id}"

        # Enhanced duplicate detection with multiple checks
        return if Rails.cache.exist?(consume_key)

        # Additional check: ensure we're not processing the same message concurrently
        processing_key = "flow:message_processing:conversation:#{conversation.id}:message:#{msg.id}"
        if Rails.cache.exist?(processing_key)
          Rails.logger.info "Message #{msg.id} already being processed, skipping"
          return
        end

        # Mark as processing
        Rails.cache.write(processing_key, true, expires_in: 30.seconds)

        begin
          Rails.cache.write(consume_key, true, expires_in: 2.minutes)
        ensure
          # Clean up processing key after marking as consumed
          Rails.cache.delete(processing_key)
        end
      end
    end

    # Find active flow executions to resume
    active_executions = FlowExecution.where(
      conversation_id: conversation.id,
      contact_id: conversation.contact.id,
      status: [:pending]
    ).order(created_at: :desc)

    if active_executions.any?
      # Resume active executions synchronously
      active_executions.each do |execution|
        next unless execution.flow&.active?

        Rails.logger.info "Resuming flow execution #{execution.id} synchronously for conversation #{conversation.id}"

        # NOTE: Don't update execution status here - let ExecutionService handle it
        # The ExecutionService will set the appropriate status (running, pending, completed, etc.)
        # based on the actual execution outcome

        # Execute the flow synchronously using ExecutionService
        execution_service = ::Flows::ExecutionService.new(
          flow: execution.flow,
          conversation: conversation,
          trigger_data: {
            event_name: event_name,
            event_data: event_data,
            triggered_at: Time.current,
            resume_execution_id: execution.id,
            resume_context: execution.context
          }
        )

        execution_service.perform
      end
    else
      # Find applicable flows to execute
      account = extract_account_from_event_data(event_data)
      return unless account

      applicable_flows = account.flows.active.where(trigger_type: event_name)

      applicable_flows.each do |flow|
        Rails.logger.info "Executing flow #{flow.id} synchronously for conversation #{conversation.id}"

        # Execute the flow synchronously using ExecutionService
        execution_service = ::Flows::ExecutionService.new(
          flow: flow,
          conversation: conversation,
          trigger_data: {
            event_name: event_name,
            event_data: event_data,
            triggered_at: Time.current
          }
        )

        execution_service.perform
      end
    end
  end

  def serialize_event_data(event_data)
    # Serialize event data for background job processing
    # Only include essential data to avoid serialization issues
    serialized_data = {}

    if event_data[:message]
      message = event_data[:message]
      serialized_data[:message] = {
        id: message.id,
        content: message.content,
        message_type: message.message_type,
        created_at: message.created_at,
        conversation_id: message.conversation_id,
        account_id: message.account_id,
        sender_type: message.sender_type,
        sender_id: message.sender_id
      }
    end

    if event_data[:conversation]
      conversation = event_data[:conversation]
      serialized_data[:conversation] = {
        id: conversation.id,
        status: conversation.status,
        account_id: conversation.account_id,
        inbox_id: conversation.inbox_id,
        contact_id: conversation.contact_id,
        assignee_id: conversation.assignee_id,
        team_id: conversation.team_id,
        created_at: conversation.created_at,
        updated_at: conversation.updated_at
      }
    end

    # Include other relevant data
    serialized_data[:performed_by] = event_data[:performed_by]&.class&.name
    serialized_data[:changed_attributes] = event_data[:changed_attributes]

    serialized_data
  end
end
