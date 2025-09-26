# == Schema Information
#
# Table name: flow_team_associations
#
#  id         :bigint           not null, primary key
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  flow_id    :bigint           not null
#  team_id    :bigint           not null
#
# Indexes
#
#  index_flow_team_associations_on_flow_id              (flow_id)
#  index_flow_team_associations_on_flow_id_and_team_id  (flow_id,team_id) UNIQUE
#  index_flow_team_associations_on_team_id              (team_id)
#
# Foreign Keys
#
#  fk_rails_...  (flow_id => flows.id)
#  fk_rails_...  (team_id => teams.id)
#
class FlowTeamAssociation < ApplicationRecord
  belongs_to :flow
  belongs_to :team

  validates :flow_id, uniqueness: { scope: :team_id }
end
