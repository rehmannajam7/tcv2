# Background job for executing flows asynchronously
class Flows::ExecutionJob < ApplicationJob
  queue_as :default

  def perform(flow_id:, conversation_id:, trigger_data: {})
    flow = Flow.find_by(id: flow_id)
    conversation = Conversation.find_by(id: conversation_id)

    unless flow && conversation
      Rails.logger.error "Flow execution job failed: Flow #{flow_id} or Conversation #{conversation_id} not found"
      return
    end

    # Ensure the flow belongs to the same account as the conversation
    unless flow.account_id == conversation.account_id
      Rails.logger.error "Flow execution job failed: Flow #{flow_id} and Conversation #{conversation_id} belong to different accounts"
      return
    end

    Rails.logger.info "Executing flow #{flow_id} for conversation #{conversation_id}"

    # Execute the flow
    Flows::ExecutionService.new(
      flow: flow,
      conversation: conversation,
      trigger_data: trigger_data
    ).perform

  rescue StandardError => e
    Rails.logger.error "Flow execution job error: #{e.message}"
    Rails.logger.error e.backtrace.join("\n")
    ChatwootExceptionTracker.new(e, account: conversation&.account).capture_exception
  end
end