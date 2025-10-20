class Api::V1::Accounts::FlowsController < Api::V1::Accounts::BaseController
  before_action :set_flow, only: [:show, :update, :destroy]
  before_action :check_authorization

  def index
    @flows = Current.account.flows.includes(:created_by, :updated_by).ordered
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

  private

  def set_flow
    @flow = Current.account.flows.find(params[:id])
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
    authorize :flow, :index?
  end
end