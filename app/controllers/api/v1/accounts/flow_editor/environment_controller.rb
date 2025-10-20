class Api::V1::Accounts::FlowEditor::EnvironmentController < Api::V1::Accounts::BaseController
  before_action :check_authorization

  def index
    # Return environment data in the format expected by FlowEditor
    environment = {
      date_style: 'day_first',
      time_zone: 'UTC',
      allowed_languages: ['eng', 'spa', 'fra', 'por'],
      redaction_policy: 'none',
      input_collation: 'default'
    }

    # FlowEditor expects response format: { results: [...], next: null }
    render json: {
      results: environment,
      next: nil
    }
  end

  private

  def check_authorization
    authorize Current.account, :show?
  end
end