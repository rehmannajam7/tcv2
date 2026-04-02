# Upstream Chatwoot code references the `Chatwoot` module constant (e.g.
# Chatwoot.encryption_configured?, Chatwoot.mfa_enabled?).
# This fork renamed the Rails application module to `ThumbCrowd`, so we
# create an alias to keep compatibility with all upstream code paths.
Chatwoot = ThumbCrowd unless defined?(Chatwoot)
