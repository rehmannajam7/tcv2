module EnsureCurrentAccountHelper
  def current_account
    Rails.logger.info "EnsureCurrentAccountHelper: current_account called"
    Rails.logger.info "EnsureCurrentAccountHelper: Current.account = #{Current.account&.id}"
    Rails.logger.info "EnsureCurrentAccountHelper: Current.user = #{Current.user&.class&.name} (ID: #{Current.user&.id})"
    
    return Current.account if Current.account.present? && Current.account_user.present?

    account_id = params[:account_id] || params[:id]
    Rails.logger.info "EnsureCurrentAccountHelper: account_id from params = #{account_id}"
    
    if Current.user.present?
      Rails.logger.info "EnsureCurrentAccountHelper: Current.user is present, finding account"
      Current.account = Current.user.accounts.find(account_id)
      Rails.logger.info "EnsureCurrentAccountHelper: Current.account set to #{Current.account&.id}"
      
      # Set up Current.account_user for authorization checks
      if Current.account.present?
        @current_account_user = Current.account.account_users.find_by(user_id: Current.user.id)
        Current.account_user = @current_account_user
        Rails.logger.info "EnsureCurrentAccountHelper: Current.account_user set to #{Current.account_user&.id}"
      end
    else
      Rails.logger.info "EnsureCurrentAccountHelper: Current.user is nil, cannot find account"
    end
    
    Current.account
  end

  def ensure_current_account
    Rails.logger.info "EnsureCurrentAccountHelper: ensure_current_account called"
    account = current_account
    Rails.logger.info "EnsureCurrentAccountHelper: account after current_account = #{account&.id}"
    
    if account.blank?
      Rails.logger.info "EnsureCurrentAccountHelper: account is blank, rendering unauthorized"
      render_unauthorized('Account not found')
    end
  end

  def account_accessible_for_user?(account, user = nil)
    user ||= current_user || Current.user
    @current_account_user = account.account_users.find_by(user_id: user.id)
    Current.account_user = @current_account_user
    render_unauthorized('You are not authorized to access this account') unless @current_account_user
  end

  def account_accessible_for_bot?(account)
    render_unauthorized('Bot is not authorized to access this account') unless @resource.agent_bot_inboxes.find_by(account_id: account.id)
  end
end
