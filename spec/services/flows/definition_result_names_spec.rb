require 'rails_helper'

RSpec.describe Flows::DefinitionResultNames do
  it 'returns router result_name values' do
    data = {
      'nodes' => [
        { 'uuid' => '1', 'router' => { 'result_name' => 'Result 1' } }
      ]
    }
    expect(described_class.call(data)).to eq(['Result 1'])
  end

  it 'returns set_run_result action names' do
    data = {
      'nodes' => [
        {
          'uuid' => '1',
          'actions' => [{ 'type' => 'set_run_result', 'name' => 'my_var' }]
        }
      ]
    }
    expect(described_class.call(data)).to eq(['my_var'])
  end

  it 'parses JSON string input' do
    json = { 'nodes' => [{ 'router' => { 'result_name' => 'A' } }] }.to_json
    expect(described_class.call(json)).to eq(['A'])
  end
end
