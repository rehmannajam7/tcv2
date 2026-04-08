# frozen_string_literal: true

# Collects result variable names from a FlowEditor JSON definition so clients
# (e.g. FlowEditor globals / completion) can surface @results.<name> options.
class Flows::DefinitionResultNames
  def self.call(flow_data)
    new(flow_data).call
  end

  def initialize(flow_data)
    @definition =
      if flow_data.is_a?(String)
        parse_json(flow_data)
      elsif flow_data.is_a?(Hash)
        flow_data
      else
        {}
      end
  end

  def call
    names = Set.new
    Array(@definition['nodes']).each { |node| collect_from_node(node, names) }
    names.map(&:strip).reject(&:blank?).uniq.sort
  end

  private

  def parse_json(str)
    return {} if str.blank?

    JSON.parse(str)
  rescue JSON::ParserError
    {}
  end

  def collect_from_node(node, names)
    return unless node.is_a?(Hash)

    add_router_result_name(node, names)
    add_set_run_result_names(node, names)
  end

  def add_router_result_name(node, names)
    r = node.dig('router', 'result_name') || node['result_name']
    names << r.to_s if r.present?
  end

  def add_set_run_result_names(node, names)
    Array(node['actions']).each do |act|
      next unless act.is_a?(Hash) && act['type'].to_s == 'set_run_result'

      n = act['name']
      names << n.to_s if n.present?
    end
  end
end
