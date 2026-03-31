class CreateFlows < ActiveRecord::Migration[7.0]
  def change
    # Temporarily disable statement timeout for this migration
    execute 'SET statement_timeout = 0'
    create_table 'flows', force: :cascade do |t|
      t.string 'name', null: false
      t.text 'description'
      t.integer 'status', default: 0, null: false
      t.integer 'trigger_type', default: 0, null: false
      t.text 'trigger_conditions'
      t.text 'flow_data'
      t.bigint 'account_id', null: false
      t.bigint 'created_by_id', null: false
      t.bigint 'updated_by_id', null: false
      t.datetime 'created_at', null: false
      t.datetime 'updated_at', null: false
      t.integer 'flow_type', default: 0, null: false
      t.string 'trigger_keyword'
      t.string 'floweditor_uuid'
      t.string 'floweditor_sync_status'
      t.datetime 'floweditor_last_synced_at'
      t.index %w[account_id flow_type], name: 'index_flows_on_account_id_and_flow_type'
      t.index %w[account_id floweditor_uuid], name: 'index_flows_on_account_id_and_floweditor_uuid'
      t.index %w[account_id status], name: 'index_flows_on_account_id_and_status'
      t.index %w[account_id trigger_keyword], name: 'index_flows_on_account_id_and_trigger_keyword'
      t.index %w[account_id trigger_type], name: 'index_flows_on_account_id_and_trigger_type'
      t.index ['account_id'], name: 'index_flows_on_account_id'
      t.index ['created_by_id'], name: 'index_flows_on_created_by_id'
      t.index ['floweditor_uuid'], name: 'index_flows_on_floweditor_uuid', unique: true
      t.index ['updated_by_id'], name: 'index_flows_on_updated_by_id'
    end
  end
end
