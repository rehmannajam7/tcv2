class Api::V1::Accounts::FlowEditor::BaseController < ApplicationController
  include FlowEditorAuthHelper
  include RequestExceptionHandler
  include SwitchLocale

  respond_to :json
  before_action :authenticate_flow_editor_token!
  around_action :switch_locale_using_account_locale

  private

  def check_authorization(model = nil)
    model ||= controller_name.classify.constantize
    authorize(model)
  end

  def check_admin_authorization?
    raise Pundit::NotAuthorizedError unless Current.account_user.administrator?
  end
end
