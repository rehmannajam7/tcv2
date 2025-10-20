class Api::V1::Accounts::FlowEditor::EditorController < Api::V1::Accounts::BaseController
  # Skip authentication for flow editor endpoints to allow direct access
  skip_before_action :authenticate_user!, only: [:index]
  skip_before_action :authenticate_access_token!, only: [:index]
  skip_before_action :validate_bot_access_token!, only: [:index]
  skip_before_action :current_account, only: [:index]

  def index
    # Return editor configuration data in the format expected by FlowEditor
    editor_config = {
      version: '1.0.0',
      features: {
        flows: true,
        contacts: true,
        groups: true,
        fields: true,
        labels: true,
        channels: true,
        templates: true,
        resthooks: true,
        ticketers: true,
        classifiers: false,
        completion: true,
        activity: true
      },
      limits: {
        max_flows: 100,
        max_nodes_per_flow: 500,
        max_actions_per_node: 10
      },
      branding: {
        name: 'ThumbCrowd FlowEditor',
        logo: nil
      }
    }

    # FlowEditor expects response format: { results: [...], next: null }
    render json: {
      results: [editor_config],
      next: nil
    }
  end

  private

  # Remove the check_authorization method since we're skipping authentication
end