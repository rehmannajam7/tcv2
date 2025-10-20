class FloweditorController < ApplicationController
  skip_before_action :set_current_user
  before_action :set_iframe_headers
  
  def index
    # Serve the main FlowEditor index.html file
    render file: Rails.root.join('..', 'floweditor', 'index.html'), 
           layout: false, 
           content_type: 'text/html'
  end

  def assets
    # Serve static assets from FlowEditor directory
    file_path = params[:path]
    full_path = Rails.root.join('..', 'floweditor', file_path)
    
    # Security check - ensure the path is within the floweditor directory
    unless full_path.to_s.start_with?(Rails.root.join('..', 'floweditor').to_s)
      return head :not_found
    end
    
    # Check if file exists
    unless File.exist?(full_path)
      return head :not_found
    end
    
    # Determine content type based on file extension
    content_type = case File.extname(file_path).downcase
                   when '.js'
                     'application/javascript'
                   when '.css'
                     'text/css'
                   when '.html'
                     'text/html'
                   when '.json'
                     'application/json'
                   when '.png'
                     'image/png'
                   when '.jpg', '.jpeg'
                     'image/jpeg'
                   when '.gif'
                     'image/gif'
                   when '.svg'
                     'image/svg+xml'
                   when '.ico'
                     'image/x-icon'
                   when '.woff', '.woff2'
                     'font/woff'
                   when '.ttf'
                     'font/ttf'
                   when '.eot'
                     'application/vnd.ms-fontobject'
                   else
                     'application/octet-stream'
                   end
    
    send_file full_path, type: content_type, disposition: 'inline'
  end

  private

  def set_iframe_headers
    # Remove X-Frame-Options to allow iframe embedding
    response.headers.delete('X-Frame-Options')
    
    # Set CSP frame-ancestors to allow embedding from Chatwoot domains
    response.headers['Content-Security-Policy'] = "frame-ancestors 'self' http://localhost:3000 http://10.20.4.131:3000 https://stage.thumb-crowd.com"
  end
end