class Flows::CleanupJob < ApplicationJob
  queue_as :default

  def perform(ttl_minutes: ENV.fetch('FLOW_SESSION_TTL', '30').to_i)
    cutoff = ttl_minutes.minutes.ago
    FlowExecution.pending.find_each do |exec|
      paused_at = exec.context.is_a?(Hash) ? exec.context['paused_at'] : nil
      begin
        paused_time = paused_at ? Time.zone.parse(paused_at.to_s) : nil
      rescue StandardError
        paused_time = nil
      end
      next unless paused_time && paused_time < cutoff

      exec.update!(status: :completed, completed_at: Time.current, context: {})

      # Clean up stale cache keys for this conversation
      cleanup_stale_cache_keys(exec.conversation)
    end
  end

  private

  def cleanup_stale_cache_keys(conversation)
    # Clean up old flow cache keys that might be causing issues
    Rails.cache.delete_matched("flow:last_trigger_message:conversation:#{conversation.id}")
    Rails.cache.delete_matched("flow:message_processing:conversation:#{conversation.id}:*")

    Rails.logger.info "Cleaned up stale cache keys for conversation #{conversation.id}"
  rescue StandardError => e
    Rails.logger.error "Error cleaning up stale cache keys: #{e.message}"
  end
end
