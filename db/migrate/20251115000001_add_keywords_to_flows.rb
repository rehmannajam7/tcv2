class AddKeywordsToFlows < ActiveRecord::Migration[7.0]
  def change
    add_column :flows, :keywords, :text, array: true, default: []
    add_index :flows, :keywords, using: :gin
  end
end
