class Api::V1::Accounts::FlowEditor::CompletionController < Api::V1::Accounts::FlowEditor::BaseController
  before_action :check_authorization

  def index
    # Return completion configuration in the format expected by FlowEditor
    # This endpoint typically provides AI completion settings and capabilities
    completion_config = {
      enabled: false, # Set to true if AI completion is available
      models: [],     # Available AI models
      max_tokens: 0,  # Maximum tokens per completion
      temperature: 0.7 # Default temperature for completions
    }

    # Check if OpenAI or other AI integrations are configured
    if Rails.application.credentials.dig(:openai, :api_key).present?
      completion_config[:enabled] = true
      completion_config[:models] = ['gpt-3.5-turbo', 'gpt-4']
      completion_config[:max_tokens] = 2048
    end

    # FlowEditor expects response format: { results: [...], next: null }
    render json: {
      results: completion_config,
      next: nil
    }
  end

  private

  def check_authorization
    authorize Current.account, :show?
  end
end