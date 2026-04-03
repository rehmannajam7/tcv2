module Featurable
  extend ActiveSupport::Concern

  QUERY_MODE = {
    flag_query_mode: :bit_operator,
    check_for_column: false
  }.freeze

  FEATURE_LIST = YAML.safe_load(Rails.root.join('config/features.yml').read).freeze

  FEATURES = FEATURE_LIST.each_with_object({}) do |feature, result|
    result[result.keys.size + 1] = "feature_#{feature['name']}".to_sym
  end

  included do
    include FlagShihTzu
    has_flags FEATURES.merge(column: 'feature_flags').merge(QUERY_MODE)

    before_create :enable_default_features
  end

  def enable_features(*names)
    names.each do |name|
      send("feature_#{name}=", true)
    end
  end

  def enable_features!(*names)
    enable_features(*names)
    save
  end

  def disable_features(*names)
    names.each do |name|
      send("feature_#{name}=", false)
    end
  end

  def disable_features!(*names)
    disable_features(*names)
    save
  end

  def feature_enabled?(name)
    send("feature_#{name}?")
  end

  def all_features
    FEATURE_LIST.pluck('name').index_with do |feature_name|
      feature_enabled?(feature_name)
    end
  end

  def enabled_features
    all_features.select { |_feature, enabled| enabled == true }
  end

  def disabled_features
    all_features.select { |_feature, enabled| enabled == false }
  end

  # Bulk-assign account features from Super Admin (enabled_features checkboxes).
  # Params use FlagShihTzu flag ids (e.g. :feature_flow_editor). Enterprise prepends call `super`.
  def selected_feature_flags=(features)
    return if features.nil?

    selected = Array(features).map(&:to_sym).to_set
    premium_names = FEATURE_LIST.select { |f| f['premium'] }.pluck('name')
    skip_premium = ChatwootApp.enterprise? && ChatwootHub.pricing_plan == 'community'

    manageable_super_admin_feature_names.each do |name|
      next if skip_premium && premium_names.include?(name)

      setter = :"feature_#{name}="
      send(setter, selected.include?(:"feature_#{name}"))
    end
  end

  private

  def manageable_super_admin_feature_names
    names = FEATURE_LIST.pluck('name')
    unless ChatwootApp.chatwoot_cloud?
      internal = FEATURE_LIST.select { |f| f['chatwoot_internal'] }.pluck('name')
      names -= internal
    end
    deprecated = FEATURE_LIST.select { |f| f['deprecated'] }.pluck('name')
    names - deprecated
  end

  def enable_default_features
    config = InstallationConfig.find_by(name: 'ACCOUNT_LEVEL_FEATURE_DEFAULTS')
    return true if config.blank?

    features_to_enabled = config.value.select { |f| f[:enabled] }.pluck(:name)
    enable_features(*features_to_enabled)
  end
end
