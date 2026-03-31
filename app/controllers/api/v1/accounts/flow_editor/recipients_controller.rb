class Api::V1::Accounts::FlowEditor::RecipientsController < Api::V1::Accounts::FlowEditor::BaseController
  before_action :check_authorization

  def index
    # Return recipients in the format expected by FlowEditor
    # Map Chatwoot contacts to recipient format
    recipients = Current.account.contacts.limit(100).map do |contact|
      {
        uuid: SecureRandom.uuid,
        name: contact.name || 'Unknown',
        created_on: contact.created_at.iso8601,
        modified_on: contact.updated_at.iso8601,
        urns: build_contact_urns(contact)
      }
    end

    # FlowEditor expects response format: { results: [...], next: null }
    render json: {
      results: recipients,
      next: nil
    }
  end

  private

  def check_authorization
    authorize Current.account, :show?
  end

  def build_contact_urns(contact)
    urns = []

    # Add phone number URN if available
    urns << "tel:#{contact.phone_number}" if contact.phone_number.present?

    # Add email URN if available
    urns << "mailto:#{contact.email}" if contact.email.present?

    # Add WhatsApp URN if available (check contact inboxes)
    contact.contact_inboxes.joins(:inbox).where(inboxes: { channel_type: 'Channel::Whatsapp' }).find_each do |contact_inbox|
      urns << "whatsapp:#{contact_inbox.source_id}" if contact_inbox.source_id.present?
    end

    urns
  end
end
