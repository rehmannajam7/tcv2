require 'rails_helper'

RSpec.describe Api::V1::Accounts::FlowEditor::FlowsController, type: :controller do
  let(:account) { create(:account) }
  let(:user) { create(:user, account: account, role: :administrator) }
  let(:inbox) { create(:inbox, account: account) }
  let(:flow_editor_token) { FlowEditor::TokenService.generate_for_user(user, account) }

  before do
    request.headers['X-FlowEditor-Token'] = flow_editor_token
  end

  describe 'GET #show returns inboxAssociations in definition' do
    let!(:flow) do
      create(:flow, :active, account: account, created_by: user, updated_by: user).tap do |f|
        create(:flow_inbox_association, flow: f, inbox: inbox)
      end
    end

    it 'includes inboxAssociations array with linked inbox ids' do
      get :show, params: { account_id: account.id, id: flow.id }
      expect(response).to have_http_status(:success)
      body = response.parsed_body
      definition = body['results'].first['definition']
      expect(definition).to be_present
      inbox_assoc = definition['inboxAssociations']
      expect(inbox_assoc).to be_an(Array)
      expect(inbox_assoc).to include(inbox.id.to_s)
    end
  end

  describe 'GET #variable_completions' do
    let(:flow) do
      create(:flow, account: account, created_by: user, updated_by: user,
                    flow_data: {
                      'nodes' => [{ 'uuid' => 'x', 'router' => { 'result_name' => 'Result 1' } }]
                    }.to_json)
    end

    it 'returns @results.* suggestions for FlowEditor autocomplete clients' do
      get :variable_completions, params: { account_id: account.id, id: flow.id, q: '@results.' }
      expect(response).to have_http_status(:success)
      body = response.parsed_body
      inserts = body['results'].map { |r| r['insert'] }
      expect(inserts).to include('@results.Result 1', '@results.Result 1.value')
    end
  end
end
