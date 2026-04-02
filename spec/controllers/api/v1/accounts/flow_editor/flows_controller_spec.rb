require 'rails_helper'

RSpec.describe Api::V1::Accounts::FlowEditor::FlowsController, type: :controller do
  let(:account) { create(:account) }
  let(:user) { create(:user, account: account) }
  let(:flow) { create(:flow, account: account, created_by: user, trigger_keyword: 'help') }

  before do
    sign_in(user)
  end

  describe 'POST #save_revision' do
    context 'when flow has existing keyword' do
      let(:flow) { create(:flow, account: account, created_by: user, trigger_keyword: 'help', trigger_type: 'automatic') }

      it 'preserves existing keyword when Floweditor sends empty keywords array' do
        # This is the bug scenario: Floweditor sends empty keywords but flow has existing keyword
        definition_with_empty_keywords = {
          'name' => 'Test Flow',
          'keywords' => [],  # Empty array - this was causing the bug
          'trigger_type' => 'automatic',
          'nodes' => [],
          'edges' => []
        }.to_json

        post :save_revision, params: {
          account_id: account.id,
          id: flow.id,
          definition: definition_with_empty_keywords
        }

        expect(response).to have_http_status(:success)
        flow.reload
        expect(flow.trigger_keyword).to eq('help') # Should preserve existing keyword
        expect(flow.trigger_type).to eq('automatic')
      end

      it 'preserves existing keyword when Floweditor sends definition without keywords key' do
        definition_without_keywords = {
          'name' => 'Test Flow',
          'trigger_type' => 'automatic',
          'nodes' => [],
          'edges' => []
        }.to_json

        post :save_revision, params: {
          account_id: account.id,
          id: flow.id,
          definition: definition_without_keywords
        }

        expect(response).to have_http_status(:success)
        flow.reload
        expect(flow.trigger_keyword).to eq('help') # Should preserve existing keyword
        expect(flow.trigger_type).to eq('automatic')
      end

      it 'updates keyword when Floweditor sends new keywords' do
        definition_with_keywords = {
          'name' => 'Test Flow',
          'keywords' => %w[support help],
          'trigger_type' => 'automatic',
          'nodes' => [],
          'edges' => []
        }.to_json

        post :save_revision, params: {
          account_id: account.id,
          id: flow.id,
          definition: definition_with_keywords
        }

        expect(response).to have_http_status(:success)
        flow.reload
        expect(flow.trigger_keyword).to eq('support') # Should update to first keyword
        expect(flow.trigger_type).to eq('automatic')
      end

      it 'ignores empty string keywords' do
        definition_with_empty_string = {
          'name' => 'Test Flow',
          'keywords' => [''],
          'trigger_type' => 'automatic',
          'nodes' => [],
          'edges' => []
        }.to_json

        post :save_revision, params: {
          account_id: account.id,
          id: flow.id,
          definition: definition_with_empty_string
        }

        expect(response).to have_http_status(:success)
        flow.reload
        expect(flow.trigger_keyword).to eq('help') # Should preserve existing keyword
        expect(flow.trigger_type).to eq('automatic')
      end
    end

    context 'when flow has no existing keyword' do
      let(:flow) { create(:flow, account: account, created_by: user, trigger_keyword: nil) }

      it 'sets keyword when Floweditor sends keywords' do
        definition_with_keywords = {
          'name' => 'Test Flow',
          'keywords' => ['support'],
          'trigger_type' => 'automatic',
          'nodes' => [],
          'edges' => []
        }.to_json

        post :save_revision, params: {
          account_id: account.id,
          id: flow.id,
          definition: definition_with_keywords
        }

        expect(response).to have_http_status(:success)
        flow.reload
        expect(flow.trigger_keyword).to eq('support')
        expect(flow.trigger_type).to eq('automatic')
      end

      it 'does not set keyword when Floweditor sends empty keywords' do
        definition_with_empty_keywords = {
          'name' => 'Test Flow',
          'keywords' => [],
          'trigger_type' => 'automatic',
          'nodes' => [],
          'edges' => []
        }.to_json

        post :save_revision, params: {
          account_id: account.id,
          id: flow.id,
          definition: definition_with_empty_keywords
        }

        expect(response).to have_http_status(:success)
        flow.reload
        expect(flow.trigger_keyword).to be_nil
        expect(flow.trigger_type).to eq('automatic')
      end
    end

    context 'trigger type handling' do
      let(:flow) { create(:flow, account: account, created_by: user, trigger_keyword: 'help', trigger_type: 'manual') }

      it 'defaults to automatic trigger type when keyword is provided but no trigger_type' do
        definition_with_keyword_only = {
          'name' => 'Test Flow',
          'keywords' => ['support'],
          'nodes' => [],
          'edges' => []
        }.to_json

        post :save_revision, params: {
          account_id: account.id,
          id: flow.id,
          definition: definition_with_keyword_only
        }

        expect(response).to have_http_status(:success)
        flow.reload
        expect(flow.trigger_keyword).to eq('support')
        expect(flow.trigger_type).to eq('automatic') # Should default to automatic
      end

      it 'preserves existing trigger type when no keyword or trigger_type provided' do
        definition_minimal = {
          'name' => 'Test Flow',
          'nodes' => [],
          'edges' => []
        }.to_json

        post :save_revision, params: {
          account_id: account.id,
          id: flow.id,
          definition: definition_minimal
        }

        expect(response).to have_http_status(:success)
        flow.reload
        expect(flow.trigger_keyword).to eq('help') # Preserved
        expect(flow.trigger_type).to eq('manual') # Preserved
      end
    end
  end
end
