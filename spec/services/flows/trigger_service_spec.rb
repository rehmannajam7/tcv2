require 'rails_helper'

RSpec.describe Flows::TriggerService do
  include Events::Types

  let(:account) { create(:account) }
  let(:inbox) { create(:inbox, account: account) }
  let(:conversation) { create(:conversation, account: account, inbox: inbox) }
  let(:user) { create(:user, account: account) }

  describe '#perform keyword matching and inbox associations' do
    let!(:flow_keyword_inbox) do
      create(:flow, :active, :automatic, :with_keyword,
             account: account,
             created_by: user,
             updated_by: user).tap do |flow|
        create(:flow_inbox_association, flow: flow, inbox: inbox)
      end
    end

    let!(:flow_keyword_other_inbox) do
      other_inbox = create(:inbox, account: account)
      create(:flow, :active, :automatic, :with_keyword,
             account: account,
             created_by: user,
             updated_by: user).tap do |flow|
        create(:flow_inbox_association, flow: flow, inbox: other_inbox)
      end
    end

    let(:message) { create(:message, account: account, conversation: conversation, content: 'I need help please') }

    it 'triggers only flows associated to the conversation inbox when keyword matches' do
      _ = flow_keyword_other_inbox
      expect(Flows::ExecutionJob).to receive(:perform_later).once.with(
        hash_including(flow_id: flow_keyword_inbox.id, conversation_id: conversation.id)
      )

      service = described_class.new(event_name: Events::Types::MESSAGE_CREATED, event_data: { message: message })
      service.perform
    end
  end

  describe 'keyword boundary matching' do
    let!(:flow_lm_inbox) do
      create(:flow, :active, :automatic,
             account: account,
             created_by: user,
             updated_by: user,
             trigger_keyword: 'lm').tap do |flow|
        create(:flow_inbox_association, flow: flow, inbox: inbox)
      end
    end

    let!(:flow_lm_other_inbox) do
      other_inbox = create(:inbox, account: account)
      create(:flow, :active, :automatic,
             account: account,
             created_by: user,
             updated_by: user,
             trigger_keyword: 'lm').tap do |flow|
        create(:flow_inbox_association, flow: flow, inbox: other_inbox)
      end
    end

    it 'does not trigger when keyword appears inside another word (helmet)' do
      msg = create(:message, account: account, conversation: conversation, content: 'helmet')

      expect(Flows::ExecutionJob).not_to receive(:perform_later)

      service = described_class.new(event_name: Events::Types::MESSAGE_CREATED, event_data: { message: msg })
      service.perform
    end

    it 'does not trigger when keyword appears inside another word (palmer)' do
      msg = create(:message, account: account, conversation: conversation, content: 'palmer')

      expect(Flows::ExecutionJob).not_to receive(:perform_later)

      service = described_class.new(event_name: Events::Types::MESSAGE_CREATED, event_data: { message: msg })
      service.perform
    end

    it 'does not trigger when keyword appears at end of another word (elm tree)' do
      msg = create(:message, account: account, conversation: conversation, content: 'elm tree')

      expect(Flows::ExecutionJob).not_to receive(:perform_later)

      service = described_class.new(event_name: Events::Types::MESSAGE_CREATED, event_data: { message: msg })
      service.perform
    end

    it 'triggers when keyword appears as a standalone token (start lm flow)' do
      msg = create(:message, account: account, conversation: conversation, content: 'start lm flow')

      _ = flow_lm_other_inbox
      expect(Flows::ExecutionJob).to receive(:perform_later).once.with(
        hash_including(flow_id: flow_lm_inbox.id, conversation_id: conversation.id)
      )

      service = described_class.new(event_name: Events::Types::MESSAGE_CREATED, event_data: { message: msg })
      service.perform
    end

    it 'triggers when keyword appears surrounded by spaces or punctuation (lm, please)' do
      msg = create(:message, account: account, conversation: conversation, content: 'lm, please')

      _ = flow_lm_other_inbox
      expect(Flows::ExecutionJob).to receive(:perform_later).once.with(
        hash_including(flow_id: flow_lm_inbox.id, conversation_id: conversation.id)
      )

      service = described_class.new(event_name: Events::Types::MESSAGE_CREATED, event_data: { message: msg })
      service.perform
    end
  end
end
