#!/usr/bin/env ruby
# Test script for flow execution system integration

require_relative 'config/environment'

puts "Testing Flow Execution System Integration"
puts "=" * 50

# Test 1: Check if all required classes are loaded
puts "\n1. Checking class loading..."
begin
  Flow
  puts "✓ Flow model loaded"
rescue NameError => e
  puts "✗ Flow model not found: #{e.message}"
end

begin
  Flows::ExecutionService
  puts "✓ Flows::ExecutionService loaded"
rescue NameError => e
  puts "✗ Flows::ExecutionService not found: #{e.message}"
end

begin
  Flows::TriggerService
  puts "✓ Flows::TriggerService loaded"
rescue NameError => e
  puts "✗ Flows::TriggerService not found: #{e.message}"
end

begin
  FlowListener
  puts "✓ FlowListener loaded"
rescue NameError => e
  puts "✗ FlowListener not found: #{e.message}"
end

begin
  Flows::ExecutionJob
  puts "✓ Flows::ExecutionJob loaded"
rescue NameError => e
  puts "✗ Flows::ExecutionJob not found: #{e.message}"
end

begin
  Flows::TriggerJob
  puts "✓ Flows::TriggerJob loaded"
rescue NameError => e
  puts "✗ Flows::TriggerJob not found: #{e.message}"
end

# Test 2: Check if FlowListener is registered in AsyncDispatcher
puts "\n2. Checking FlowListener registration..."
dispatcher = Rails.configuration.dispatcher.async_dispatcher
listeners = dispatcher.listeners
flow_listener_registered = listeners.any? { |listener| listener.class == FlowListener }

if flow_listener_registered
  puts "✓ FlowListener is registered in AsyncDispatcher"
else
  puts "✗ FlowListener is NOT registered in AsyncDispatcher"
  puts "  Registered listeners: #{listeners.map(&:class).join(', ')}"
end

# Test 3: Check database table structure
puts "\n3. Checking database structure..."
begin
  if ActiveRecord::Base.connection.table_exists?('flows')
    puts "✓ Flows table exists"
    
    columns = ActiveRecord::Base.connection.columns('flows').map(&:name)
    required_columns = %w[name description status trigger_type flow_type account_id flow_data]
    
    missing_columns = required_columns - columns
    if missing_columns.empty?
      puts "✓ All required columns present"
    else
      puts "✗ Missing columns: #{missing_columns.join(', ')}"
    end
  else
    puts "✗ Flows table does not exist"
  end
rescue => e
  puts "✗ Database error: #{e.message}"
end

# Test 4: Test Flow model basic functionality
puts "\n4. Testing Flow model..."
begin
  # Try to create a test account if needed
  account = Account.first || Account.create!(name: 'Test Account')
  user = account.users.first || account.users.create!(
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123',
    password_confirmation: 'password123'
  )
  
  # Test flow creation with unique name
  flow_name = "Test Flow #{Time.current.to_i}"
  flow = Flow.new(
    name: flow_name,
    description: 'A test flow for integration testing',
    account: account,
    created_by: user,
    updated_by: user,
    flow_data: {
      'nodes' => [
        {
          'uuid' => 'start-node',
          'type' => 'send_message',
          'message' => 'Hello from test flow!'
        }
      ]
    }.to_json
  )
  
  if flow.valid?
    puts "✓ Flow model validation passed"
  else
    puts "✗ Flow model validation failed: #{flow.errors.full_messages.join(', ')}"
  end
  
rescue => e
  puts "✗ Flow model test error: #{e.message}"
end

# Test 5: Test service instantiation
puts "\n5. Testing service instantiation..."
begin
  account = Account.first
  if account
    conversation = account.conversations.first
    if conversation
      # Test ExecutionService with keyword arguments
      test_flow = Flow.new(
        name: "Test Execution Flow #{Time.current.to_i}",
        account: account,
        created_by: account.users.first,
        updated_by: account.users.first,
        flow_data: '{"nodes": []}'
      )
      execution_service = Flows::ExecutionService.new(
        flow: test_flow,
        conversation: conversation,
        trigger_data: { event: 'test' }
      )
      puts "✓ Flows::ExecutionService instantiated successfully"
      
      # Test TriggerService with keyword arguments
      trigger_service = Flows::TriggerService.new(
        event_name: 'message_created',
        event_data: { conversation: conversation }
      )
      puts "✓ Flows::TriggerService instantiated successfully"
    else
      puts "⚠ No conversations found for testing services"
    end
  else
    puts "⚠ No accounts found for testing services"
  end
rescue => e
  puts "✗ Service instantiation error: #{e.message}"
end

puts "\n" + "=" * 50
puts "Flow Integration Test Complete"