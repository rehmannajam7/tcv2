class CreateFlowInboxAssociations < ActiveRecord::Migration[7.0]
  def change
    create_table 'flow_inbox_associations', force: :cascade do |t|
      t.bigint 'flow_id', null: false
      t.bigint 'inbox_id', null: false
      t.datetime 'created_at', null: false
      t.datetime 'updated_at', null: false
      t.index %w[flow_id inbox_id], name: 'index_flow_inbox_associations_on_flow_id_and_inbox_id', unique: true
      t.index ['flow_id'], name: 'index_flow_inbox_associations_on_flow_id'
      t.index ['inbox_id'], name: 'index_flow_inbox_associations_on_inbox_id'
    end
  end
end
