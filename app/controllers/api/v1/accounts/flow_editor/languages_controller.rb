class Api::V1::Accounts::FlowEditor::LanguagesController < Api::V1::Accounts::FlowEditor::BaseController
  before_action :check_authorization

  def index
    # Return languages in the format expected by FlowEditor
    languages = [
      { iso: 'eng', name: 'English' },
      { iso: 'spa', name: 'Spanish' },
      { iso: 'fra', name: 'French' },
      { iso: 'por', name: 'Portuguese' },
      { iso: 'deu', name: 'German' },
      { iso: 'ita', name: 'Italian' },
      { iso: 'rus', name: 'Russian' },
      { iso: 'ara', name: 'Arabic' },
      { iso: 'hin', name: 'Hindi' },
      { iso: 'zho', name: 'Chinese' }
    ]

    # FlowEditor expects response format: { results: [...], next: null }
    render json: {
      results: languages,
      next: nil
    }
  end

  private

  def check_authorization
    authorize Current.account, :show?
  end
end