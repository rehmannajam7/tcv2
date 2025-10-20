# Background job for processing flow triggers asynchronously
class Flows::TriggerJob < ApplicationJob
  queue_as :default

  def perform(event_name:, event_data:)
    Rails.logger.info "Processing flow triggers for event: #{event_name}"

    # Reconstruct objects from serialized data
    reconstructed_data = reconstruct_event_data(event_data)

    # Process flow triggers
    Flows::TriggerService.new(
      event_name: event_name,
      event_data: reconstructed_data
    ).perform

  rescue StandardError => e
    Rails.logger.error "Flow trigger job error: #{e.message}"
    Rails.logger.error e.backtrace.join("\n")
    ChatwootExceptionTracker.new(e).capture_exception
  end

  private

  def reconstruct_event_data(serialized_data)
    reconstructed_data = {}

    # Reconstruct message object
    if serialized_data[:message]
      message_data = serialized_data[:message]
      message = Message.find_by(id: message_data[:id])
      reconstructed_data[:message] = message if message
    end

    # Reconstruct conversation object
    if serialized_data[:conversation]
      conversation_data = serialized_data[:conversation]
      conversation = Conversation.find_by(id: conversation_data[:id])
      reconstructed_data[:conversation] = conversation if conversation
    end

    # Include other data
    reconstructed_data[:performed_by] = serialized_data[:performed_by]
    reconstructed_data[:changed_attributes] = serialized_data[:changed_attributes]

    reconstructed_data
  end
end