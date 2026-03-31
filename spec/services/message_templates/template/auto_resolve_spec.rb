require 'rails_helper'

RSpec.describe MessageTemplates::Template::AutoResolve do
  let(:account) { create(:account) }
  let(:inbox) { create(:inbox, account: account) }
  let(:contact) { create(:contact, account: account) }
  let(:conversation) { create(:conversation, account: account, inbox: inbox, contact: contact) }

  describe '#perform' do
    context 'when auto_resolve_message is blank' do
      before do
        account.update!(auto_resolve_message: nil)
      end

      it 'does not create any message' do
        expect do
          described_class.new(conversation: conversation).perform
        end.not_to change(Message, :count)
      end
    end

    context 'when auto_resolve_message is present' do
      let(:auto_resolve_message) { 'This conversation has been automatically resolved due to inactivity.' }

      before do
        account.update!(auto_resolve_message: auto_resolve_message)
      end

      context 'when conversation should skip outgoing messages (silent mode)' do
        before do
          # Mock the silent mode validation service to return true
          allow(Conversations::SilentModeValidationService)
            .to receive(:should_skip_outgoing_message?)
            .with(conversation)
            .and_return(true)
        end

        it 'does not create any message' do
          expect do
            described_class.new(conversation: conversation).perform
          end.not_to change(Message, :count)
        end

        it 'does not create activity message' do
          expect(Conversations::ActivityMessageJob).not_to receive(:perform_later)
          described_class.new(conversation: conversation).perform
        end
      end

      context 'when conversation allows outgoing messages' do
        before do
          # Mock the silent mode validation service to return false
          allow(Conversations::SilentModeValidationService)
            .to receive(:should_skip_outgoing_message?)
            .with(conversation)
            .and_return(false)
        end

        context 'when within messaging window' do
          before do
            allow(conversation).to receive(:can_reply?).and_return(true)
          end

          it 'creates an auto resolve message' do
            expect do
              described_class.new(conversation: conversation).perform
            end.to change(Message, :count).by(1)
          end

          it 'creates message with correct attributes' do
            described_class.new(conversation: conversation).perform

            message = Message.last
            expect(message.account_id).to eq(conversation.account_id)
            expect(message.inbox_id).to eq(conversation.inbox_id)
            expect(message.message_type).to eq('template')
            expect(message.content).to eq(auto_resolve_message)
          end
        end

        context 'when outside messaging window' do
          before do
            allow(conversation).to receive(:can_reply?).and_return(false)
          end

          it 'does not create template message' do
            expect do
              described_class.new(conversation: conversation).perform
            end.not_to change(Message, :count)
          end

          it 'creates activity message job' do
            expect(Conversations::ActivityMessageJob).to receive(:perform_later)
              .with(conversation, hash_including(message_type: :activity))

            described_class.new(conversation: conversation).perform
          end
        end
      end
    end

    context 'integration test with actual silent mode validation' do
      let(:auto_resolve_message) { 'This conversation has been automatically resolved due to inactivity.' }

      before do
        account.update!(auto_resolve_message: auto_resolve_message)
      end

      context 'when conversation is resolved and managed by Captain with auto_resolution_silent enabled' do
        before do
          conversation.update!(status: :resolved)
          conversation.update!(additional_attributes: {
                                 captain_assistant_managed: true,
                                 auto_resolution_silent: true
                               })
        end

        it 'does not create any message due to silent mode' do
          expect do
            described_class.new(conversation: conversation).perform
          end.not_to change(Message, :count)
        end
      end

      context 'when conversation is resolved but not managed by Captain' do
        before do
          conversation.update!(status: :resolved)
          conversation.update!(additional_attributes: {
                                 captain_assistant_managed: false
                               })
        end

        it 'does not create any message due to resolved status' do
          expect do
            described_class.new(conversation: conversation).perform
          end.not_to change(Message, :count)
        end
      end

      context 'when conversation is open' do
        before do
          conversation.update!(status: :open)
          allow(conversation).to receive(:can_reply?).and_return(true)
        end

        it 'creates auto resolve message for open conversations' do
          expect do
            described_class.new(conversation: conversation).perform
          end.to change(Message, :count).by(1)
        end
      end
    end
  end
end
