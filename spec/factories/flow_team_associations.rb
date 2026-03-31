FactoryBot.define do
  factory :flow_team_association do
    flow
    team { create(:team, account: flow.account) }
  end
end
