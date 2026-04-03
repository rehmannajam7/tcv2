# frozen_string_literal: true

namespace :flows do
  desc 'Print flow counts per account (verify data after upgrade or import)'
  task report: :environment do
    counts = Flow.group(:account_id).count
    if counts.empty?
      puts 'No rows in flows table.'
    else
      counts.sort.each { |account_id, n| puts "account_id=#{account_id} flows=#{n}" }
    end
    puts "Total flows: #{Flow.count}"
  end
end
