class Api::V1::Accounts::FlowEditor::TemplatesController < Api::V1::Accounts::FlowEditor::BaseController
  before_action :check_authorization

  def index
    # Return templates in the format expected by FlowEditor
    # Map Chatwoot canned responses to template format
    templates = Current.account.canned_responses.map do |canned_response|
      {
        name: canned_response.short_code,
        uuid: SecureRandom.uuid,
        created_on: canned_response.created_at.iso8601,
        modified_on: canned_response.updated_at.iso8601,
        translations: [
          {
            channel: {
              uuid: SecureRandom.uuid,
              name: 'Default'
            },
            language: 'eng',
            content: canned_response.content,
            variable_count: canned_response.content.scan(/\{\{[^}]+\}\}/).count,
            status: 'approved',
            namespace: 'default'
          }
        ]
      }
    end

    # FlowEditor expects response format: { results: [...], next: null }
    render json: {
      results: templates,
      next: nil
    }
  end

  private

  def check_authorization
    authorize Current.account, :show?
  end
end