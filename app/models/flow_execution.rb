# == Schema Information
#
# Table name: flow_executions
#
#  id              :bigint           not null, primary key
#  completed_at    :datetime
#  context         :jsonb            not null
#  results         :jsonb            not null
#  started_at      :datetime         not null
#  status          :integer          default("pending"), not null
#  created_at      :datetime         not null
#  updated_at      :datetime         not null
#  account_id      :bigint           not null
#  contact_id      :bigint           not null
#  conversation_id :bigint
#  flow_id         :bigint           not null
#
# Indexes
#
#  index_flow_executions_on_account_id                         (account_id)
#  index_flow_executions_on_contact_id                         (contact_id)
#  index_flow_executions_on_conversation_id                    (conversation_id)
#  index_flow_executions_on_flow_id                            (flow_id)
#  index_flow_executions_on_flow_id_and_contact_id_and_status  (flow_id,contact_id,status)
#  index_flow_executions_on_status                             (status)
#
class FlowExecution < ApplicationRecord
  belongs_to :flow
  belongs_to :contact
  belongs_to :conversation, optional: true
  belongs_to :account

  enum status: { pending: 0, running: 1, completed: 2, failed: 3 }

  validates :flow_id, presence: true
  validates :contact_id, presence: true
  validates :account_id, presence: true
  validates :started_at, presence: true
end
