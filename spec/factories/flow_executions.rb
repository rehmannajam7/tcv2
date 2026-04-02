FactoryBot.define do
  factory :flow_execution do
    flow
    contact
    account { flow.account }
    conversation { create(:conversation, account: account, contact: contact) }
    results { {} }
    status { :pending }
    started_at { Time.current }

    trait :running do
      status { :running }
    end

    trait :completed do
      status { :completed }
      completed_at { Time.current }
    end

    trait :failed do
      status { :failed }
    end
  end
end
