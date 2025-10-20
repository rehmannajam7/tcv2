class Api::V1::Accounts::FlowEditor::ClassifiersController < Api::V1::Accounts::BaseController
  before_action :check_authorization

  def index
    # Return classifiers in the format expected by FlowEditor
    # For now, return empty array as Chatwoot doesn't have built-in classifiers
    # This can be extended to integrate with ML classification services
    classifiers = []

    # FlowEditor expects response format: { results: [...], next: null }
    render json: {
      results: classifiers,
      next: nil
    }
  end

  private

  def check_authorization
    authorize Current.account, :show?
  end
end