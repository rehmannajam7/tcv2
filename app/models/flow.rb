# == Schema Information
#
# Table name: flows
#
#  id                 :bigint           not null, primary key
#  description        :text
#  flow_data          :text
#  name               :string           not null
#  status             :integer          default("draft"), not null
#  trigger_conditions :text
#  trigger_type       :integer          default("manual"), not null
#  created_at         :datetime         not null
#  updated_at         :datetime         not null
#  account_id         :bigint           not null
#  created_by_id      :bigint           not null
#  updated_by_id      :bigint           not null
#
# Indexes
#
#  index_flows_on_account_id                   (account_id)
#  index_flows_on_account_id_and_status        (account_id,status)
#  index_flows_on_account_id_and_trigger_type  (account_id,trigger_type)
#  index_flows_on_created_by_id                (created_by_id)
#  index_flows_on_updated_by_id                (updated_by_id)
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id)
#  fk_rails_...  (created_by_id => users.id)
#  fk_rails_...  (updated_by_id => users.id)
#
class Flow < ApplicationRecord
  belongs_to :account
  belongs_to :created_by, class_name: 'User', optional: true
  belongs_to :updated_by, class_name: 'User', optional: true

  has_many :flow_inbox_associations, dependent: :destroy
  has_many :inboxes, through: :flow_inbox_associations
  has_many :flow_team_associations, dependent: :destroy
  has_many :teams, through: :flow_team_associations
  has_many :flow_executions, dependent: :destroy

  validates :name, presence: true, length: { maximum: 255 }
  validates :status, presence: true, inclusion: { in: %w[active inactive draft] }
  validates :trigger_type, presence: true, inclusion: { in: %w[manual conversation_created message_received] }

  enum status: { draft: 0, active: 1, inactive: 2 }
  enum trigger_type: { manual: 0, conversation_created: 1, message_received: 2 }

  scope :active, -> { where(status: :active) }
  scope :for_inbox, ->(inbox_id) { joins(:inboxes).where(inboxes: { id: inbox_id }) }
  scope :for_team, ->(team_id) { joins(:teams).where(teams: { id: team_id }) }

  before_save :set_updated_by

  def flow_data_json
    return {} if flow_data.blank?

    JSON.parse(flow_data)
  rescue JSON::ParserError
    {}
  end

  def flow_data_json=(data)
    self.flow_data = data.to_json
  end

  def trigger_conditions_json
    return {} if trigger_conditions.blank?

    JSON.parse(trigger_conditions)
  rescue JSON::ParserError
    {}
  end

  def trigger_conditions_json=(data)
    self.trigger_conditions = data.to_json
  end

  def can_execute_for?(conversation)
    return false unless active?
    return true if inboxes.empty? && teams.empty?

    inbox_match = inboxes.empty? || inboxes.include?(conversation.inbox)
    team_match = teams.empty? || (conversation.team && teams.include?(conversation.team))

    inbox_match && team_match
  end

  private

  def set_updated_by
    self.updated_by = Current.user if Current.user
  end
end
