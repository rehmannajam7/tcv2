class Api::V1::Accounts::FlowEditor::AttachmentsController < Api::V1::Accounts::FlowEditor::BaseController
  include ::FileTypeHelper

  def index
    render json: { results: [], next: nil }
  end

  def create
    uploaded_file = params[:file] || params[:attachment] || params[:upload]
    unless uploaded_file
      render json: { error: 'No file provided' }, status: :unprocessable_entity
      return
    end

    blob = ActiveStorage::Blob.create_and_upload!(
      io: uploaded_file.tempfile,
      filename: uploaded_file.original_filename,
      content_type: uploaded_file.content_type
    )

    render json: {
      type: uploaded_file.content_type,
      url: absolute_blob_url(blob)
    }
  rescue StandardError => e
    Rails.logger.error "FlowEditor attachment upload error: #{e.message}"
    render json: { error: e.message }, status: :internal_server_error
  end

  private

  # Editor iframe often runs on another origin/port; relative ActiveStorage paths break there.
  def absolute_blob_url(blob)
    base = ENV.fetch('FRONTEND_URL', nil).presence
    if base.present?
      u = URI.parse(base)
      opts = { host: u.host, protocol: u.scheme }
      opts[:port] = u.port unless [80, 443].include?(u.port)
      Rails.application.routes.url_helpers.rails_blob_url(blob, **opts)
    else
      url_for(blob)
    end
  rescue URI::InvalidURIError, ArgumentError, ActionController::UrlGenerationError => e
    Rails.logger.warn "FlowEditor attachments: falling back to url_for blob (#{e.message})"
    url_for(blob)
  end
end
