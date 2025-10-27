class FlowEditor::TokenService
  pattr_initialize [:payload, :token]

  def generate_token
    JWT.encode payload_with_timestamps, secret_key, 'HS256'
  end

  def decode_token
    JWT.decode(
      token, secret_key, true, algorithm: 'HS256'
    ).first.symbolize_keys
  rescue StandardError
    {}
  end

  def valid_token?
    decoded = decode_token
    return false if decoded.blank?
    
    # Check if token has expired
    return false if decoded[:exp] && Time.current.to_i > decoded[:exp]
    
    # Check required fields
    decoded[:account_id].present? && decoded[:user_id].present?
  end

  def self.generate_for_user(user, account)
    payload = {
      user_id: user.id,
      account_id: account.id,
      email: user.email,
      role: user.role,
      uid: user.uid
    }
    
    new(payload: payload).generate_token
  end

  def self.decode_and_validate(token)
    service = new(token: token)
    return nil unless service.valid_token?
    
    service.decode_token
  end

  private

  def payload_with_timestamps
    current_time = Time.current.to_i
    payload.merge(
      iat: current_time,
      exp: current_time + token_expiry_duration
    )
  end

  def secret_key
    Rails.application.secret_key_base
  end

  def token_expiry_duration
    # Token expires in 24 hours
    24.hours.to_i
  end
end