class Api::V1::Accounts::FlowEditor::FlowsController < Api::V1::Accounts::FlowEditor::BaseController
  before_action :set_flow, only: [:show, :update, :destroy, :save_revision, :revisions, :variable_completions]
  before_action :check_authorization

  def index
    @flows = Current.account.flows.order(:name)
    render json: {
      results: @flows.map { |flow| flow_json(flow) },
      next: nil
    }
  end

  def show
    render json: {
      results: [flow_json(@flow)],
      next: nil
    }
  end

  def create
    @flow = Current.account.flows.build(normalized_flow_params)
    @flow.created_by = Current.user
    @flow.updated_by = Current.user

    if @flow.save
      render json: flow_json(@flow), status: :created
    else
      render json: { errors: @flow.errors }, status: :unprocessable_entity
    end
  end

  def update
    attrs = normalized_flow_params
    parsed = nil

    if attrs[:flow_data].present?
      begin
        parsed = attrs[:flow_data].is_a?(String) ? JSON.parse(attrs[:flow_data]) : attrs[:flow_data]
      rescue JSON::ParserError
        parsed = nil
      end

      if parsed.is_a?(Hash)
        keywords = parsed['keywords']
        derived_trigger_keyword = nil
        if keywords.is_a?(Array)
          derived_trigger_keyword = keywords.map { |k| k.to_s.strip }.find(&:present?)
        elsif keywords.is_a?(String)
          derived_trigger_keyword = keywords.to_s.strip.presence
        end

        tt = parsed['trigger_type'] || parsed['triggerType']
        derived_trigger_type = tt.is_a?(String) ? tt.to_s.downcase : nil
        derived_trigger_type = %w[manual automatic webhook].include?(derived_trigger_type) ? derived_trigger_type : nil

        attrs[:trigger_keyword] = derived_trigger_keyword if derived_trigger_keyword.present? && attrs[:trigger_keyword].blank?
        attrs[:trigger_type] = derived_trigger_type if derived_trigger_type.present?
        attrs[:trigger_type] = 'automatic' if attrs[:trigger_type].blank? && attrs[:trigger_keyword].present?
      end
    end

    if @flow.update(attrs)
      sync_inbox_associations(parsed) if parsed.is_a?(Hash)
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
  def variable_completions
    definition = begin
      JSON.parse(@flow.flow_data.presence || '{}')
    rescue JSON::ParserError
      {}
    end

    suggestions = Flows::VariableCompletionExtractor.suggestions(definition, params[:q])
    render json: { results: suggestions, next: nil }
  end

  def revisions
    # Route is /flows/:id/revisions, so use :id not :flow_id
    Rails.logger.info '=== REVISIONS DEBUG ==='
    Rails.logger.info "Params ID: #{params[:id]}"
    Rails.logger.info "Current account: #{Current.account&.id}"
    Rails.logger.info "Available flows: #{Current.account&.flows&.pluck(:id)}"
    Rails.logger.info '======================'
    @flow = Current.account.flows.find(params[:id])
    Rails.logger.info "Revisions flow found: #{@flow&.id}"
    render json: {
      results: [flow_json(@flow)],
      next: nil
    }
  end

  def save_revision
    Rails.logger.info '=== SAVE_REVISION DEBUG ==='
    Rails.logger.info "Params: #{params.inspect}"
    Rails.logger.info "Flow ID: #{params[:id]}"
    Rails.logger.info "Flow found: #{@flow.inspect}"
    Rails.logger.info "Definition: #{params[:definition]}"
    Rails.logger.info '==========================='

    # Normalize and validate the incoming definition before saving
    definition_param = params[:definition]
    normalized_definition_json = nil
    parsed_definition = nil

    begin
      if definition_param.is_a?(String)
        # Validate that the string is valid JSON
        parsed_definition = JSON.parse(definition_param)
        normalized_definition_json = definition_param
      else
        # Convert hashes/arrays to JSON for storage
        parsed_definition = definition_param
        normalized_definition_json = definition_param.to_json
      end
    rescue JSON::ParserError => e
      Rails.logger.error "Invalid flow definition JSON provided: #{e.message}"
      return render json: { errors: { definition: ['is not valid JSON'] } }, status: :unprocessable_entity
    end

    # Use a transaction to ensure both flow_data and related attributes are updated atomically
    ActiveRecord::Base.transaction do
      # Derive trigger_keyword and trigger_type from definition if provided
      derived_trigger_keyword = nil
      derived_trigger_type = nil

      if parsed_definition.is_a?(Hash)
        # keywords expected as array of strings; map to single keyword field for v1
        keywords = parsed_definition['keywords']
        if keywords.is_a?(Array)
          # Persist first non-empty trimmed keyword; ignore blanks
          derived_trigger_keyword = keywords.map { |k| k.to_s.strip }.find(&:present?)
        elsif keywords.is_a?(String)
          derived_trigger_keyword = keywords.strip.presence
        end

        # Allow trigger_type override from definition if present and valid
        tt = parsed_definition['trigger_type'] || parsed_definition['triggerType']
        if tt.is_a?(String)
          tt_down = tt.downcase
          derived_trigger_type = %w[manual automatic webhook].include?(tt_down) ? tt_down : nil
        end
      end

      update_attrs = { flow_data: normalized_definition_json }
      # Only update trigger_keyword if there's actually a keyword present
      # This prevents overwriting existing keywords when Floweditor sends empty keywords array
      update_attrs[:trigger_keyword] = derived_trigger_keyword if derived_trigger_keyword.present?
      update_attrs[:trigger_type] = derived_trigger_type if derived_trigger_type.present?

      # If a keyword is provided but no explicit trigger_type, default to automatic
      update_attrs[:trigger_type] = 'automatic' if update_attrs[:trigger_type].blank? && update_attrs[:trigger_keyword].present?

      # If we now have keywords and associated inboxes, ensure the flow is active
      # This avoids confusion where an otherwise-automatic flow remains in draft and never triggers.
      if parsed_definition.is_a?(Hash)
        inbox_assoc = parsed_definition['inboxAssociations']
        has_inboxes = inbox_assoc.is_a?(Array) && inbox_assoc.any?
        update_attrs[:status] = 'active' if update_attrs[:trigger_keyword].present? && has_inboxes && @flow.status != 'active'
      end

      # Update the flow with normalized JSON and mapped attributes
      if @flow.update(update_attrs)
        # Sync inboxAssociations from flow definition to database table
        sync_inbox_associations(parsed_definition)

        # Return the format expected by FlowEditor's SaveResult interface
        render json: {
          revision: {
            revision: @flow.updated_at.to_i, # Use timestamp as revision number
            id: @flow.id,
            version: '13.1', # FlowEditor spec version
            user: {
              email: @flow.created_by&.email || Current.user&.email || 'unknown@example.com',
              name: @flow.created_by&.name || Current.user&.name || 'Unknown User'
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
  end

  private

  def sync_inbox_associations(parsed_definition)
    Rails.logger.info '=== SYNC_INBOX_ASSOCIATIONS DEBUG ==='
    Rails.logger.info "Parsed definition: #{parsed_definition.inspect}"

    # Extract inboxAssociations from the flow definition. If omitted, preserve existing associations.
    inbox_associations = parsed_definition&.dig('inboxAssociations')
    if inbox_associations.nil?
      Rails.logger.info 'Inbox associations not provided; preserving existing associations'
      Rails.logger.info '=== END SYNC_INBOX_ASSOCIATIONS ==='
      return
    end

    unless inbox_associations.is_a?(Array)
      Rails.logger.warn "Invalid inboxAssociations format (#{inbox_associations.class}); expected Array. Skipping sync."
      Rails.logger.info '=== END SYNC_INBOX_ASSOCIATIONS ==='
      return
    end

    Rails.logger.info "Inbox associations from definition: #{inbox_associations.inspect}"

    # Normalize and compare with current associations to avoid unnecessary churn
    new_inbox_ids = inbox_associations.map { |uuid| uuid.to_s.strip }.reject(&:blank?).map(&:to_i).uniq.sort
    current_inbox_ids = @flow.inboxes.pluck(:id).uniq.sort

    if new_inbox_ids == current_inbox_ids
      Rails.logger.info 'No inbox association changes detected; skipping'
      Rails.logger.info '=== END SYNC_INBOX_ASSOCIATIONS ==='
      return
    end

    # Replace associations only when changes are detected
    @flow.flow_inbox_associations.destroy_all

    inbox_associations.each do |inbox_uuid|
      # Find inbox by ID (inbox_uuid is actually the inbox ID as string)
      inbox = Current.account.inboxes.find_by(id: inbox_uuid.to_i)

      if inbox
        @flow.flow_inbox_associations.create!(inbox: inbox)
        Rails.logger.info "Created association: Flow #{@flow.id} <-> Inbox #{inbox.id} (#{inbox.name})"
      else
        Rails.logger.warn "Inbox not found for UUID/ID: #{inbox_uuid}"
      end
    end

    Rails.logger.info '=== END SYNC_INBOX_ASSOCIATIONS ==='
  end

  def set_flow
    Rails.logger.info '=== SET_FLOW DEBUG ==='
    Rails.logger.info "Params ID: #{params[:id]}"
    Rails.logger.info "Current account: #{Current.account&.id}"
    Rails.logger.info "Available flows: #{Current.account&.flows&.pluck(:id)}"
    Rails.logger.info '======================'

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
      # FlowEditor expects a `definition` key containing the parsed JSON
      definition: parsed_flow_data(flow),
      # Provide FlowEditor metadata commonly used by clients
      uuid: flow.floweditor_uuid,
      revision: flow.updated_at.to_i,
      version: '13.1',
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

  # Safely parse the stored JSON definition into an object for clients
  def parsed_flow_data(flow)
    definition = if flow.flow_data.blank?
                   {}
                 else
                   begin
                     JSON.parse(flow.flow_data)
                   rescue JSON::ParserError => e
                     Rails.logger.error "Invalid stored flow_data JSON for flow #{flow.id}: #{e.message}"
                     {}
                   end
                 end

    # Populate inboxAssociations from database relationships
    # This ensures the definition always reflects the current database state
    inbox_ids = flow.inboxes.pluck(:id).map(&:to_s)
    definition['inboxAssociations'] = inbox_ids

    # Surface keywords in definition for FlowEditor UI, as array
    if definition['keywords'].present? && definition['keywords'].is_a?(Array) && definition['keywords'].any? { |k| k.to_s.strip.present? }
      definition['keywords'] = definition['keywords'].select { |k| k.to_s.strip.present? }.map { |k| k.to_s.strip }
    else
      keyword = flow.trigger_keyword.to_s.strip
      definition['keywords'] = keyword.present? ? [keyword] : []
    end

    Rails.logger.info '=== PARSED_FLOW_DATA DEBUG ==='
    Rails.logger.info "Flow ID: #{flow.id}"
    Rails.logger.info "Inbox IDs from DB: #{inbox_ids.inspect}"
    Rails.logger.info "Definition inboxAssociations: #{definition['inboxAssociations'].inspect}"
    Rails.logger.info '=== END PARSED_FLOW_DATA ==='

    definition
  end

  # Normalize incoming params to ensure flow_data is stored as JSON string
  def normalized_flow_params
    fp = flow_params
    fp[:flow_data] = fp[:flow_data].to_json if fp[:flow_data].present? && !fp[:flow_data].is_a?(String)
    fp
  end
end
