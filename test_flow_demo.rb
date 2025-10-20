#!/usr/bin/env ruby

# Load Rails environment
require_relative 'config/environment'

puts "Creating Flow Demo"
puts "=================="

begin
  # Find or create a test account
  account = Account.first
  if account.nil?
    puts "❌ No account found. Please create an account first."
    exit 1
  end
  
  user = account.users.first
  if user.nil?
    puts "❌ No user found for account. Please create a user first."
    exit 1
  end
  
  puts "✓ Using account: #{account.name} (ID: #{account.id})"
  puts "✓ Using user: #{user.name} (ID: #{user.id})"
  
  # Create a sample flow
  flow_name = "Welcome Flow Demo #{Time.current.to_i}"
  sample_flow_data = {
    "version" => "13",
    "flow" => {
      "uuid" => SecureRandom.uuid,
      "name" => flow_name,
      "spec_version" => "13.1.0",
      "language" => "eng",
      "type" => "messaging",
      "nodes" => [
        {
          "uuid" => SecureRandom.uuid,
          "actions" => [
            {
              "uuid" => SecureRandom.uuid,
              "type" => "send_msg",
              "text" => "Welcome to our support! How can we help you today?",
              "quick_replies" => [
                "Technical Support",
                "Billing Question", 
                "General Inquiry"
              ]
            }
          ],
          "exits" => [
            {
              "uuid" => SecureRandom.uuid,
              "destination_uuid" => nil
            }
          ]
        }
      ]
    }
  }
  
  flow = Flow.create!(
    name: flow_name,
    description: 'A demo welcome flow that greets users and provides quick reply options',
    account: account,
    created_by: user,
    updated_by: user,
    flow_data: sample_flow_data.to_json,
    flow_type: 'conversation',
    trigger_type: 'automatic',
    status: 'active'
  )
  
  puts "✓ Created sample flow: #{flow.name} (ID: #{flow.id})"
  
  # Test flow execution with a sample conversation
  conversation = account.conversations.first
  if conversation
    puts "✓ Found test conversation: #{conversation.id}"
    
    # Test the trigger service
    trigger_service = Flows::TriggerService.new(
      event_name: 'conversation_created',
      event_data: { 
        conversation: conversation,
        account: account
      }
    )
    
    puts "✓ TriggerService initialized successfully"
    
    # Test the execution service
    execution_service = Flows::ExecutionService.new(
      flow: flow,
      conversation: conversation,
      trigger_data: { event: 'conversation_created' }
    )
    
    puts "✓ ExecutionService initialized successfully"
    
    # Test flow listener event handling
    event_obj = OpenStruct.new(
      data: {
        conversation: conversation,
        account: account,
        user: user
      }
    )
    
    FlowListener.instance.conversation_created(event_obj)
    puts "✓ FlowListener event triggered successfully"
    
  else
    puts "⚠️  No conversations found for testing execution"
  end
  
  puts ""
  puts "Demo Flow Created Successfully!"
  puts "=============================="
  puts "Flow ID: #{flow.id}"
  puts "Flow Name: #{flow.name}"
  puts "Flow Type: #{flow.flow_type}"
  puts "Trigger Type: #{flow.trigger_type}"
  puts "Status: #{flow.status}"
  puts ""
  puts "You can now:"
  puts "1. View the flow in the Chatwoot dashboard at /flows"
  puts "2. Edit the flow using the FlowEditor"
  puts "3. Test the flow by creating new conversations"
  puts ""
  
rescue => e
  puts "❌ Error creating demo flow: #{e.message}"
  puts e.backtrace.first(5).join("\n")
  exit 1
end