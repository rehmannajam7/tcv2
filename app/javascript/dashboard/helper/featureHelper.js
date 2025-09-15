const FEATURE_HELP_URLS = {
  agent_bots: 'https://stage.thumb-crowd.com/hc/agent-bots',
  agents: 'https://stage.thumb-crowd.com/hc/agents',
  audit_logs: 'https://stage.thumb-crowd.com/hc/audit-logs',
  campaigns: 'https://stage.thumb-crowd.com/hc/campaigns',
  canned_responses: 'https://stage.thumb-crowd.com/hc/canned',
  channel_email: 'https://stage.thumb-crowd.com/hc/email',
  channel_facebook: 'https://stage.thumb-crowd.com/hc/fb',
  custom_attributes: 'https://stage.thumb-crowd.com/hc/custom-attributes',
  dashboard_apps: 'https://stage.thumb-crowd.com/hc/dashboard-apps',
  help_center: 'https://stage.thumb-crowd.com/hc/help-center',
  inboxes: 'https://stage.thumb-crowd.com/hc/inboxes',
  integrations: 'https://stage.thumb-crowd.com/hc/integrations',
  labels: 'https://stage.thumb-crowd.com/hc/labels',
  macros: 'https://stage.thumb-crowd.com/hc/macros',
  message_reply_to: 'https://stage.thumb-crowd.com/hc/reply-to',
  reports: 'https://stage.thumb-crowd.com/hc/reports',
  sla: 'https://stage.thumb-crowd.com/hc/sla',
  team_management: 'https://stage.thumb-crowd.com/hc/teams',
  webhook: 'https://stage.thumb-crowd.com/hc/webhooks',
  billing: 'https://stage.thumb-crowd.com/pricing',
};

export function getHelpUrlForFeature(featureName) {
  return FEATURE_HELP_URLS[featureName];
}
