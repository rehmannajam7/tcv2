# == Schema Information
#
# Table name: flow_inbox_associations
#
#  id         :bigint           not null, primary key
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  flow_id    :bigint           not null
#  inbox_id   :bigint           not null
#
# Indexes
#
#  index_flow_inbox_associations_on_flow_id                 (flow_id)
#  index_flow_inbox_associations_on_flow_id_and_inbox_id    (flow_id,inbox_id) UNIQUE
#  index_flow_inbox_associations_on_inbox_id                (inbox_id)
#
# Foreign Keys
#
#  fk_rails_...  (flow_id => flows.id)
#  fk_rails_...  (inbox_id => inboxes.id)
#
class FlowInboxAssociation < ApplicationRecord
  belongs_to :flow
  belongs_to :inbox

  validates :flow_id, presence: true
  validates :inbox_id, presence: true
  validates :flow_id, uniqueness: { scope: :inbox_id, message: 'Flow is already associated with this inbox' }
end
