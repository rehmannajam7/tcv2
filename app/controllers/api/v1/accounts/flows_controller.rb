class Api::V1::Accounts::FlowsController < Api::V1::Accounts::BaseController
  before_action :check_authorization
  before_action :set_flow, only: [:show, :update, :destroy, :execute]

  def index
    @flows = Current.account.flows.page(params[:page])
  end

  def show; end

  def create
    @flow = Current.account.flows.build(flow_params)
    @flow.created_by = current_user
    @flow.save!
  end

  def update
    @flow.update!(flow_params)
  end

  def destroy
    @flow.destroy!
    head :ok
  end

  def execute
    # Execute flow logic
    FlowExecutionService.new(flow: @flow, conversation: find_conversation).perform
    head :ok
  end

  private

  def set_flow
    @flow = Current.account.flows.find(params[:id])
  end

  def flow_params
    params.require(:flow).permit(
      :name,
      :description,
      :status,
      :trigger_type,
      :trigger_conditions,
      :flow_data,
      inbox_ids: [],
      team_ids: []
    )
  end

  def find_conversation
    return unless params[:conversation_id]

    Current.account.conversations.find(params[:conversation_id])
  end

  def check_authorization
    authorize(Flow)
  end
end
