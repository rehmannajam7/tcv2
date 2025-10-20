class Api::V1::Accounts::FlowEditor::ContactGroupsController < ApplicationController
  def index
    Rails.logger.info "ContactGroupsController: index action called"
    
    # Return contact groups in the format expected by FlowEditor
    # Simplified version to avoid potential database issues
    default_groups = [
      { uuid: SecureRandom.uuid, name: 'All Contacts', count: 0 },
      { uuid: SecureRandom.uuid, name: 'Active Contacts', count: 0 }
    ]

    Rails.logger.info "ContactGroupsController: returning groups: #{default_groups}"

    # FlowEditor expects response format: { results: [...], next: null }
    render json: {
      results: default_groups,
      next: nil
    }
  rescue => e
    Rails.logger.error "ContactGroupsController error: #{e.message}"
    Rails.logger.error e.backtrace.join("\n")
    render json: { error: e.message }, status: 500
  end
end