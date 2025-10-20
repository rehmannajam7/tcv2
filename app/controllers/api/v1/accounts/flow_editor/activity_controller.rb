class Api::V1::Accounts::FlowEditor::ActivityController < Api::V1::Accounts::BaseController
  # Skip authentication for flow editor endpoints to allow direct access
  skip_before_action :authenticate_user!, only: [:index]
  skip_before_action :authenticate_access_token!, only: [:index]
  skip_before_action :validate_bot_access_token!, only: [:index]
  skip_before_action :current_account, only: [:index]

  def index
    # Return activity data in the format expected by FlowEditor
    # This could include recent flow executions, user activities, etc.
    activities = []

    # For now, return empty activity data
    # In a real implementation, you might want to track flow executions,
    # user interactions, or other relevant activities
    
    # FlowEditor expects response format: { results: [...], next: null }
    render json: {
      results: activities,
      next: nil
    }
  end

  private

  # Remove the check_authorization method since we're skipping authentication
end