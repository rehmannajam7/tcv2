class Api::V1::Accounts::FlowEditor::SimulateController < ApplicationController
  def start
    Rails.logger.info "SimulateController: start action called"
    
    # Handle flow simulation start
    # This would typically initialize a new simulation session
    simulation_result = {
      session: {
        uuid: SecureRandom.uuid,
        status: 'active',
        contact: {
          uuid: SecureRandom.uuid,
          name: 'Test Contact',
          urns: ['tel:+1234567890']
        },
        runs: [],
        events: [],
        created_on: Time.current.iso8601
      }
    }

    Rails.logger.info "SimulateController: start returning: #{simulation_result}"

    render json: simulation_result
  rescue => e
    Rails.logger.error "SimulateController start error: #{e.message}"
    Rails.logger.error e.backtrace.join("\n")
    render json: { error: e.message }, status: 500
  end

  def resume
    Rails.logger.info "SimulateController: resume action called"
    
    # Handle flow simulation resume
    # This would typically continue an existing simulation session
    simulation_result = {
      session: {
        uuid: params[:session_uuid] || SecureRandom.uuid,
        status: 'active',
        contact: {
          uuid: SecureRandom.uuid,
          name: 'Test Contact',
          urns: ['tel:+1234567890']
        },
        runs: [],
        events: [],
        updated_on: Time.current.iso8601
      }
    }

    Rails.logger.info "SimulateController: resume returning: #{simulation_result}"

    render json: simulation_result
  rescue => e
    Rails.logger.error "SimulateController resume error: #{e.message}"
    Rails.logger.error e.backtrace.join("\n")
    render json: { error: e.message }, status: 500
  end
end