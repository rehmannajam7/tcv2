# frozen_string_literal: true

# Single source of truth for the customer-visible line when handing off to a human.
# Used by Captain (job + tools), flow copy (@conversation.standard_handoff), inference handoff,
# and bot integrations (Dialogflow, external Captain hook).
module Conversations::HandoffPublicText
  module_function

  def message_for(conversation, assistant: nil)
    assistant ||= captain_assistant_for(conversation)
    custom = assistant&.config&.[]('handoff_message').to_s.strip.presence
    return custom if custom.present?

    locale = conversation&.account&.locale
    I18n.with_locale(normalized_locale(locale)) do
      I18n.t('conversations.captain.handoff')
    end
  end

  def append_customer_message!(conversation, assistant: nil, preserve_waiting_since: false)
    assistant ||= captain_assistant_for(conversation)
    attrs = {
      message_type: :outgoing,
      private: false,
      account: conversation.account,
      inbox: conversation.inbox,
      content: message_for(conversation, assistant: assistant)
    }
    attrs[:sender] = assistant if assistant.present?
    attrs[:preserve_waiting_since] = true if preserve_waiting_since
    conversation.messages.create!(attrs)
  end

  def captain_assistant_for(conversation)
    inbox = conversation&.inbox
    return unless inbox.respond_to?(:captain_assistant)

    inbox.captain_assistant
  end

  def normalized_locale(locale)
    locale.presence || I18n.default_locale
  end
end
