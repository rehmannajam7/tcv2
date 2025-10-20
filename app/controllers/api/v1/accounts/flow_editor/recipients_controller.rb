class Api::V1::Accounts::FlowEditor::RecipientsController < Api::V1::Accounts::BaseController
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
    if contact.phone_number.present?
      urns << "tel:#{contact.phone_number}"
    end
    
    # Add email URN if available
    if contact.email.present?
      urns << "mailto:#{contact.email}"
    end
    
    # Add WhatsApp URN if available (check contact inboxes)
    contact.contact_inboxes.joins(:inbox).where(inboxes: { channel_type: 'Channel::Whatsapp' }).each do |contact_inbox|
      if contact_inbox.source_id.present?
        urns << "whatsapp:#{contact_inbox.source_id}"
      end
    end
    
    urns
  end
end