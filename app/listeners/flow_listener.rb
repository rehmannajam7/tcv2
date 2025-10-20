# Event listener for triggering flows based on conversation events
class FlowListener < BaseListener
  include Events::Types

  def message_created(event)
    trigger_flows_for_event(MESSAGE_CREATED, event.data)
  end

  def conversation_created(event)
    trigger_flows_for_event(CONVERSATION_CREATED, event.data)
  end

  def conversation_opened(event)
    trigger_flows_for_event(CONVERSATION_OPENED, event.data)
  end

  def conversation_resolved(event)
    trigger_flows_for_event(CONVERSATION_RESOLVED, event.data)
  end

  def conversation_status_changed(event)
    trigger_flows_for_event(CONVERSATION_STATUS_CHANGED, event.data)
  end

  def first_reply_created(event)
    trigger_flows_for_event(FIRST_REPLY_CREATED, event.data)
  end

  private

  def trigger_flows_for_event(event_name, event_data)
    # Skip if flows are disabled for this account
    return unless flows_enabled_for_account?(event_data)

    # Trigger flows asynchronously to avoid blocking the main thread
    Flows::TriggerJob.perform_later(
      event_name: event_name,
      event_data: serialize_event_data(event_data)
    )
  rescue StandardError => e
    Rails.logger.error "Flow listener error: #{e.message}"
    ChatwootExceptionTracker.new(e).capture_exception
  end

  def flows_enabled_for_account?(event_data)
    # Extract account from event data
    account = extract_account_from_event_data(event_data)
    return false unless account

    # Check if the account has any active flows
    account.flows.active.exists?
  end

  def extract_account_from_event_data(event_data)
    if event_data[:message]
      event_data[:message].account
    elsif event_data[:conversation]
      event_data[:conversation].account
    else
      nil
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