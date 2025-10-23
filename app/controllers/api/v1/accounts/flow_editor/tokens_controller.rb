class Api::V1::Accounts::FlowEditor::TokensController < Api::V1::Accounts::BaseController
  before_action :check_authorization

  def show
    # Generate a JWT token for FlowEditor authentication
    payload = {
      account_id: Current.account.id,
      user_id: Current.user.id,
      user_email: Current.user.email,
      exp: 24.hours.from_now.to_i, # Token expires in 24 hours
      iat: Time.current.to_i
    }

    # Use Rails secret key base for JWT signing
    secret_key = Rails.application.secret_key_base
    token = JWT.encode(payload, secret_key, 'HS256')

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