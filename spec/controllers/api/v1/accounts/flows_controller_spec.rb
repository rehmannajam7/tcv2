require 'rails_helper'

RSpec.describe 'Api::V1::Accounts::FlowsController', type: :request do
  let(:account) { create(:account) }
  let(:administrator) { create(:user, account: account, role: :administrator) }
  let(:design) { { 'nodes' => [{ 'uuid' => 'node-1' }], 'edges' => [{ 'from' => 'a', 'to' => 'b' }] } }
  let(:flow) do
    create(:flow, account: account, created_by: administrator, updated_by: administrator,
                  flow_data: design.to_json)
  end

  describe 'PATCH /api/v1/accounts/:account_id/flows/:id' do
    it 'preserves flow_data when the request omits flow_data (partial update)' do
      patch "/api/v1/accounts/#{account.id}/flows/#{flow.id}",
            headers: administrator.create_new_auth_token,
            params: {
              flow: {
                name: 'Renamed flow',
                description: 'conversation flow',
                flow_type: 'conversation',
                status: 'active',
                trigger_type: 'manual',
                trigger_keyword: nil
              }
            }

      expect(response).to have_http_status(:success)
      flow.reload
      expect(JSON.parse(flow.flow_data)).to eq(design.stringify_keys)
    end

    it 'still normalizes flow_data when the client sends it explicitly as JSON' do
      new_design = { 'nodes' => [], 'edges' => [] }

      patch "/api/v1/accounts/#{account.id}/flows/#{flow.id}",
            headers: administrator.create_new_auth_token,
            params: {
              flow: {
                name: flow.name,
                flow_data: new_design.to_json
              }
            }

      expect(response).to have_http_status(:success)
      flow.reload
      expect(JSON.parse(flow.flow_data)).to eq(new_design)
    end
  end
end
