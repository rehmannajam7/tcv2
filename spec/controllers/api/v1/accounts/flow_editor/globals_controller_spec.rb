require 'rails_helper'

RSpec.describe Api::V1::Accounts::FlowEditor::GlobalsController, type: :controller do
  let(:account) { create(:account) }
  let(:user) { create(:user, account: account, role: :administrator) }
  let(:flow_editor_token) { FlowEditor::TokenService.generate_for_user(user, account) }

  before do
    request.headers['X-FlowEditor-Token'] = flow_editor_token
  end

  describe 'GET #index' do
    it 'returns base globals' do
      get :index, params: { account_id: account.id }
      expect(response).to have_http_status(:success)
      body = response.parsed_body
      keys = body['results'].map { |g| g['key'] }
      expect(keys).to include('account_name', 'account_id', 'support_email')
    end

    it 'appends flow result variables when flow_id is present' do
      definition = {
        'nodes' => [
          { 'uuid' => 'n1', 'router' => { 'result_name' => 'Result 1' } }
        ]
      }
      flow = create(:flow, account: account, created_by: user, updated_by: user, flow_data: definition.to_json)

      get :index, params: { account_id: account.id, flow_id: flow.id }
      expect(response).to have_http_status(:success)
      body = response.parsed_body
      result_globals = body['results'].select { |g| g['namespace'] == 'results' }
      expect(result_globals.length).to eq(1)
      expect(result_globals.first['value']).to eq('@results.Result 1')
      expect(result_globals.first['result_name']).to eq('Result 1')
    end
  end
end
