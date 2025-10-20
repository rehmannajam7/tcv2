class Api::V1::Accounts::FlowEditor::LabelsController < Api::V1::Accounts::BaseController
  before_action :check_authorization

  def index
    # Return labels in the format expected by FlowEditor
    labels = Current.account.labels.map do |label|
      {
        uuid: SecureRandom.uuid,
        name: label.title,
        count: label.conversations.count
      }
    end

    # FlowEditor expects response format: { results: [...], next: null }
    render json: {
      results: labels,
      next: nil
    }
  end

  private

  def check_authorization
    authorize :label, :index?
  end
end