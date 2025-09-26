# == Schema Information
#
# Table name: flow_executions
#
#  id              :bigint           not null, primary key
#  completed_at    :datetime
#  execution_data  :text
#  started_at      :datetime
#  status          :integer          default("pending"), not null
#  created_at      :datetime         not null
#  updated_at      :datetime         not null
#  conversation_id :bigint           not null
#  executed_by_id  :bigint           not null
#  flow_id         :bigint           not null
#
# Indexes
#
#  index_flow_executions_on_conversation_id             (conversation_id)
#  index_flow_executions_on_conversation_id_and_status  (conversation_id,status)
#  index_flow_executions_on_executed_by_id              (executed_by_id)
#  index_flow_executions_on_flow_id                     (flow_id)
#  index_flow_executions_on_flow_id_and_status          (flow_id,status)
#  index_flow_executions_on_started_at                  (started_at)
#
# Foreign Keys
#
#  fk_rails_...  (conversation_id => conversations.id)
#  fk_rails_...  (executed_by_id => users.id)
#  fk_rails_...  (flow_id => flows.id)
#
class FlowExecution < ApplicationRecord
  belongs_to :flow
  belongs_to :conversation
  belongs_to :executed_by, class_name: 'User', optional: true

  validates :status, presence: true, inclusion: { in: %w[pending running completed failed] }

  enum status: { pending: 0, running: 1, completed: 2, failed: 3 }

  scope :recent, -> { order(created_at: :desc) }
  scope :for_flow, ->(flow_id) { where(flow_id: flow_id) }
  scope :for_conversation, ->(conversation_id) { where(conversation_id: conversation_id) }

  def execution_data_json
    return {} if execution_data.blank?

    JSON.parse(execution_data)
  rescue JSON::ParserError
    {}
  end

  def execution_data_json=(data)
    self.execution_data = data.to_json
  end

  def duration
    return nil unless started_at && completed_at

    completed_at - started_at
  end
end
