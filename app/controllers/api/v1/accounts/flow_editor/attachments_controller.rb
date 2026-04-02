class Api::V1::Accounts::FlowEditor::AttachmentsController < Api::V1::Accounts::FlowEditor::BaseController
  include ::FileTypeHelper

  def index
    render json: { results: [], next: nil }
  end

  def create
    uploaded_file = params[:file]
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
      url: url_for(blob)
    }
  rescue StandardError => e
    Rails.logger.error "FlowEditor attachment upload error: #{e.message}"
    render json: { error: e.message }, status: :internal_server_error
  end
end
