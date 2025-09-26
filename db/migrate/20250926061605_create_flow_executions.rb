class CreateFlowExecutions < ActiveRecord::Migration[7.1]
  def change
    create_table :flow_executions do |t|
      t.references :flow, null: false, foreign_key: true
      t.references :conversation, null: false, foreign_key: true
      t.integer :status, default: 0, null: false
      t.text :execution_data
      t.datetime :started_at
      t.datetime :completed_at
      t.references :executed_by, null: false, foreign_key: { to_table: :users }

      t.timestamps
    end

    add_index :flow_executions, [:flow_id, :status]
    add_index :flow_executions, [:conversation_id, :status]
    add_index :flow_executions, :started_at
  end
end
