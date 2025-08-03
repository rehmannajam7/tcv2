class LandingController < ApplicationController
  skip_before_action :set_current_user
  # Remove this line: skip_before_action :verify_authenticity_token
  layout 'landing'

  def index
    # Landing page logic here
    @global_config = GlobalConfig.get(
      'LOGO', 'LOGO_DARK', 'LOGO_THUMBNAIL',
      'INSTALLATION_NAME',
      'BRAND_URL', 'BRAND_NAME'
    )
  end
end
