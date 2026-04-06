class Captain::Tools::FlowTool < Captain::Tools::BasePublicTool
  description 'Trigger an automation flow by name for the current conversation'
  param :flow_name, type: 'string', desc: 'The name of the automation flow to execute'

  def perform(tool_context, flow_name:)
    conversation = find_conversation(tool_context.state)
    return 'Conversation not found' unless conversation

    flow_name = flow_name&.strip
    return 'Flow name is required' if flow_name.blank?

    automation = find_automation(flow_name)
    return "Flow '#{flow_name}' not found or is inactive" unless automation

    run_automation(automation, conversation)

    log_tool_usage('triggered_flow', conversation_id: conversation.id, flow_name: flow_name)

    "Automation flow '#{flow_name}' triggered for conversation ##{conversation.display_id}"
  rescue StandardError => e
    ChatwootExceptionTracker.new(e).capture_exception
    "Failed to trigger flow '#{flow_name}'"
  end

  private

  def find_automation(flow_name)
    account_scoped(::AutomationRule).active.find_by(name: flow_name)
  end

  def run_automation(automation, conversation)
    ::AutomationRules::ActionService.new(automation, conversation.account, conversation).perform
  end
end
