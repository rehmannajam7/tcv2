class Api::V1::Accounts::FlowEditor::ResthooksController < Api::V1::Accounts::FlowEditor::BaseController
  before_action :check_authorization

  def index
    # Return resthooks (webhooks) in the format expected by FlowEditor
    # Map Chatwoot webhooks to resthook format
    resthooks = Current.account.webhooks.map do |webhook|
      {
        resthook: webhook.webhook_url,
        created_on: webhook.created_at.iso8601,
        modified_on: webhook.updated_at.iso8601
      }
    end

    # FlowEditor expects response format: { results: [...], next: null }
    render json: {
      results: resthooks,
      next: nil
    }
  end

  private

  def check_authorization
    authorize Current.account, :show?
  end
end