class Api::V1::Accounts::FlowEditor::TicketersController < Api::V1::Accounts::FlowEditor::BaseController
  before_action :check_authorization

  def index
    # Return ticketers in the format expected by FlowEditor
    # Map Chatwoot integrations to ticketer format
    ticketers = []

    # Check for common ticketing integrations
    if Current.account.integrations.exists?(provider: 'linear')
      ticketers << {
        uuid: SecureRandom.uuid,
        name: 'Linear',
        type: 'linear'
      }
    end

    if Current.account.integrations.exists?(provider: 'slack')
      ticketers << {
        uuid: SecureRandom.uuid,
        name: 'Slack',
        type: 'slack'
      }
    end

    # FlowEditor expects response format: { results: [...], next: null }
    render json: {
      results: ticketers,
      next: nil
    }
  end

  private

  def check_authorization
    authorize Current.account, :show?
  end
end