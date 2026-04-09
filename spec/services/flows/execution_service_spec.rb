require 'rails_helper'

RSpec.describe Flows::ExecutionService do
  include Events::Types

  let(:account) { create(:account) }
  let(:inbox) { create(:inbox, account: account) }
  let(:conversation) { create(:conversation, account: account, inbox: inbox) }
  let(:contact) { conversation.contact }
  let(:flow) { create(:flow, :active, account: account) }
  let(:user) { create(:user, account: account) }

  describe '#resume_flow_execution' do
    let(:flow_definition) do
      {
        'uuid' => 'flow-123',
        'nodes' => [
          {
            'uuid' => 'node-1',
            'type' => 'send_msg',
            'text' => 'What is your choice?',
            'wait' => { 'type' => 'msg' },
            'exits' => [
              { 'uuid' => 'exit-node-1', 'destination_uuid' => 'node-2' }
            ]
          },
          {
            'uuid' => 'node-2',
            'type' => 'switch',
            'router' => {
              'cases' => [
                {
                  'uuid' => 'case-1',
                  'type' => 'has_any_word',
                  'arguments' => %w[yes yeah],
                  'category_uuid' => 'cat-yes'
                },
                {
                  'uuid' => 'case-2',
                  'type' => 'has_any_word',
                  'arguments' => %w[no nope],
                  'category_uuid' => 'cat-no'
                }
              ],
              'categories' => [
                {
                  'uuid' => 'cat-yes',
                  'name' => 'Yes',
                  'exit_uuid' => 'exit-yes'
                },
                {
                  'uuid' => 'cat-no',
                  'name' => 'No',
                  'exit_uuid' => 'exit-no'
                }
              ]
            },
            'exits' => [
              { 'uuid' => 'exit-yes', 'destination_uuid' => 'node-3' },
              { 'uuid' => 'exit-no', 'destination_uuid' => 'node-4' }
            ]
          },
          {
            'uuid' => 'node-3',
            'type' => 'send_msg',
            'text' => 'You said yes!',
            'exits' => [
              { 'uuid' => 'exit-node-3', 'destination_uuid' => nil }
            ]
          },
          {
            'uuid' => 'node-4',
            'type' => 'send_msg',
            'text' => 'You said no!',
            'exits' => [
              { 'uuid' => 'exit-node-4', 'destination_uuid' => nil }
            ]
          }
        ],
        'exits' => [
          { 'uuid' => 'exit-yes', 'destination_uuid' => 'node-3' },
          { 'uuid' => 'exit-no', 'destination_uuid' => 'node-4' }
        ]
      }
    end

    let(:execution) do
      create(:flow_execution,
             flow: flow,
             conversation: conversation,
             contact: contact,
             account: account,
             status: :pending,
             context: {
               'current_node_uuid' => 'node-1',
               'flow_definition' => flow_definition,
               'paused_at' => 1.minute.ago,
               'context' => {}
             })
    end

    let(:trigger_data) do
      {
        resume_execution_id: execution.id,
        resume_context: execution.context
      }
    end

    let(:service) { described_class.new(flow: flow, conversation: conversation, trigger_data: trigger_data) }

    before do
      allow(flow).to receive(:flow_data).and_return(flow_definition.to_json)
    end

    context 'when user responds with "yes"' do
      let!(:message) { create(:message, conversation: conversation, content: 'yes', message_type: :incoming) }

      it 'routes to the "yes" branch' do
        expect(service).to receive(:execute_node).with(
          hash_including('uuid' => 'node-3'),
          anything,
          anything
        ).and_call_original

        service.perform

        execution.reload
        puts "Execution results: #{execution.results.inspect}"
        puts "Execution status: #{execution.status}"
        expect(execution.status).to eq('completed')
        expect(execution.results['wait_result']).to include(
          'category_name' => 'Yes',
          'value' => 'yes'
        )
      end
    end

    context 'when user responds with "no"' do
      let!(:message) { create(:message, conversation: conversation, content: 'no', message_type: :incoming) }

      it 'routes to the "no" branch' do
        expect(service).to receive(:execute_node).with(
          hash_including('uuid' => 'node-4'),
          anything,
          anything
        ).and_call_original

        service.perform

        execution.reload
        expect(execution.status).to eq('completed')
        expect(execution.results['wait_result']).to include(
          'category_name' => 'No',
          'value' => 'no'
        )
      end
    end

    context 'when user responds with unrecognized input' do
      let!(:message) { create(:message, conversation: conversation, content: 'maybe', message_type: :incoming) }

      it 'uses default routing' do
        service.perform

        execution.reload
        expect(execution.status).to eq('completed')
        # Should still capture the response
        expect(execution.results['wait_result']['value']).to eq('maybe')
      end
    end
  end

  describe '#resume_from_wait' do
    let(:flow_definition) do
      {
        'uuid' => 'flow-123',
        'nodes' => [
          {
            'uuid' => 'node-1',
            'type' => 'send_msg',
            'text' => 'Choose: 1 for yes, 2 for no',
            'wait' => { 'type' => 'msg' },
            'exits' => [
              { 'uuid' => 'exit-node-1', 'destination_uuid' => 'node-2' }
            ]
          },
          {
            'uuid' => 'node-2',
            'type' => 'switch',
            'router' => {
              'cases' => [
                {
                  'uuid' => 'case-1',
                  'type' => 'has_number_eq',
                  'arguments' => ['1'],
                  'category_uuid' => 'cat-yes'
                },
                {
                  'uuid' => 'case-2',
                  'type' => 'has_number_eq',
                  'arguments' => ['2'],
                  'category_uuid' => 'cat-no'
                }
              ],
              'categories' => [
                {
                  'uuid' => 'cat-yes',
                  'name' => 'Yes',
                  'exit_uuid' => 'exit-yes'
                },
                {
                  'uuid' => 'cat-no',
                  'name' => 'No',
                  'exit_uuid' => 'exit-no'
                }
              ]
            },
            'exits' => [
              { 'uuid' => 'exit-yes', 'destination_uuid' => 'node-3' },
              { 'uuid' => 'exit-no', 'destination_uuid' => 'node-4' }
            ]
          },
          {
            'uuid' => 'node-3',
            'type' => 'send_msg',
            'text' => 'You chose yes!',
            'exits' => [
              { 'uuid' => 'exit-node-3', 'destination_uuid' => nil }
            ]
          },
          {
            'uuid' => 'node-4',
            'type' => 'send_msg',
            'text' => 'You chose no!',
            'exits' => [
              { 'uuid' => 'exit-node-4', 'destination_uuid' => nil }
            ]
          }
        ],
        'exits' => [
          { 'uuid' => 'exit-yes', 'destination_uuid' => 'node-3' },
          { 'uuid' => 'exit-no', 'destination_uuid' => 'node-4' }
        ]
      }
    end

    let(:execution) do
      create(:flow_execution,
             flow: flow,
             conversation: conversation,
             contact: contact,
             account: account,
             status: :pending,
             context: {
               'current_node_uuid' => 'node-1',
               'flow_definition' => flow_definition,
               'paused_at' => 1.minute.ago
             })
    end

    let(:service) { described_class.new(flow: flow, conversation: conversation, trigger_data: {}) }

    before do
      allow(flow).to receive(:flow_data).and_return(flow_definition.to_json)
    end

    context 'when user responds with "1"' do
      let!(:message) { create(:message, conversation: conversation, content: '1', message_type: :incoming) }

      it 'routes to the "yes" branch and captures result' do
        service.send(:resume_from_wait, execution: execution, message: message)

        execution.reload
        expect(execution.status).to eq('completed')
        expect(execution.results['wait_result']).to include(
          'category_name' => 'Yes',
          'value' => '1'
        )
      end
    end

    context 'when user responds with "2"' do
      let!(:message) { create(:message, conversation: conversation, content: '2', message_type: :incoming) }

      it 'routes to the "no" branch and captures result' do
        service.send(:resume_from_wait, execution: execution, message: message)

        execution.reload
        expect(execution.status).to eq('completed')
        expect(execution.results['wait_result']).to include(
          'category_name' => 'No',
          'value' => '2'
        )
      end
    end
  end

  describe 'wait-for-response timeout handling' do
    let(:flow_definition) do
      {
        'uuid' => 'flow-123',
        'nodes' => [
          {
            'uuid' => 'node-1',
            'type' => 'send_msg',
            'text' => 'Please respond within 15 minutes',
            'wait' => { 'type' => 'msg', 'timeout_seconds' => 900 }
          },
          {
            'uuid' => 'node-2',
            'type' => 'switch',
            'router' => {
              'wait' => { 'timeout_seconds' => 900 },
              'categories' => [
                {
                  'uuid' => 'cat-default',
                  'name' => 'Default',
                  'exit_uuid' => 'exit-default'
                }
              ]
            }
          },
          {
            'uuid' => 'node-3',
            'type' => 'send_msg',
            'text' => 'Timeout reached'
          }
        ],
        'exits' => [
          { 'uuid' => 'exit-default', 'destination_uuid' => 'node-3' }
        ]
      }
    end

    let(:execution) do
      create(:flow_execution,
             flow: flow,
             conversation: conversation,
             contact: contact,
             account: account,
             status: :pending,
             context: {
               'current_node_uuid' => 'node-1',
               'flow_definition' => flow_definition,
               'paused_at' => 20.minutes.ago # Timeout exceeded
             })
    end

    let(:service) { described_class.new(flow: flow, conversation: conversation, trigger_data: {}) }

    before do
      allow(flow).to receive(:flow_data).and_return(flow_definition.to_json)
    end

    it 'handles timeout correctly' do
      service.send(:resume_from_wait, execution: execution)

      execution.reload
      expect(execution.status).to eq('completed')
    end
  end

  describe 'flow variable @conversation.standard_handoff' do
    let(:service) { described_class.new(flow: flow, conversation: conversation, trigger_data: {}) }

    it 'substitutes with the shared default handoff phrase' do
      result = service.send(:replace_variables, 'Before @conversation.standard_handoff After', {})
      expect(result).to include(I18n.t('conversations.captain.handoff'))
      expect(result).not_to include('standard_handoff')
    end
  end

  describe '@results variable substitution' do
    let(:service) { described_class.new(flow: flow, conversation: conversation, trigger_data: {}) }
    let(:execution) do
      create(:flow_execution,
             flow: flow,
             conversation: conversation,
             contact: contact,
             account: account,
             status: :running,
             results: {
               'Result 1' => {
                 'value' => 'one',
                 'input' => 'one',
                 'category' => 'Option O'
               }
             })
    end

    before do
      allow(service).to receive(:current_flow_execution).and_return(execution)
    end

    it 'resolves @results.<name> shorthand to the stored value' do
      out = service.send(:replace_variables, 'You said @results.Result 1', {})
      expect(out).to eq('You said one')
    end

    it 'still resolves explicit @results.<name>.value' do
      out = service.send(:replace_variables, 'You said @results.Result 1.value', {})
      expect(out).to eq('You said one')
    end

    it 'resolves shorthand in resolve_operand_value' do
      v = service.send(:resolve_operand_value, '@results.Result 1', nil, {})
      expect(v).to eq('one')
    end
  end
end
