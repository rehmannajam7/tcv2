class CreateFlowTeamAssociations < ActiveRecord::Migration[7.0]
  def change
    create_table 'flow_team_associations', force: :cascade do |t|
      t.bigint 'flow_id', null: false
      t.bigint 'team_id', null: false
      t.datetime 'created_at', null: false
      t.datetime 'updated_at', null: false
      t.index %w[flow_id team_id], name: 'index_flow_team_associations_on_flow_id_and_team_id', unique: true
      t.index ['flow_id'], name: 'index_flow_team_associations_on_flow_id'
      t.index ['team_id'], name: 'index_flow_team_associations_on_team_id'
    end
  end
end
