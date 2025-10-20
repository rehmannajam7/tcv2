class Api::V1::Accounts::FlowEditor::GlobalsController < ApplicationController
  def index
    Rails.logger.info "GlobalsController: index action called"
    
    # Return global variables in the format expected by FlowEditor
    globals = [
      {
        key: 'account_name',
        name: 'Account Name',
        value: 'Default Account'
      },
      {
        key: 'account_id',
        name: 'Account ID',
        value: '1'
      },
      {
        key: 'support_email',
        name: 'Support Email',
        value: 'support@example.com'
      }
    ]

    Rails.logger.info "GlobalsController: returning globals: #{globals}"

    # FlowEditor expects response format: { results: [...], next: null }
    render json: {
      results: globals,
      next: nil
    }
  rescue => e
    Rails.logger.error "GlobalsController error: #{e.message}"
    Rails.logger.error e.backtrace.join("\n")
    render json: { error: e.message }, status: 500
  end
end