class Api::V1::Accounts::FlowEditor::GroupsController < Api::V1::Accounts::FlowEditor::BaseController
  before_action :check_authorization

  def index
    # Return groups in the format expected by FlowEditor
    # Map Chatwoot teams to groups format
    groups = Current.account.teams.map do |team|
      {
        uuid: SecureRandom.uuid,
        name: team.name,
        count: team.team_members.count
      }
    end

    # Add default groups
    default_groups = [
      { uuid: SecureRandom.uuid, name: 'All Agents', count: Current.account.users.count },
      { uuid: SecureRandom.uuid, name: 'Administrators', count: Current.account.account_users.where(role: 'administrator').count }
    ]

    # FlowEditor expects response format: { results: [...], next: null }
    render json: {
      results: (default_groups + groups).first(20),
      next: nil
    }
  end

  private

  def check_authorization
    authorize Current.account, :show?
  end
end