# == Schema Information
#
# Table name: flows
#
#  id                        :bigint           not null, primary key
#  description               :text
#  flow_data                 :text
#  flow_type                 :integer          default("conversation"), not null
#  floweditor_last_synced_at :datetime
#  floweditor_sync_status    :string
#  floweditor_uuid           :string
#  name                      :string           not null
#  status                    :integer          default("draft"), not null
#  trigger_conditions        :text
#  trigger_keyword           :string
#  trigger_type              :integer          default("manual"), not null
#  created_at                :datetime         not null
#  updated_at                :datetime         not null
#  account_id                :bigint           not null
#  created_by_id             :bigint           not null
#  updated_by_id             :bigint           not null
#
# Indexes
#
#  index_flows_on_account_id                      (account_id)
#  index_flows_on_account_id_and_flow_type        (account_id,flow_type)
#  index_flows_on_account_id_and_floweditor_uuid  (account_id,floweditor_uuid)
#  index_flows_on_account_id_and_status           (account_id,status)
#  index_flows_on_account_id_and_trigger_keyword  (account_id,trigger_keyword)
#  index_flows_on_account_id_and_trigger_type     (account_id,trigger_type)
#  index_flows_on_created_by_id                   (created_by_id)
#  index_flows_on_floweditor_uuid                 (floweditor_uuid) UNIQUE
#  index_flows_on_updated_by_id                   (updated_by_id)
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id)
#  fk_rails_...  (created_by_id => users.id)
#  fk_rails_...  (updated_by_id => users.id)
#
class Flow < ApplicationRecord
  belongs_to :account
  belongs_to :created_by, class_name: 'User', foreign_key: 'created_by_id'
  belongs_to :updated_by, class_name: 'User', foreign_key: 'updated_by_id'

  validates :name, presence: true, uniqueness: { scope: :account_id, message: 'must be unique within the account' }
  validates :account_id, presence: true
  validates :created_by_id, presence: true
  validates :updated_by_id, presence: true

  enum status: { draft: 0, active: 1, inactive: 2 }
  enum trigger_type: { manual: 0, automatic: 1, webhook: 2 }
  enum flow_type: { conversation: 0, contact: 1 }

  scope :ordered, -> { order(:name) }
  scope :active, -> { where(status: :active) }
end
