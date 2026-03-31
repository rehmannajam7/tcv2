FactoryBot.define do
  factory :flow_inbox_association do
    flow
    inbox { create(:inbox, account: flow.account) }
  end
end
