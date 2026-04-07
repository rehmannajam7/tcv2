require 'rails_helper'

RSpec.describe Flows::VariableCompletionExtractor do
  describe '.extract_result_names' do
    it 'collects router result_name from nodes' do
      definition = {
        'nodes' => [
          { 'uuid' => 'n1', 'router' => { 'result_name' => 'Result 1' } }
        ]
      }
      expect(described_class.extract_result_names(definition)).to eq(['Result 1'])
    end

    it 'collects set_run_result action names' do
      definition = {
        'nodes' => [
          {
            'uuid' => 'n2',
            'actions' => [{ 'type' => 'set_run_result', 'name' => 'MyVar' }]
          }
        ]
      }
      expect(described_class.extract_result_names(definition)).to eq(['MyVar'])
    end
  end

  describe '.suggestions' do
    it 'includes shorthand and field-specific inserts' do
      definition = { 'nodes' => [{ 'router' => { 'result_name' => 'Result 1' } }] }
      rows = described_class.suggestions(definition, '@results.')
      inserts = rows.map { |r| r[:insert] }
      expect(inserts).to include('@results.Result 1', '@results.Result 1.value')
    end
  end
end
