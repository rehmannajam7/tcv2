class ApplicationController < ActionController::Base
  include DeviseTokenAuth::Concerns::SetUserByToken
  include RequestExceptionHandler
  include Pundit::Authorization
  include SwitchLocale

  skip_before_action :verify_authenticity_token

  before_action :log_request_info
  before_action :set_current_user, unless: :devise_controller?
  around_action :switch_locale
  around_action :handle_with_exception, unless: :devise_controller?

  private

  def log_request_info
    Rails.logger.info "ApplicationController: #{request.method} #{request.path} - Headers: #{request.headers['api_access_token'].present? ? 'api_access_token present' : 'no api_access_token'}"
  end

  def set_current_user
    @user ||= current_user
    Current.user = @user
  end

  def pundit_user
    {
      user: Current.user,
      account: Current.account,
      account_user: Current.account_user
    }
  end
end
ApplicationController.include_mod_with('Concerns::ApplicationControllerConcern')
