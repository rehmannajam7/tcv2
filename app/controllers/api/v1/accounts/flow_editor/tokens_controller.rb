class Api::V1::Accounts::FlowEditor::TokensController < Api::V1::Accounts::BaseController
  before_action :check_authorization

  def show
    # Generate a JWT token for FlowEditor authentication using the service
    token = FlowEditor::TokenService.generate_for_user(Current.user, Current.account)

    render json: {
      token: token,
      account_id: Current.account.id,
      user_id: Current.user.id,
      user_email: Current.user.email,
      expires_at: 24.hours.from_now.iso8601
    }
  end

  def refresh
    # Refresh endpoint for token renewal
    token = FlowEditor::TokenService.generate_for_user(Current.user, Current.account)

    render json: {
      token: token,
      account_id: Current.account.id,
      user_id: Current.user.id,
      user_email: Current.user.email,
      expires_at: 24.hours.from_now.iso8601
    }
  end

  private

  def check_authorization
    authorize Current.account, :show?
  end
end