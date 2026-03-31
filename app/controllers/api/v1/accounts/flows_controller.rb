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
    @flow = build_flow

    if @flow.save
      handle_inbox_associations
      render json: flow_json(@flow), status: :created
    else
      render json: { errors: @flow.errors }, status: :unprocessable_entity
    end
  rescue StandardError => e
    handle_creation_error(e)
  end

  def update
    np = normalized_flow_params
    if @flow.update(np.except(:inbox_ids))
      process_inbox_associations
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
    params.require(:flow).permit(:name, :description, :flow_data, :status, :trigger_type, :flow_type, :trigger_keyword, inbox_ids: [])
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
      updated_by_id: flow.updated_by_id,
      inbox_ids: flow.inbox_ids,
      keywords: computed_keywords(flow)
    }
  end

  def check_authorization
    authorize :flow, :index?
  end

  def build_flow
    flow = Current.account.flows.build(normalized_flow_params.except(:inbox_ids))
    flow.created_by = Current.user
    flow.updated_by = Current.user
    flow
  end

  def handle_inbox_associations
    return if params[:flow][:inbox_ids].blank?

    process_inbox_associations
  end

  def handle_creation_error(error)
    Rails.logger.error "Flow creation error: #{error.message}"
    Rails.logger.error error.backtrace.join("\n")
    render json: { errors: { base: ["Failed to create flow: #{error.message}"] } }, status: :unprocessable_entity
  end

  def normalized_flow_params
    fp = flow_params
    normalize_flow_data(fp)
    normalize_flow_type_in(fp)
    normalize_trigger_type_in(fp)
    apply_keyword_default_trigger(fp)
    fp
  end

  def normalize_flow_data(flow_params_hash)
    v = flow_params_hash[:flow_data]
    flow_params_hash[:flow_data] = v.to_json if v.present? && !v.is_a?(String)
  end

  def normalize_flow_type_in(flow_params_hash)
    t = flow_params_hash[:flow_type]
    flow_params_hash[:flow_type] = normalize_flow_type(t) if t.present?
  end

  def normalize_trigger_type_in(flow_params_hash)
    t = flow_params_hash[:trigger_type]
    flow_params_hash[:trigger_type] = normalize_trigger_type(t) if t.present?
  end

  def apply_keyword_default_trigger(flow_params_hash)
    k = flow_params_hash[:trigger_keyword]
    tt = flow_params_hash[:trigger_type]
    flow_params_hash[:trigger_type] = 'automatic' if k.present? && (tt.blank? || tt == 'manual')
  end

  def normalize_flow_type(type)
    return 'conversation' if type.to_s == 'voice'
    return 'conversation' if type.to_s.blank?

    type.to_s
  end

  def normalize_trigger_type(type)
    allowed = %w[manual automatic webhook]
    return 'manual' if type.to_s.blank?

    allowed.include?(type.to_s) ? type.to_s : 'manual'
  end

  def computed_keywords(flow)
    keyword = flow.trigger_keyword.to_s.strip
    keyword.present? ? [keyword] : []
  end

  def process_inbox_associations
    return unless params[:flow][:inbox_ids].is_a?(Array)

    current_inbox_ids = @flow.inboxes.pluck(:id)
    new_inbox_ids = params[:flow][:inbox_ids].map(&:to_i).uniq

    update_inbox_associations(current_inbox_ids, new_inbox_ids)
  rescue StandardError => e
    Rails.logger.error "Error processing inbox associations: #{e.message}"
    Rails.logger.error e.backtrace.join("\n")
  end

  def update_inbox_associations(current_inbox_ids, new_inbox_ids)
    remove_old_associations(current_inbox_ids, new_inbox_ids)
    add_new_associations(current_inbox_ids, new_inbox_ids)
  end

  def remove_old_associations(current_inbox_ids, new_inbox_ids)
    inbox_ids_to_remove = current_inbox_ids - new_inbox_ids
    return if inbox_ids_to_remove.empty?

    @flow.flow_inbox_associations.where(inbox_id: inbox_ids_to_remove).destroy_all
  end

  def add_new_associations(current_inbox_ids, new_inbox_ids)
    inbox_ids_to_add = new_inbox_ids - current_inbox_ids
    inbox_ids_to_add.each { |id| create_inbox_association(id) }
  end

  def create_inbox_association(inbox_id)
    inbox = Current.account.inboxes.find_by(id: inbox_id)
    return unless inbox

    @flow.flow_inbox_associations.create!(inbox: inbox)
  rescue StandardError => e
    Rails.logger.warn "Failed to create inbox association for ID #{inbox_id}: #{e.message}"
  end
end
