class Api::V1::Widget::MessagesController < Api::V1::Widget::BaseController
  before_action :set_conversation, only: [:create]
  before_action :set_message, only: [:update]

  def index
    @messages = conversation.nil? ? [] : message_finder.perform
  end

  def create
    @message = conversation.messages.new(message_params)
    build_attachment
    @message.save!
  end

  def update
    if @message.content_type == 'input_email'
      @message.update!(submitted_email: contact_email)
      ContactIdentifyAction.new(
        contact: @contact,
        params: { email: contact_email, name: contact_name },
        retain_original_contact_name: true
      ).perform
    else
      @message.update!(message_update_params[:message])
      # Quick reply (input_select): flow engine resumes on MESSAGE_CREATED with an incoming
      # message. Creating an incoming message with the selected value triggers the flow.
      # This controller is widget-only (set_web_widget); Facebook/Instagram/WhatsApp/etc.
      # use their own webhooks and never hit this path.
      create_incoming_message_for_quick_reply if quick_reply_submission?
    end
  rescue StandardError => e
    render json: { error: @contact.errors, message: e.message }.to_json, status: :internal_server_error
  end

  private

  def build_attachment
    return if params[:message].blank? || params[:message][:attachments].blank?

    params[:message][:attachments].each do |uploaded_attachment|
      attachment = @message.attachments.new(
        account_id: @message.account_id,
        file: uploaded_attachment
      )

      if uploaded_attachment.is_a?(ActionDispatch::Http::UploadedFile)
        attachment.file_type = helpers.file_type(uploaded_attachment.content_type)
      elsif uploaded_attachment.is_a?(String)
        # Direct upload: frontend sends Active Storage signed_id
        attachment.file_type = helpers.file_type_by_signed_id(uploaded_attachment)
      end
    end
  end

  def set_conversation
    @conversation = create_conversation if conversation.nil?
  end

  def message_finder_params
    {
      filter_internal_messages: true,
      before: permitted_params[:before],
      after: permitted_params[:after]
    }
  end

  def message_finder
    @message_finder ||= MessageFinder.new(conversation, message_finder_params)
  end

  def message_update_params
    params.permit(message: [{ submitted_values: [:name, :title, :value, { csat_survey_response: [:feedback_message, :rating] }] }])
  end

  def permitted_params
    # timestamp parameter is used in create conversation method; attachments may be file uploads or signed_ids (direct upload)
    params.permit(:id, :before, :after, :website_token, contact: [:name, :email],
                                                        message: [:content, :referer_url, :timestamp, :echo_id, :reply_to, { attachments: [] }])
  end

  def set_message
    @message = @web_widget.inbox.messages.find(permitted_params[:id])
  end

  def quick_reply_submission?
    @message.content_type == 'input_select' &&
      message_update_params[:message].present? &&
      message_update_params[:message][:submitted_values].present?
  end

  def create_incoming_message_for_quick_reply
    values = message_update_params[:message][:submitted_values]
    return if values.blank?

    selected = values.is_a?(Array) ? values.first : values
    # Rails permitted params can be ActionController::Parameters (not Hash); use dig/symbolize_keys for safe extraction
    content = extract_quick_reply_content(selected)
    return if content.blank?

    conv = @message.conversation
    conv.messages.create!(
      account_id: conv.account_id,
      inbox_id: conv.inbox_id,
      sender: @contact,
      content: content.to_s,
      message_type: :incoming
    )
  end

  def extract_quick_reply_content(selected)
    return nil if selected.nil?

    # Handle hash-like objects (Hash, ActionController::Parameters) from permitted params
    if selected.respond_to?(:[]) && selected.respond_to?(:key?)
      val = selected['value'] || selected['title'] || selected[:value] || selected[:title]
      return val.to_s.presence
    end
    selected.to_s.presence
  end
end
