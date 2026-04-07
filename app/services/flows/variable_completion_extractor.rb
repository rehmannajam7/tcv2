# frozen_string_literal: true

# Collects FlowEditor result names from stored flow_data for @results.* autocomplete APIs.
class Flows::VariableCompletionExtractor
  FIELD_SUFFIXES = %w[value category input].freeze

  class << self
    def extract_result_names(definition)
      return [] unless definition.is_a?(Hash)

      names = Set.new
      Array(definition['nodes']).each { |node| collect_from_node(node, names) }
      names.map(&:strip).reject(&:blank?).uniq.sort
    end

    # Returns [{ label:, insert:, kind: "result" }, ...] for FlowEditor-style clients.
    def suggestions(definition, query = '')
      names = extract_result_names(definition)
      q = query.to_s.strip.downcase
      items = []

      names.each do |name|
        base = "@results.#{name}"
        items << { label: name, insert: base, kind: 'result', detail: 'default: .value' }
        FIELD_SUFFIXES.each do |field|
          items << { label: "#{name}.#{field}", insert: "#{base}.#{field}", kind: 'result' }
        end
      end

      return items if q.blank?

      items.select do |row|
        row[:insert].downcase.include?(q) || row[:label].downcase.include?(q)
      end
    end

    private

    def collect_from_node(node, names)
      return unless node.is_a?(Hash)

      names << node['result_name'].to_s if node['result_name'].present?
      collect_router_result_name(node['router'], names)
      collect_set_run_result_names(node['actions'], names)
    end

    def collect_router_result_name(router, names)
      return unless router.is_a?(Hash) && router['result_name'].present?

      names << router['result_name'].to_s
    end

    def collect_set_run_result_names(actions, names)
      Array(actions).each do |action|
        next unless action.is_a?(Hash) && action['type'] == 'set_run_result' && action['name'].present?

        names << action['name'].to_s
      end
    end
  end
end
