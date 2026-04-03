class Captain::Conversation::ResponseBuilderJob < ApplicationJob
  MAX_MESSAGE_LENGTH = 10_000
  retry_on ActiveStorage::FileNotFoundError, attempts: 3, wait: 2.seconds
  retry_on Faraday::BadRequestError, attempts: 3, wait: 2.seconds

  def perform(conversation, assistant)
    @conversation = conversation
    @inbox = conversation.inbox
    @assistant = assistant

    if flow_session_active?
      Rails.logger.info(
        "[CAPTAIN][ResponseBuilderJob] Skipping reply; flow session active for conversation #{conversation.id}"
      )
      return
    end

    return unless conversation_pending?

    if ChatwootApp.chatwoot_cloud? && !captain_response_quota_available?
      Rails.logger.info(
        "[CAPTAIN][ResponseBuilderJob] Aly response quota exhausted for account #{account.id}, skipping job"
      )
      return
    end

    Current.executed_by = @assistant

    if captain_v2_enabled?
      generate_response_with_v2
    else
      generate_and_process_response
    end
  rescue ActiveStorage::FileNotFoundError, Faraday::BadRequestError => e
    log_error(e)
    raise e
  rescue StandardError => e
    handle_error(e)
  ensure
    Current.executed_by = nil
  end

  private

  delegate :account, :inbox, to: :@conversation

  def generate_and_process_response
    history = collect_previous_messages
    @response = Captain::Llm::AssistantChatService.new(assistant: @assistant, conversation: @conversation).generate_response(
      message_history: history
    )
    @response = normalize_captain_response_hash(@response)
    if should_retry_with_compact_history?(@response)
      Rails.logger.warn(
        "[CAPTAIN][ResponseBuilderJob] Empty V1 reply; retrying with compact history for conversation #{@conversation.id}"
      )
      @response = Captain::Llm::AssistantChatService.new(assistant: @assistant, conversation: @conversation).generate_response(
        message_history: compact_captain_message_history(history)
      )
      @response = normalize_captain_response_hash(@response)
    end
    process_response
  end

  def generate_response_with_v2
    history = collect_previous_messages
    @response = Captain::Assistant::AgentRunnerService.new(assistant: @assistant, conversation: @conversation).generate_response(
      message_history: history
    )
    @response = normalize_captain_response_hash(@response)
    if should_retry_with_compact_history?(@response)
      Rails.logger.warn(
        "[CAPTAIN][ResponseBuilderJob] Empty V2 reply; retrying with compact history for conversation #{@conversation.id}"
      )
      @response = Captain::Assistant::AgentRunnerService.new(assistant: @assistant, conversation: @conversation).generate_response(
        message_history: compact_captain_message_history(history)
      )
      @response = normalize_captain_response_hash(@response)
    end
    process_response
  end

  def process_response
    return unless conversation_pending?

    if handoff_requested?
      process_action('handoff')
    else
      ActiveRecord::Base.transaction do
        if create_messages
          Rails.logger.info("[CAPTAIN][ResponseBuilderJob] Incrementing response usage for #{account.id}")
          account.increment_response_usage
        end
      end
    end
  end

  def collect_previous_messages
    @conversation
      .messages
      .where(message_type: [:incoming, :outgoing])
      .where(private: false)
      .map do |message|
      message_hash = {
        content: prepare_multimodal_message_content(message),
        role: determine_role(message)
      }

      # Include agent_name if present in additional_attributes
      message_hash[:agent_name] = message.additional_attributes['agent_name'] if message.additional_attributes&.dig('agent_name').present?

      message_hash
    end
  end

  def determine_role(message)
    message.message_type == 'incoming' ? 'user' : 'assistant'
  end

  def prepare_multimodal_message_content(message)
    Captain::OpenAiMessageBuilderService.new(message: message).generate_content
  end

  def handoff_requested?
    @response.is_a?(Hash) && @response.with_indifferent_access[:response].to_s.strip == 'conversation_handoff'
  end

  def process_action(action)
    case action
    when 'handoff'
      I18n.with_locale(@assistant.account.locale) do
        create_handoff_message
        @conversation.bot_handoff!
        send_out_of_office_message_if_applicable
      end
    end
  end

  def send_out_of_office_message_if_applicable
    # Campaign conversations should never receive OOO templates — the campaign itself
    # serves as the initial outreach, and OOO would be confusing in that context.
    return if @conversation.campaign.present?

    ::MessageTemplates::Template::OutOfOffice.perform_if_applicable(@conversation)
  end

  def create_handoff_message
    create_outgoing_message(
      Conversations::HandoffPublicText.message_for(@conversation, assistant: @assistant)
    )
  end

  # Returns true when a normal assistant reply was posted (counts toward usage).
  # Returns false when we only posted error_fallback due to blank model output (do not increment usage).
  def create_messages
    content = extract_displayable_response(@response)
    if content.blank?
      Rails.logger.error(
        "[CAPTAIN][ResponseBuilderJob] Blank Captain reply for conversation #{@conversation.id}, response_keys=#{@response&.keys}, inspect=#{@response.inspect}"
      )
      create_outgoing_message(I18n.t('conversations.captain.error_fallback'))
      return false
    end

    create_outgoing_message(content, agent_name: @response['agent_name'])
    true
  end

  def extract_displayable_response(response)
    return '' unless response.is_a?(Hash)

    h = response.with_indifferent_access
    h[:response].to_s.strip.presence ||
      h[:content].to_s.strip.presence ||
      h[:text].to_s.strip.presence ||
      h[:message].to_s.strip.presence ||
      h[:answer].to_s.strip.presence ||
      ''
  end

  def normalize_captain_response_hash(resp)
    return resp unless resp.is_a?(Hash)

    h = resp.with_indifferent_access
    text = extract_displayable_response(resp)
    out = h.to_hash.stringify_keys
    out['response'] = text if text.present?
    out
  end

  def should_retry_with_compact_history?(resp)
    return false unless resp.is_a?(Hash)

    h = resp.with_indifferent_access
    return false if h[:response].to_s.strip == 'conversation_handoff'

    extract_displayable_response(resp).blank?
  end

  # After flows, long multimodal history can confuse models; retry with text summaries only.
  def compact_captain_message_history(history)
    history.last(24).map do |msg|
      c = msg[:content]
      next msg unless c.is_a?(Array)

      text, = Captain::OpenAiMessageBuilderService.extract_text_and_attachments(c)
      summary = text.presence || '[earlier message included an attachment]'
      { role: msg[:role], content: summary, agent_name: msg[:agent_name] }.compact
    end
  end

  def create_outgoing_message(message_content, agent_name: nil)
    additional_attrs = {}
    additional_attrs[:agent_name] = agent_name if agent_name.present?

    @conversation.messages.create!(
      message_type: :outgoing,
      account_id: account.id,
      inbox_id: inbox.id,
      sender: @assistant,
      content: message_content,
      additional_attributes: additional_attrs
    )
  end

  # Do not call bot_handoff! here: transient LLM/API failures or blank model output would
  # open the conversation and block all further Aly replies for that thread.
  def handle_error(error)
    log_error(error)
    return true unless conversation_pending?

    I18n.with_locale(@assistant.account.locale) do
      create_outgoing_message(I18n.t('conversations.captain.error_fallback'))
    end
    true
  end

  def log_error(error)
    ChatwootExceptionTracker.new(error, account: account).capture_exception
  end

  def captain_response_quota_available?
    account.usage_limits[:captain][:responses][:current_available].positive?
  end

  def captain_v2_enabled?
    account.feature_enabled?('captain_integration_v2')
  end

  def conversation_pending?
    status = Conversation.uncached { Conversation.where(id: @conversation.id).pick(:status) }
    status == 'pending' || status == Conversation.statuses[:pending]
  end

  def flow_session_active?
    contact = @conversation.contact
    return false unless contact

    FlowExecution.exists?(
      conversation_id: @conversation.id,
      contact_id: contact.id,
      status: %i[pending running]
    )
  end
end
