class Api::V1::Accounts::FlowEditor::ChannelsController < ApplicationController
  def index
    Rails.logger.info "ChannelsController: index action called"
    
    # Return channels in the format expected by FlowEditor
    channels = [
      {
        uuid: SecureRandom.uuid,
        name: 'Default Channel',
        address: 'N/A',
        schemes: ['tel', 'whatsapp'],
        roles: ['send', 'receive']
      }
    ]

    Rails.logger.info "ChannelsController: returning channels: #{channels}"

    # FlowEditor expects response format: { results: [...], next: null }
    render json: {
      results: channels,
      next: nil
    }
  rescue => e
    Rails.logger.error "ChannelsController error: #{e.message}"
    Rails.logger.error e.backtrace.join("\n")
    render json: { error: e.message }, status: 500
  end
end