FactoryBot.define do
  factory :flow do
    name { "Flow-#{SecureRandom.hex(4)}" }
    description { 'Test flow description' }
    status { :draft }
    trigger_type { :manual }
    flow_type { :conversation }
    trigger_keyword { nil }

    after(:build) do |flow|
      flow.account ||= create(:account)
      flow.created_by ||= create(:user, account: flow.account)
      flow.updated_by ||= flow.created_by
      flow.flow_data ||= {}.to_json
    end

    trait :active do
      status { :active }
    end

    trait :automatic do
      trigger_type { :automatic }
    end

    trait :with_keyword do
      trigger_keyword { 'help' }
    end
  end
end
