class Api::V1::Accounts::FlowEditor::AccountsController < Api::V1::Accounts::FlowEditor::BaseController
  before_action :check_authorization

  def context
    render json: {
      account: {
        id: Current.account.id,
        name: Current.account.name
      },
      user: {
        id: Current.user.id,
        name: Current.user.name,
        email: Current.user.email
      },
      flows: Current.account.flows.order(:name).map do |flow|
        {
          id: flow.id,
          name: flow.name,
          description: flow.description,
          created_at: flow.created_at,
          updated_at: flow.updated_at
        }
      end
    }
  end

  private

  def check_authorization
    authorize(Current.account, :show?)
  end
end
