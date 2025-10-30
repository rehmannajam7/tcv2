class Api::V1::Accounts::FlowEditor::ChannelsController < Api::V1::Accounts::FlowEditor::BaseController
  def index
    Rails.logger.info "ChannelsController: index action called for account #{Current.account&.id}"

    # Get all inboxes for the current account
    inboxes = Current.account.inboxes.includes(:channel)

    # Convert inboxes to FlowEditor channel format
    channels = inboxes.map do |inbox|
      channel = inbox.channel

      # Determine schemes based on channel type
      schemes = case channel.class.name
                when 'Channel::WebWidget'
                  ['webchat']
                when 'Channel::Whatsapp'
                  ['whatsapp']
                when 'Channel::Telegram'
                  ['telegram']
                when 'Channel::Email'
                  ['email']
                when 'Channel::Sms'
                  %w[tel sms]
                when 'Channel::Api'
                  ['api']
                else
                  ['generic']
                end

      {
        uuid: inbox.id.to_s,
        name: inbox.name,
        address: channel.try(:phone_number) || channel.try(:email) || channel.try(:webhook_url) || 'N/A',
        schemes: schemes,
        roles: %w[send receive]
      }
    end

    Rails.logger.info "ChannelsController: returning #{channels.length} channels: #{channels.map { |c| c[:name] }}"

    # FlowEditor expects response format: { results: [...], next: null }
    render json: {
      results: channels,
      next: nil
    }
  rescue StandardError => e
    Rails.logger.error "ChannelsController error: #{e.message}"
    Rails.logger.error e.backtrace.join("\n")
    render json: { error: e.message }, status: :internal_server_error
  end
end
