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

  def meta_description
    meta_desc = @doc.at_css('meta[name="description"]')
    return nil unless meta_desc && meta_desc['content']

    meta_desc['content'].strip
  end

  def favicon_url
    favicon_link = @doc.at_css('link[rel*="icon"]')
    return nil unless favicon_link && favicon_link['href']

    resolve_url(favicon_link['href'])
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
      next if invalid_href?(href)

      create_absolute_url(href)
    end.to_set
  end

  def invalid_href?(href)
    href.blank? || href.start_with?('#') || non_http_scheme?(href)
  end

  def non_http_scheme?(href)
    href.start_with?('tel:', 'mailto:', 'javascript:', 'ftp:')
  end

  def create_absolute_url(href)
    absolute_url = URI.join(@external_link, href).to_s
    parsed_url = URI.parse(absolute_url)

    return absolute_url if valid_http_url?(parsed_url)

    nil
  rescue URI::InvalidURIError => e
    Rails.logger.warn("Skipping invalid URI: #{href} - #{e.message}")
    nil
  end

  def valid_http_url?(parsed_url)
    parsed_url.is_a?(URI::HTTP) || parsed_url.is_a?(URI::HTTPS)
  end

  def resolve_url(url)
    return url if url.start_with?('http')

    URI.join(@external_link, url).to_s
  rescue StandardError
    url
  end
end
