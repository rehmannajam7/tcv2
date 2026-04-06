/**
 * FlowEditor Endpoint Configuration for Chatwoot Integration
 *
 * This file configures the API endpoints that FlowEditor expects to communicate
 * with the Chatwoot backend. It maps FlowEditor's endpoint expectations to
 * Chatwoot's actual API routes.
 */

/**
 * Get the base API URL for FlowEditor backend
 * This will point to the FlowEditor server which proxies to Chatwoot
 */
function getBaseApiUrl() {
  // Extract account ID from URL parameters or path
  const urlParams = new URLSearchParams(window.location.search);
  // Accept multiple spellings for account ID
  let accountId =
    urlParams.get('account_id') ||
    urlParams.get('accountId') ||
    urlParams.get('accountid');

  // If not found in query params, try to extract from URL path
  if (!accountId) {
    const pathMatch = window.location.pathname.match(/\/accounts\/(\d+)/);
    if (pathMatch) {
      accountId = pathMatch[1];
    }
  }

  if (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  ) {
    const isFlowEditorUI = String(window.location.port) === '3001';
    const directApiBase = `http://localhost:8000/api/v1`;
    const proxyBase = `${window.location.origin}/floweditor-api/api/v1`;
    const baseToUse = isFlowEditorUI ? directApiBase : proxyBase;
    console.log('🔧 Using development API base:', baseToUse);

    if (!accountId) {
      console.warn('No account ID found in URL parameters');
      return `${baseToUse}/accounts/1`;
    }

    return `${baseToUse}/accounts/${accountId}`;
  }

  // Resolve FlowEditor API base dynamically from Chatwoot config, env, or same-origin proxy
  const resolveFlowEditorApiBase = () => {
    try {
      const cfg =
        (typeof window !== 'undefined' && window.chatwootConfig) || {};
      const fromConfig =
        cfg.flowEditorApiBaseUrl ||
        cfg.flowEditorBaseUrl ||
        cfg.floweditorApiBaseUrl;

      // Vite env in development (guard against missing import.meta)
      let viteEnvBase = null;
      if (
        typeof import.meta !== 'undefined' &&
        import.meta &&
        import.meta.env
      ) {
        viteEnvBase =
          import.meta.env.VITE_FLOWEDITOR_API_BASE ||
          import.meta.env.VITE_API_BASE_URL ||
          null;
      }

      // Detect when running inside Chatwoot app and prefer its API base
      const isChatwootApp =
        typeof window !== 'undefined' &&
        window.location.pathname.includes('/app/accounts/');

      // Choose base: prefer config/env; otherwise use Chatwoot '/api/v1' inside app,
      // and proxy '/floweditor-api' elsewhere
      let baseCandidate = fromConfig || viteEnvBase || null;
      if (!baseCandidate) {
        baseCandidate = isChatwootApp
          ? `${window.location.origin}/api/v1`
          : `${window.location.origin}/floweditor-api`;
      }

      let base = String(baseCandidate).replace(/\/$/, '');

      // Ensure the base URL ends with '/api/v1' unless it already specifies an API version
      if (!/\/api\/v\d+$/i.test(base)) {
        base = `${base}/api/v1`;
      }

      console.log('🔧 Resolved FlowEditor API base:', base);
      return base;
    } catch (e) {
      console.warn(
        'Failed to resolve FlowEditor API base; using proxy fallback',
        e,
      );
      // Use the proxy path as fallback instead of hardcoded localhost:8000
      return `${window.location.origin}/floweditor-api/api/v1`;
    }
  };

  const flowEditorApiBase = resolveFlowEditorApiBase();

  if (!accountId) {
    console.warn('No account ID found in URL parameters');
    return `${flowEditorApiBase}/accounts/1`; // fallback
  }

  return `${flowEditorApiBase}/accounts/${accountId}`;
}

/**
 * Create FlowEditor endpoints configuration
 * Maps FlowEditor's expected endpoints to Chatwoot's API structure
 */
export function createEndpointsConfig() {
  const baseUrl = getBaseApiUrl();

  return {
    // Flow management endpoints
    flows: `${baseUrl}/flow_editor/flows`,
    revisions: `${baseUrl}/flow_editor/flows`, // Will append /{flowId}/revisions
    activity: `${baseUrl}/flow_editor/activity`,

    // Asset endpoints
    groups: `${baseUrl}/flow_editor/groups`,
    contacts: `${baseUrl}/flow_editor/recipients`,
    recipients: `${baseUrl}/flow_editor/recipients`,
    fields: `${baseUrl}/flow_editor/custom_attribute_definitions`,
    labels: `${baseUrl}/flow_editor/labels`,
    channels: `${baseUrl}/flow_editor/channels`,
    languages: `${baseUrl}/flow_editor/languages`,

    // Template and completion endpoints
    templates: `${baseUrl}/flow_editor/templates`,
    completion: `${baseUrl}/flow_editor/completion`,

    // Integration endpoints
    resthooks: `${baseUrl}/flow_editor/resthooks`,
    ticketers: `${baseUrl}/flow_editor/ticketers`,
    classifiers: `${baseUrl}/flow_editor/classifiers`,

    // Editor configuration endpoints
    editor: `${baseUrl}/flow_editor/editor`,
    environment: `${baseUrl}/flow_editor/environment`,

    // Simulation endpoints
    simulate: `${baseUrl}/flow_editor/simulate_start`,
    // Legacy underscore keys kept for backward compatibility
    simulate_start: `${baseUrl}/flow_editor/simulate_start`,
    simulate_resume: `${baseUrl}/flow_editor/simulate_resume`,
    // CamelCase keys used by Simulator.tsx and Flow.tsx
    simulateStart: `${baseUrl}/flow_editor/simulate_start`,
    simulateResume: `${baseUrl}/flow_editor/simulate_resume`,

    // Additional endpoints
    attachments: `${baseUrl}/flow_editor/attachments`,
    globals: `${baseUrl}/flow_editor/globals`,

    // Brain/AI endpoints (if available)
    brain: `${baseUrl}/flow_editor/brain`,

    // External services
    external_services: `${baseUrl}/flow_editor/external_services`,
    external_services_calls: `${baseUrl}/flow_editor/external_services_calls`,
    external_services_calls_base: `${baseUrl}/flow_editor/external_services_calls`,

    // WhatsApp specific endpoints
    whatsapp_products: `${baseUrl}/flow_editor/whatsapp_products`,
    whatsapp_flows: `${baseUrl}/flow_editor/whatsapp_flows`,

    // Knowledge base endpoints
    knowledgeBases: `${baseUrl}/flow_editor/knowledge_bases`,
    captainAssistants: `${baseUrl}/captain/assistants`,

    // Ticketer queues
    ticketer_queues: `${baseUrl}/flow_editor/ticketer_queues`,
  };
}

/**
 * Get endpoints configuration with dynamic account ID
 */
export function getEndpoints() {
  return createEndpointsConfig();
}

/**
 * Create a complete FlowEditor configuration object
 */
export function createFlowEditorConfig(options = {}) {
  const urlParams = new URLSearchParams(window.location.search);
  const flowId =
    urlParams.get('flow') || urlParams.get('flow_uuid') || options.flowId;
  const accountId =
    urlParams.get('account_id') ||
    urlParams.get('accountId') ||
    options.accountId;
  const token = urlParams.get('token') || options.token;

  // Use endpoints from options (passed from parent window) if available,
  // otherwise fall back to our generated endpoints
  const endpoints = options.endpoints || getEndpoints();

  return {
    // Core configuration
    localStorage: true,
    endpoints: endpoints,
    flow: flowId || 'new',
    flowType: 'messaging',

    // UI configuration
    showTemplates: true,
    showDownload: true,
    mutable: true,
    debug: process.env.NODE_ENV === 'development',

    // Branding
    brand: 'ThumbCrowd',

    // Authentication
    accountId: accountId,
    token: token,

    // HTTP configuration
    httpTimeout: 10000,

    // Help links (can be customized)
    help: {
      flows: 'https://docs.thumb-crowd.com/flows',
      actions: 'https://docs.thumb-crowd.com/flows/actions',
      expressions: 'https://docs.thumb-crowd.com/flows/expressions',
    },

    // Feature flags
    forceSaveOnLoad: false,
    showNewUpdates: true,

    // Merge any additional options (this will override defaults if provided)
    ...options,
  };
}

export default {
  createEndpointsConfig,
  getEndpoints,
  createFlowEditorConfig,
};
