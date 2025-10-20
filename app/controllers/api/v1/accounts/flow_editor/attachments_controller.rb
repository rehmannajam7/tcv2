class Api::V1::Accounts::FlowEditor::AttachmentsController < ApplicationController
  def index
    Rails.logger.info "AttachmentsController: index action called"
    
    # Return attachments in the format expected by FlowEditor
    # This could include uploaded files, images, documents, etc.
    attachments = []

    # In a real implementation, you might want to:
    # - List uploaded files from ActiveStorage
    # - Include media files from conversations
    # - Provide file metadata (size, type, URL)
    
    # For now, return empty array as FlowEditor can work without attachments
    Rails.logger.info "AttachmentsController: returning attachments: #{attachments}"

    # FlowEditor expects response format: { results: [...], next: null }
    render json: {
      results: attachments,
      next: nil
    }
  rescue => e
    Rails.logger.error "AttachmentsController error: #{e.message}"
    Rails.logger.error e.backtrace.join("\n")
    render json: { error: e.message }, status: 500
  end
end