class Api::V1::Accounts::FlowEditor::FieldsController < Api::V1::Accounts::FlowEditor::BaseController
  before_action :check_authorization

  def index
    # Return fields in the format expected by FlowEditor
    # Map Chatwoot custom attributes to fields format
    fields = Current.account.custom_attribute_definitions.map do |attr|
      {
        key: attr.attribute_key,
        name: attr.attribute_display_name,
        value_type: map_attribute_type(attr.attribute_display_type)
      }
    end

    # Add default contact fields
    default_fields = [
      { key: 'name', name: 'Name', value_type: 'text' },
      { key: 'email', name: 'Email', value_type: 'text' },
      { key: 'phone', name: 'Phone', value_type: 'text' },
      { key: 'language', name: 'Language', value_type: 'text' }
    ]

    # FlowEditor expects response format: { results: [...], next: null }
    render json: {
      results: (default_fields + fields).first(50),
      next: nil
    }
  end

  private

  def check_authorization
    authorize Current.account, :show?
  end

  def map_attribute_type(chatwoot_type)
    case chatwoot_type
    when 'text', 'link'
      'text'
    when 'number'
      'number'
    when 'date'
      'datetime'
    when 'list'
      'text'
    when 'checkbox'
      'text'
    else
      'text'
    end
  end
end