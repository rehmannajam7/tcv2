class CreateFlowInboxAssociations < ActiveRecord::Migration[7.1]
  def change
    create_table :flow_inbox_associations do |t|
      t.references :flow, null: false, foreign_key: true
      t.references :inbox, null: false, foreign_key: true

      t.timestamps
    end

    add_index :flow_inbox_associations, [:flow_id, :inbox_id], unique: true
  end
end
