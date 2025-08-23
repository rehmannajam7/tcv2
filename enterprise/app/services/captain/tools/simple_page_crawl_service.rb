class Captain::Tools::SimplePageCrawlService
  attr_reader :external_link

  def initialize(external_link)
    @external_link = external_link
    @doc = Nokogiri::HTML(HTTParty.get(external_link).body)
  end

  def page_links
    sitemap? ? extract_links_from_sitemap : extract_links_from_html
  end

  def page_title
    title_element = @doc.at_xpath('//title')
    title_element&.text&.strip
  end

  def body_text_content
    ReverseMarkdown.convert @doc.at_xpath('//body'), unknown_tags: :bypass, github_flavored: true
  end

  private

  def sitemap?
    @external_link.end_with?('.xml')
  end

  def extract_links_from_sitemap
    @doc.xpath('//loc').to_set(&:text)
  end

  def extract_links_from_html
    @doc.xpath('//a/@href').filter_map do |link|
      href = link.value.to_s.strip

      # Skip empty, anchor-only, or non-HTTP(S) schemes
      next if href.blank? || href.start_with?('#') ||
              href.start_with?('tel:', 'mailto:', 'javascript:', 'ftp:')

      begin
        # Try to create absolute URL
        absolute_url = URI.join(@external_link, href).to_s

        # Validate the resulting URL is HTTP(S)
        parsed_url = URI.parse(absolute_url)
        next unless parsed_url.is_a?(URI::HTTP) || parsed_url.is_a?(URI::HTTPS)

        absolute_url
      rescue URI::InvalidURIError => e
        Rails.logger.warn("Skipping invalid URI: #{href} - #{e.message}")
        next
      end
    end.to_set
  end
end
