# Lightweight per-conversation flow queue managed via Rails.cache
class Flows::QueueService
  def initialize(conversation)
    @conversation = conversation
  end

  def enqueue(flow)
    return unless flow&.id

    queue = read_queue
    # Deduplicate by flow_id to avoid repeated enqueues within short periods
    return if queue.any? { |entry| entry[:flow_id] == flow.id }

    queue << {
      flow_id: flow.id,
      account_id: flow.account_id,
      inbox_id: @conversation.inbox_id,
      queued_at: Time.current.to_i
    }
    write_queue(queue)
  end

  def dequeue_next
    queue = read_queue
    entry = queue.shift
    write_queue(queue)
    entry
  end

  def peek
    read_queue.dup
  end

  def clear
    Rails.cache.delete(cache_key)
  end

  private

  def cache_key
    "flow_queue:conversation:#{@conversation.id}"
  end

  def read_queue
    Rails.cache.read(cache_key) || []
  end

  def write_queue(queue)
    # Keep a modest TTL to avoid stale entries lingering forever
    Rails.cache.write(cache_key, queue, expires_in: 24.hours)
  end
end
