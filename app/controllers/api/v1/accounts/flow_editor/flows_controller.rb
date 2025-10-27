class Api::V1::Accounts::FlowEditor::FlowsController < Api::V1::Accounts::FlowEditor::BaseController
  before_action :set_flow, only: [:show, :update, :destroy, :save_revision]
  before_action :check_authorization

  def index
    @flows = Current.account.flows.order(:name)
    render json: @flows.map { |flow| flow_json(flow) }
  end

  def show
    render json: flow_json(@flow)
  end

  def create
    @flow = Current.account.flows.build(flow_params)
    @flow.created_by = Current.user
    @flow.updated_by = Current.user
    
    if @flow.save
      render json: flow_json(@flow), status: :created
    else
      render json: { errors: @flow.errors }, status: :unprocessable_entity
    end
  end

  def update
    if @flow.update(flow_params)
      render json: flow_json(@flow)
    else
      render json: { errors: @flow.errors }, status: :unprocessable_entity
    end
  end

  def destroy
    @flow.destroy
    head :no_content
  end

  # FlowEditor specific endpoints
  def revisions
    @flow = Current.account.flows.find(params[:flow_id])
    # For now, return the current flow as the only revision
    # In the future, this could return actual revision history
    render json: [flow_json(@flow)]
  end

  def save_revision
    Rails.logger.info "=== SAVE_REVISION DEBUG ==="
    Rails.logger.info "Params: #{params.inspect}"
    Rails.logger.info "Flow ID: #{params[:id]}"
    Rails.logger.info "Flow found: #{@flow.inspect}"
    Rails.logger.info "Definition: #{params[:definition]}"
    Rails.logger.info "==========================="
    
    # Update the flow with the new definition from FlowEditor
    if @flow.update(flow_data: params[:definition])
      # Return the format expected by FlowEditor's SaveResult interface
      render json: {
        revision: {
          revision: @flow.updated_at.to_i, # Use timestamp as revision number
          id: @flow.id,
          version: "13.1", # FlowEditor spec version
          user: {
            email: @flow.created_by&.email || Current.user&.email || "unknown@example.com",
            name: @flow.created_by&.name || Current.user&.name || "Unknown User"
          },
          created_on: @flow.updated_at.iso8601
        },
        issues: [],
        metadata: {}
      }
    else
      render json: { errors: @flow.errors }, status: :unprocessable_entity
    end
  end

  private

  def set_flow
    Rails.logger.info "=== SET_FLOW DEBUG ==="
    Rails.logger.info "Params ID: #{params[:id]}"
    Rails.logger.info "Current account: #{Current.account&.id}"
    Rails.logger.info "Available flows: #{Current.account&.flows&.pluck(:id)}"
    Rails.logger.info "======================"
    
    @flow = Current.account.flows.find(params[:id])
    
    Rails.logger.info "Flow found: #{@flow.inspect}"
  end

  def flow_params
    params.require(:flow).permit(:name, :description, :flow_data, :status, :trigger_type, :flow_type, :trigger_keyword)
  end

  def flow_json(flow)
    {
      id: flow.id,
      name: flow.name,
      description: flow.description,
      flow_data: flow.flow_data,
      status: flow.status,
      trigger_type: flow.trigger_type,
      flow_type: flow.flow_type,
      trigger_keyword: flow.trigger_keyword,
      created_at: flow.created_at,
      updated_at: flow.updated_at,
      created_by_id: flow.created_by_id,
      updated_by_id: flow.updated_by_id
    }
  end

  def check_authorization
    case action_name
    when 'save_revision'
      authorize @flow, :save_revision?
    else
      authorize :flow, :index?
    end
  end
end