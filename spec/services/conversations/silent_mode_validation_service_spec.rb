require 'rails_helper'

RSpec.describe Conversations::SilentModeValidationService do
  let(:account) { create(:account) }
  let(:conversation) { create(:conversation, account: account) }

  describe '.should_skip_outgoing_message?' do
    context 'when conversation is not resolved' do
      before { conversation.update!(status: 'open') }

      it 'returns false' do
        expect(described_class.should_skip_outgoing_message?(conversation)).to be false
      end
    end

    context 'when conversation is resolved' do
      before { conversation.update!(status: 'resolved') }

      context 'when conversation is resolved and managed by Captain assistant with auto-resolve silent mode' do
        let(:captain_assistant) do
          create(:captain_assistant,
                 account: account,
                 config: { 'auto_resolution_silent' => true })
        end

        before do
          create(:captain_inbox, captain_assistant: captain_assistant, inbox: conversation.inbox)
          conversation.inbox.reload
        end

        it 'returns true' do
          expect(described_class.should_skip_outgoing_message?(conversation)).to be true
        end
      end

      context 'when conversation is managed by Captain assistant without silent auto-resolution' do
        let(:captain_assistant) do
          create(:captain_assistant,
                 account: account,
                 config: { 'auto_resolution_silent' => false })
        end

        before do
          create(:captain_inbox, captain_assistant: captain_assistant, inbox: conversation.inbox)
          conversation.inbox.reload
        end

        it 'returns false' do
          expect(described_class.should_skip_outgoing_message?(conversation)).to be false
        end
      end

      context 'when conversation is not managed by Captain assistant' do
        it 'returns true' do
          expect(described_class.should_skip_outgoing_message?(conversation)).to be true
        end
      end
    end
  end

  describe '.conversation_allows_outgoing_messages?' do
    context 'when conversation is not resolved' do
      before { conversation.update!(status: 'open') }

      it 'returns true' do
        expect(described_class.conversation_allows_outgoing_messages?(conversation)).to be true
      end
    end

    context 'when conversation is resolved' do
      before { conversation.update!(status: 'resolved') }

      context 'when conversation is managed by Captain assistant with silent auto-resolution enabled' do
        let(:captain_assistant) do
          create(:captain_assistant,
                 account: account,
                 config: { 'auto_resolution_silent' => true })
        end

        before do
          create(:captain_inbox, captain_assistant: captain_assistant, inbox: conversation.inbox)
          conversation.inbox.reload
        end

        it 'returns false' do
          expect(described_class.conversation_allows_outgoing_messages?(conversation)).to be false
        end
      end

      context 'when conversation is managed by Captain assistant without silent auto-resolution' do
        let(:captain_assistant) do
          create(:captain_assistant,
                 account: account,
                 config: { 'auto_resolution_silent' => false })
        end

        before do
          create(:captain_inbox, captain_assistant: captain_assistant, inbox: conversation.inbox)
          conversation.inbox.reload
        end

        it 'returns true' do
          expect(described_class.conversation_allows_outgoing_messages?(conversation)).to be true
        end
      end

      context 'when conversation is not managed by Captain assistant' do
        it 'returns false' do
          expect(described_class.conversation_allows_outgoing_messages?(conversation)).to be false
        end
      end
    end
  end
end
