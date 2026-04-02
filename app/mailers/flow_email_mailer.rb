class FlowEmailMailer < ApplicationMailer
  def flow_email(to:, subject:, body:, account: nil, conversation: nil)
    return unless smtp_config_set_or_development?

    @body = body
    @conversation = conversation
    Current.account = account if account

    mail(
      to: to,
      subject: subject
    ) do |format|
      format.html { render html: @body.html_safe }
      format.text { render plain: strip_tags(@body) }
    end
  end
end
