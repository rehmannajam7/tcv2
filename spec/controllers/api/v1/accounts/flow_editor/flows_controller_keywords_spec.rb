require 'rails_helper'

RSpec.describe Api::V1::Accounts::FlowEditor::FlowsController, type: :controller do
  let(:account) { create(:account) }
  let(:user) { create(:user, account: account, role: :administrator) }
  let(:flow_editor_token) { FlowEditor::TokenService.generate_for_user(user, account) }

  before do
    request.headers['X-FlowEditor-Token'] = flow_editor_token
  end

  describe 'GET #show returns keywords in definition' do
    context 'when flow has trigger_keyword set' do
      let!(:flow) { create(:flow, :active, :automatic, :with_keyword, account: account, created_by: user, updated_by: user) }

      it 'includes keywords array populated from trigger_keyword' do
        get :show, params: { account_id: account.id, id: flow.id }
        expect(response).to have_http_status(:success)
        body = response.parsed_body
        definition = body['results'].first['definition']
        expect(definition).to be_present
        expect(definition['keywords']).to be_an(Array)
        expect(definition['keywords']).to include(flow.trigger_keyword)
      end
    end

    context 'when flow_data contains keywords array' do
      let!(:flow) do
        create(:flow, :active, account: account, created_by: user, updated_by: user, flow_data: { keywords: ['assist', ''] }.to_json)
      end

      it 'normalizes keywords by trimming blanks and surfaces them' do
        get :show, params: { account_id: account.id, id: flow.id }
        expect(response).to have_http_status(:success)
        body = response.parsed_body
        definition = body['results'].first['definition']
        expect(definition).to be_present
        expect(definition['keywords']).to eq(['assist'])
      end
    end
  end
end
