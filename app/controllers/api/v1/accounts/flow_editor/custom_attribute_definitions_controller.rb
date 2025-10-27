class Api::V1::Accounts::FlowEditor::CustomAttributeDefinitionsController < Api::V1::Accounts::FlowEditor::BaseController
  before_action :check_authorization

  def index
    # Return custom attribute definitions in the format expected by FlowEditor
    fields = Current.account.custom_attribute_definitions.map do |field|
      {
        key: field.attribute_key,
        name: field.attribute_display_name,
        value_type: map_attribute_type(field.attribute_display_type)
      }
    end

    # Add default contact fields
    default_fields = [
      { key: 'name', name: 'Name', value_type: 'text' },
      { key: 'email', name: 'Email', value_type: 'text' },
      { key: 'phone_number', name: 'Phone Number', value_type: 'text' }
    ]

    # FlowEditor expects response format: { results: [...], next: null }
    render json: {
      results: default_fields + fields,
      next: nil
    }
  end

  private

  def check_authorization
    authorize :custom_attribute_definition, :index?
  end

  def map_attribute_type(chatwoot_type)
    case chatwoot_type
    when 'text', 'link'
      'text'
    when 'number'
      'numeric'
    when 'date'
      'datetime'
    when 'list'
      'text'
    else
      'text'
    end
  end
end