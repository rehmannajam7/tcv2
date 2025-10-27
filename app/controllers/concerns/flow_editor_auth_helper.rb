module FlowEditorAuthHelper
  extend ActiveSupport::Concern

  def authenticate_flow_editor_token!
    Rails.logger.info "FlowEditorAuthHelper: authenticate_flow_editor_token! called"
    
    token = extract_flow_editor_token
    Rails.logger.info "FlowEditorAuthHelper: Token extracted: #{token.present? ? 'present' : 'not present'}"
    
    if token.blank?
      Rails.logger.info "FlowEditorAuthHelper: No token found, rendering unauthorized"
      render_unauthorized('FlowEditor token is required')
      return
    end

    decoded_payload = FlowEditor::TokenService.decode_and_validate(token)
    Rails.logger.info "FlowEditorAuthHelper: Decoded payload: #{decoded_payload.present? ? 'valid' : 'invalid'}"
    
    if decoded_payload.blank?
      Rails.logger.info "FlowEditorAuthHelper: Invalid token, rendering unauthorized"
      render_unauthorized('Invalid or expired FlowEditor token')
      return
    end

    # Set up Current context from JWT payload
    setup_current_context_from_token(decoded_payload)
    Rails.logger.info "FlowEditorAuthHelper: Current context set - User: #{Current.user&.id}, Account: #{Current.account&.id}"
  end

  private

  def extract_flow_editor_token
    # Check Authorization header first (Bearer token)
    auth_header = request.headers['Authorization']
    if auth_header&.start_with?('Bearer ')
      return auth_header.sub('Bearer ', '')
    end

    # Check X-FlowEditor-Token header
    flow_editor_token = request.headers['X-FlowEditor-Token']
    return flow_editor_token if flow_editor_token.present?

    # Check query parameter (for iframe requests)
    params[:token]
  end

  def setup_current_context_from_token(payload)
    # Find user and account from JWT payload
    user = User.find_by(id: payload[:user_id])
    account = Account.find_by(id: payload[:account_id])
    
    if user.blank? || account.blank?
      Rails.logger.error "FlowEditorAuthHelper: User or Account not found - User: #{payload[:user_id]}, Account: #{payload[:account_id]}"
      render_unauthorized('Invalid user or account in token')
      return
    end

    # Verify user has access to account
    account_user = account.account_users.find_by(user_id: user.id)
    if account_user.blank?
      Rails.logger.error "FlowEditorAuthHelper: User #{user.id} does not have access to account #{account.id}"
      render_unauthorized('User does not have access to this account')
      return
    end

    # Set Current context
    Current.user = user
    Current.account = account
    Current.account_user = account_user
    
    Rails.logger.info "FlowEditorAuthHelper: Successfully set Current context"
  end

  def render_unauthorized(message)
    render json: { error: message }, status: :unauthorized
  end
end