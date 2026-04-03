# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Conversations::HandoffPublicText do
  let(:account) { create(:account, locale: 'en') }
  let(:inbox) { create(:inbox, account: account) }
  let(:conversation) { create(:conversation, account: account, inbox: inbox, status: :pending) }

  describe '.message_for' do
    it 'returns the default locale string when no Captain assistant is linked' do
      expect(described_class.message_for(conversation)).to eq(I18n.t('conversations.captain.handoff'))
    end

    it 'uses the account locale for the default phrase' do
      account.update!(locale: 'pt_BR')
      expected = I18n.with_locale('pt_BR') { I18n.t('conversations.captain.handoff') }
      expect(described_class.message_for(conversation)).to eq(expected)
    end

    context 'with Captain assistant on inbox', if: defined?(Captain::Assistant) do
      let(:assistant) do
        create(:captain_assistant, account: account, config: { 'handoff_message' => 'Custom handoff line.' })
      end

      before { create(:captain_inbox, inbox: inbox, captain_assistant: assistant) }

      it 'prefers the assistant handoff_message when present' do
        expect(described_class.message_for(conversation)).to eq('Custom handoff line.')
      end

      it 'accepts an explicit assistant argument' do
        other = create(:captain_assistant, account: account, config: { 'handoff_message' => 'Other.' })
        expect(described_class.message_for(conversation, assistant: other)).to eq('Other.')
      end
    end
  end

  describe '.append_customer_message!' do
    it 'creates an outgoing public message with the resolved text' do
      expect do
        described_class.append_customer_message!(conversation)
      end.to change { conversation.messages.outgoing.where(private: false).count }.by(1)

      msg = conversation.messages.outgoing.where(private: false).last
      expect(msg.content).to eq(I18n.t('conversations.captain.handoff'))
    end
  end
end
