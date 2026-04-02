require 'rails_helper'

RSpec.describe Api::V1::Accounts::FlowEditor::FlowsController, type: :controller do
  let(:account) { create(:account) }
  let(:user) { create(:user, account: account, role: :administrator) }
  let(:flow_editor_token) { FlowEditor::TokenService.generate_for_user(user, account) }
  let(:inbox1) { create(:inbox, account: account) }
  let(:inbox2) { create(:inbox, account: account) }
  let(:flow) { create(:flow, account: account, created_by: user, trigger_keyword: 'new', trigger_type: 'automatic') }

  before do
    request.headers['X-FlowEditor-Token'] = flow_editor_token
    # Seed initial inbox associations
    flow.flow_inbox_associations.create!(inbox: inbox1)
    flow.flow_inbox_associations.create!(inbox: inbox2)
    flow.reload
  end

  describe 'POST #save_revision inbox associations preservation' do
    it 'preserves existing inbox associations when inboxAssociations key is omitted' do
      definition_without_inbox = {
        'name' => 'Test Flow',
        'keywords' => ['new'],
        'trigger_type' => 'automatic',
        'nodes' => [],
        'edges' => []
      }.to_json

      post :save_revision, params: {
        account_id: account.id,
        id: flow.id,
        definition: definition_without_inbox
      }

      expect(response).to have_http_status(:success)
      flow.reload
      expect(flow.inboxes.pluck(:id).sort).to eq([inbox1.id, inbox2.id].sort)
    end

    it 'updates inbox associations when inboxAssociations array is provided' do
      definition_with_inbox = {
        'name' => 'Test Flow',
        'keywords' => ['new'],
        'trigger_type' => 'automatic',
        'inboxAssociations' => [inbox1.id.to_s],
        'nodes' => [],
        'edges' => []
      }.to_json

      post :save_revision, params: {
        account_id: account.id,
        id: flow.id,
        definition: definition_with_inbox
      }

      expect(response).to have_http_status(:success)
      flow.reload
      expect(flow.inboxes.pluck(:id).sort).to eq([inbox1.id].sort)
    end
  end
end
