# frozen_string_literal: true

# Account feature_flags uses FlagShihTzu with one bit per feature in config/features.yml.
# With 64 features, enabling the last flag (flow_editor) sets the 64th bit, producing a value
# larger than a signed 64-bit integer — ActiveRecord raises RangeError on save.
# DECIMAL(20,0) stores the full unsigned bit pattern safely.
class ChangeAccountsFeatureFlagsToDecimal < ActiveRecord::Migration[7.1]
  def up
    change_column :accounts, :feature_flags, :decimal, precision: 20, scale: 0, default: 0, null: false
  end

  def down
    change_column :accounts, :feature_flags, :bigint, default: 0, null: false
  end
end
