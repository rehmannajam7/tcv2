class Conversations::SilentModeValidationService
  def self.should_skip_outgoing_message?(conversation)
    return false unless conversation&.resolved?

    # Check if this is a Captain assistant managed conversation
    if conversation.inbox&.captain_assistant
      # If auto_resolution_silent is enabled, skip outgoing messages
      return conversation.inbox.captain_assistant.config&.dig('auto_resolution_silent') == true
    end

    # For all other resolved conversations, skip outgoing messages
    true
  end

  def self.conversation_allows_outgoing_messages?(conversation)
    !should_skip_outgoing_message?(conversation)
  end
end
