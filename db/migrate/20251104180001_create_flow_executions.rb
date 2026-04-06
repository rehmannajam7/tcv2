class CreateFlowExecutions < ActiveRecord::Migration[7.0]
  def change
    create_table 'flow_executions', force: :cascade do |t|
      t.bigint 'flow_id', null: false
      t.bigint 'contact_id', null: false
      t.bigint 'conversation_id'
      t.bigint 'account_id', null: false
      t.jsonb 'context', default: {}, null: false
      t.integer 'status', default: 0, null: false
      t.datetime 'started_at', null: false
      t.datetime 'completed_at'
      t.datetime 'created_at', null: false
      t.datetime 'updated_at', null: false
      t.jsonb 'results', default: {}, null: false
      t.index ['account_id'], name: 'index_flow_executions_on_account_id'
      t.index ['contact_id'], name: 'index_flow_executions_on_contact_id'
      t.index ['conversation_id'], name: 'index_flow_executions_on_conversation_id'
      t.index %w[flow_id contact_id status], name: 'index_flow_executions_on_flow_id_and_contact_id_and_status'
      t.index ['flow_id'], name: 'index_flow_executions_on_flow_id'
      t.index ['status'], name: 'index_flow_executions_on_status'
    end
  end
end
