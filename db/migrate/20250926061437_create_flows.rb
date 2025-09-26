class CreateFlows < ActiveRecord::Migration[7.1]
  def change
    create_table :flows do |t|
      t.string :name, null: false
      t.text :description
      t.integer :status, default: 0, null: false
      t.integer :trigger_type, default: 0, null: false
      t.text :trigger_conditions
      t.text :flow_data
      t.references :account, null: false, foreign_key: true
      t.references :created_by, null: false, foreign_key: { to_table: :users }
      t.references :updated_by, null: false, foreign_key: { to_table: :users }

      t.timestamps
    end

    add_index :flows, [:account_id, :status]
    add_index :flows, [:account_id, :trigger_type]
  end
end
