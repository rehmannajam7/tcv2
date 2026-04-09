class Api::V1::Accounts::FlowEditor::GlobalsController < Api::V1::Accounts::FlowEditor::BaseController
  before_action :check_authorization

  def index
    globals = base_globals

    flow_id = params[:flow_id].presence || params[:flow].presence
    if flow_id.present?
      flow = Current.account.flows.find_by(id: flow_id)
      globals.concat(result_variable_globals_for(flow)) if flow
    end

    render json: {
      results: globals,
      next: nil
    }
  rescue StandardError => e
    Rails.logger.error "GlobalsController error: #{e.message}"
    Rails.logger.error e.backtrace.join("\n")
    render json: { error: e.message }, status: :internal_server_error
  end

  private

  def check_authorization
    authorize Current.account, :show?
  end

  def base_globals
    [
      {
        key: 'account_name',
        name: 'Account Name',
        value: Current.account.name.to_s
      },
      {
        key: 'account_id',
        name: 'Account ID',
        value: Current.account.id.to_s
      },
      {
        key: 'support_email',
        name: 'Support Email',
        value: Current.account.support_email.to_s
      }
    ]
  end

  # Extra globals derived from the flow definition so FlowEditor can offer
  # @results.<name> entries when it requests globals with ?flow_id= (or ?flow=).
  def result_variable_globals_for(flow)
    Flows::DefinitionResultNames.call(flow.flow_data).map do |name|
      {
        key: "results.#{name.parameterize.underscore}",
        name: "Flow result: #{name}",
        value: "@results.#{name}",
        result_name: name,
        namespace: 'results'
      }
    end
  end
end
