class CreateFlowTeamAssociations < ActiveRecord::Migration[7.1]
  def change
    create_table :flow_team_associations do |t|
      t.references :flow, null: false, foreign_key: true
      t.references :team, null: false, foreign_key: true

      t.timestamps
    end

    add_index :flow_team_associations, [:flow_id, :team_id], unique: true
  end
end
