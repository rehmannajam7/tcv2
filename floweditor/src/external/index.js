/* istanbul ignore file */

// External module for FlowEditor integration
// This module provides implementations for all functions required by the FlowEditor

import { createUUID } from '../utils';
import { getEndpoints } from '../config/endpoints.js';
import { fetchAsset as utilsFetchAsset } from '../utils';

// Authentication and storage functions
const storeAuthToken = token => {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem('floweditor_auth_token', token);
  }
};

const getStoredAuthToken = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage.getItem('floweditor_auth_token');
  }
  return null;
};

const storeAccountId = accountId => {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem('floweditor_account_id', accountId);
  }
};

const getStoredAccountId = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage.getItem('floweditor_account_id');
  }
  return null;
};

const storeAuthTokenData = data => {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem('floweditor_auth_data', JSON.stringify(data));
  }
};

const getStoredAuthTokenData = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const data = window.localStorage.getItem('floweditor_auth_data');
    return data ? JSON.parse(data) : {};
  }
  return {};
};

const extractAuthDataFromUrl = () => {
  const urlParams = new URLSearchParams(window.location.search);
  return {
    token: urlParams.get('token'),
    // Support multiple param spellings for account ID
    accountId:
      urlParams.get('account_id') ||
      urlParams.get('accountId') ||
      urlParams.get('accountid'),
  };
};

const clearStoredAuth = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem('floweditor_auth_token');
    window.localStorage.removeItem('floweditor_account_id');
    window.localStorage.removeItem('floweditor_auth_data');
  }
};

// Global state variables
let currentAuthToken = null;
let currentAccountContext = null;

const setAuthTokenData = data => {
  storeAuthTokenData(data);
};

const getAuthTokenData = () => {
  return getStoredAuthTokenData();
};

const initializeAuthFromStorage = () => {
  currentAuthToken = getStoredAuthToken();
  currentAccountContext = getStoredAccountId();
};

const initializeAuthFromUrl = () => {
  const authData = extractAuthDataFromUrl();
  if (authData.token) {
    setAuthToken(authData.token);
  }
  if (authData.accountId) {
    setAccountContext(authData.accountId);
  }
};

const extractTokenFromUrl = () => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('token');
};

const extractAccountIdFromUrl = () => {
  const urlParams = new URLSearchParams(window.location.search);
  // Support both camelCase and snake_case for account id
  return (
    urlParams.get('account_id') ||
    urlParams.get('accountId') ||
    urlParams.get('accountid')
  );
};

const setAuthToken = token => {
  currentAuthToken = token;
  storeAuthToken(token);
};

const getAuthToken = () => {
  const direct = currentAuthToken || getStoredAuthToken();
  if (direct) return direct;
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const fromUrl =
      urlParams.get('token') ||
      urlParams.get('api_access_token') ||
      urlParams.get('api-access-token') ||
      urlParams.get('x-api-access-token');
    if (fromUrl) {
      setAuthToken(fromUrl);
      return fromUrl;
    }
    const cookieVal = (() => {
      const value = `; ${document.cookie}`;
      const names = [
        'api_access_token',
        'api-access-token',
        'x-api-access-token',
      ];
      for (const name of names) {
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2)
          return parts
            .pop()
            .split(';')
            .shift();
      }
      return null;
    })();
    if (cookieVal) {
      setAuthToken(cookieVal);
      return cookieVal;
    }
    const fromStorage =
      (typeof window !== 'undefined' &&
        window.localStorage &&
        (window.localStorage.getItem('api_access_token') ||
          window.localStorage.getItem('api-access-token') ||
          window.localStorage.getItem('x-api-access-token'))) ||
      null;
    if (fromStorage) {
      setAuthToken(fromStorage);
      return fromStorage;
    }
    const fromConfig =
      (typeof window !== 'undefined' &&
        window.chatwootConfig &&
        (window.chatwootConfig.apiAccessToken ||
          window.chatwootConfig.api_access_token)) ||
      null;
    if (fromConfig) {
      setAuthToken(fromConfig);
      return fromConfig;
    }
  } catch (_) {}
  return null;
};

const setAccountContext = accountId => {
  const previousAccountId = currentAccountContext || getStoredAccountId();

  // If switching to a different account, clear localStorage cache to prevent data conflicts
  if (previousAccountId && previousAccountId !== accountId) {
    console.log(
      'Account context changed from',
      previousAccountId,
      'to',
      accountId,
      '- clearing localStorage cache',
    );

    // Clear flow-related localStorage items
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith('floweditor_') ||
          key.startsWith('flow_') ||
          key.startsWith('asset_') ||
          key.includes('definition') ||
          key.includes('revision') ||
          key.includes('flowstore'))
      ) {
        keysToRemove.push(key);
      }
    }

    // Remove the identified keys
    keysToRemove.forEach(key => {
      console.log('Removing localStorage key:', key);
      localStorage.removeItem(key);
    });

    // Clear any cached AssetStore data
    if (window.AssetStore) {
      console.log('Clearing AssetStore cache');
      // Reset AssetStore if it has a clear method
      if (typeof window.AssetStore.clear === 'function') {
        window.AssetStore.clear();
      }
    }

    console.log('localStorage cache cleared for account switch');
  }

  currentAccountContext = accountId;
  storeAccountId(accountId);
};

const getAccountContext = () => {
  const direct = currentAccountContext || getStoredAccountId();
  if (direct) return direct;
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const fromParams =
      urlParams.get('account_id') ||
      urlParams.get('accountId') ||
      urlParams.get('accountid');
    if (fromParams) {
      setAccountContext(fromParams);
      return fromParams;
    }
    const pathMatch = window.location.pathname.match(/\/accounts\/(\d+)/);
    if (pathMatch && pathMatch[1]) {
      setAccountContext(pathMatch[1]);
      return pathMatch[1];
    }
  } catch (_) {}
  return null;
};

const setHTTPTimeout = timeout => {
  // Store timeout configuration
  if (typeof window !== 'undefined') {
    window.flowEditorHTTPTimeout = timeout;
  }
};

// Normalize flow definition from different backends (Rails/Node/Test)
const pickFlowDefinitionFromResponse = data => {
  let def = data?.flow_data ?? data?.definition ?? data?.definition_json;
  if (typeof def === 'string') {
    try {
      def = JSON.parse(def);
    } catch (_) {
      // keep as string if parsing fails
    }
  }
  return def;
};

// Identifier resolution helpers to support Chatwoot Rails (numeric IDs) and Node/test (UUIDs)
const isChatwootFlowsEndpoint = rawUrl => {
  try {
    const base = String(rawUrl || '');
    return /\/flow_editor\/flows(?:\/|$)/.test(base);
  } catch (_) {
    return false;
  }
};

const extractNumericFlowIdFromUrl = () => {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const candidate = params.get('flow') || params.get('id');
  return candidate && /^\d+$/.test(String(candidate))
    ? String(candidate)
    : null;
};

const resolveFlowIdentifier = (
  endpoint,
  fallbackDefinition,
  fallbackFromParams = true,
) => {
  const base =
    typeof endpoint === 'string' ? endpoint : endpoint?.endpoint || '';

  // Prefer numeric id for Chatwoot Rails endpoints
  if (isChatwootFlowsEndpoint(base)) {
    const numericFromUrl = fallbackFromParams
      ? extractNumericFlowIdFromUrl()
      : null;
    if (numericFromUrl) return numericFromUrl;
    const defId = fallbackDefinition?.id ?? fallbackDefinition?.flow_id;
    if (defId != null && /^\d+$/.test(String(defId))) return String(defId);
  }

  // Fallback to UUID via definition or common URL params
  const defUuid = fallbackDefinition?.uuid;
  if (defUuid) return String(defUuid);
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const uuidParam =
      params.get('uuid') || params.get('flow_uuid') || params.get('flow');
    if (uuidParam) return String(uuidParam);
  }
  return null;
};

// Asset management functions
const createAssetStore = async passedEndpoints => {
  console.log('🏪 createAssetStore called with endpoints:', passedEndpoints);
  const endpoints = passedEndpoints || getEndpoints();
  console.log('🏪 Final endpoints:', endpoints);

  // Create the base asset store
  const assetStore = {
    fields: { type: 'Field', items: {}, endpoint: endpoints.fields, id: 'key' },
    groups: {
      type: 'Group',
      items: {},
      endpoint: endpoints.groups,
      id: 'uuid',
    },
    labels: {
      type: 'Label',
      items: {},
      endpoint: endpoints.labels,
      id: 'uuid',
    },
    results: {
      type: 'Result',
      items: {},
      endpoint: endpoints.results,
      id: 'key',
    },
    languages: {
      type: 'Language',
      items: {},
      endpoint: endpoints.languages,
      id: 'iso',
    },
    channels: {
      type: 'Channel',
      items: {},
      endpoint: endpoints.channels,
      id: 'uuid',
    },
    classifiers: {
      type: 'Classifier',
      items: {},
      endpoint: endpoints.classifiers,
      id: 'uuid',
    },
    ticketers: {
      type: 'Ticketer',
      items: {},
      endpoint: endpoints.ticketers,
      id: 'uuid',
    },
    resthooks: {
      type: 'Resthook',
      items: {},
      endpoint: endpoints.resthooks,
      id: 'slug',
    },
    templates: {
      type: 'Template',
      items: {},
      endpoint: endpoints.templates,
      id: 'uuid',
    },
    recipients: {
      type: 'Contact',
      items: {},
      endpoint: endpoints.recipients,
      id: 'uuid',
    },
    completion: {
      type: 'Expression',
      items: {},
      endpoint: endpoints.completion,
      id: 'name',
    },
    knowledgeBases: {
      type: 'KnowledgeBase',
      items: {},
      endpoint: endpoints.knowledgeBases,
      id: 'id',
    },
    captainKnowledgeBases: {
      type: 'CaptainAssistant',
      items: {},
      endpoint: endpoints.captainAssistants,
      id: 'id',
    },
    whatsapp_flows: { type: 'WhatsAppFlow', items: {} },
    flows: { type: 'Flow', items: {} },
    revisions: {
      type: 'Revision',
      items: {},
      endpoint: endpoints.revisions,
      id: 'id',
    },
  };

  console.log('🏪 Asset store structure created:', assetStore);
  console.log('🏪 Channels config:', assetStore.channels);

  // Load all our assets in parallel
  const promises = [];
  for (const key of Object.keys(assetStore)) {
    const store = assetStore[key];
    if (store.endpoint) {
      console.log(`🏪 Queuing asset loading for ${key}:`, store);
      promises.push(
        getAssets(store.endpoint, store.type, store.id)
          .then(assets => {
            console.log(`🏪 Assets loaded for ${key}:`, assets);
            if (key === 'channels') {
              console.log('🏪 CHANNELS LOADED - Count:', assets.length);
              console.log('🏪 CHANNELS LOADED - Items:', assets);
            }
            store.items = assets;
          })
          .catch(error => {
            console.error(`🏪 Failed to load assets for ${key}:`, error);
            store.items = {};
          }),
      );
    }
  }

  console.log('🏪 Waiting for all assets to load...');
  await Promise.all(promises);

  console.log('🏪 All assets loaded. Final asset store:', assetStore);
  console.log('🏪 Final channels items:', assetStore.channels.items);

  // Add to window for debugging
  // Expose debugging functions to window for easy access
  window.debugAssetStore = assetStore;
  window.debugChannels = () => {
    console.log('🔍 WINDOW DEBUG: Available channels:', assetStore.channels);
    console.log(
      '🔍 WINDOW DEBUG: Channel items:',
      JSON.stringify(assetStore.channels?.items, null, 2),
    );
    if (assetStore.channels?.items) {
      Object.entries(assetStore.channels.items).forEach(([key, channel]) => {
        console.log(
          `🔍 WINDOW DEBUG: Channel [${key}]:`,
          JSON.stringify(
            {
              id: channel.id,
              name: channel.name,
              type: channel.type,
              content: channel.content,
            },
            null,
            2,
          ),
        );
      });
    }
    return assetStore.channels;
  };

  // Also log channels when they're loaded
  console.log('🏪 Final channels items:', assetStore.channels?.items);

  return assetStore;
};

const getBrainInfo = async brainEndpoint => {
  try {
    // This is a stub implementation - in a real app this would make an HTTP request
    // to the brain endpoint to fetch brain information
    const response = await fetch(brainEndpoint);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const brainInfo = await response.json();
    return brainInfo;
  } catch (error) {
    console.warn('Failed to fetch brain info:', error);
    // Return fallback brain info
    return {
      enabled: false,
      name: 'Brain API Unavailable',
      occupation: 'Service temporarily unavailable',
    };
  }
};

const showHelpArticle = articleId => {
  console.log('Help article requested: ' + articleId);
};

// Cancel function for operations
const Cancel = () => {
  console.log('Cancel requested');
};

// Re-export fetchAsset from utils
const fetchAsset = utilsFetchAsset;

// Stub implementations for missing functions
const postNewAsset = async (assetType, asset) => {
  console.log('postNewAsset called with:', assetType, asset);
  return Promise.resolve(asset);
};

const searchAssetMap = async (assetType, query) => {
  console.log('searchAssetMap called with:', assetType, query);
  return Promise.resolve([]);
};

const resultToAsset = result => {
  console.log('resultToAsset called with:', result);
  return result;
};

const getFlowType = flow => {
  console.log('getFlowType called with:', flow);
  return 'messaging';
};

const getActivity = async endpoint => {
  console.log('getActivity called with:', endpoint);
  return Promise.resolve([]);
};

const saveRevision = async (endpoint, definition) => {
  console.log('saveRevision called with:', { endpoint, definition });

  try {
    // Extract flow UUID/ID from definition or URL params
    const flowIdentifier = resolveFlowIdentifier(endpoint, definition);
    if (!flowIdentifier) {
      throw new Error('Flow identifier is required for saving revision');
    }

    // Construct the save_revision endpoint URL
    // endpoint is the base flows URL, we need to append /{id}/save_revision
    const saveUrl = `${endpoint}/${flowIdentifier}/save_revision`;

    console.log('Making API call to save revision:', saveUrl);

    // Get authentication token from localStorage or context
    const authToken = getAuthToken();
    const accountId = getAccountContext();

    // Prepare headers
    const headers = {
      'Content-Type': 'application/json',
    };

    // Add authentication headers if available
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
      headers['api-access-token'] = authToken;
    }

    if (accountId) {
      headers['X-Account-ID'] = accountId;
    }

    // Normalize definition into both object and JSON string forms
    let definitionObject = definition;
    let definitionString = null;
    try {
      if (typeof definition === 'string') {
        definitionString = definition;
        try {
          definitionObject = JSON.parse(definition);
        } catch (_) {
          // keep as string if parsing fails
          definitionObject = definition;
        }
      } else {
        definitionObject = definition;
        definitionString = JSON.stringify(definition);
      }
    } catch (e) {
      console.warn('saveRevision: failed to normalize definition', e);
      definitionObject = definition;
      definitionString =
        typeof definition === 'string'
          ? definition
          : JSON.stringify(definition || {});
    }

    // Prepare the request body to satisfy both backends:
    // - Rails: accepts `definition` as object or string
    // - Node/test: requires `definition_json` (string)
    const baseRequestBody = {
      definition: definitionObject,
      definition_json: definitionString,
      version: (definitionObject && definitionObject.spec_version) || '13.1.0',
      change_summary: 'Flow updated via FlowEditor',
    };

    console.log('Request body (primary attempt):', baseRequestBody);
    console.log('Request headers:', headers);

    // Primary attempt: send both keys for maximum compatibility
    let response = await fetch(saveUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(baseRequestBody),
    });

    console.log('API response status:', response.status);

    // Fallback: if 400 and server complains about `definition_json`, retry with minimal body
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API call failed:', response.status, errorText);

      const mentionsDefinitionJson = /definition_json/i.test(errorText);
      if (response.status === 400 && mentionsDefinitionJson) {
        const fallbackBody = {
          definition_json: definitionString,
          version:
            (definitionObject && definitionObject.spec_version) || '13.1.0',
          change_summary: 'Flow updated via FlowEditor',
        };

        console.log(
          'Retrying save with fallback body (definition_json only):',
          fallbackBody,
        );
        response = await fetch(saveUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(fallbackBody),
        });
        console.log('Fallback API response status:', response.status);

        if (!response.ok) {
          const fallbackErrorText = await response.text();
          throw new Error(
            `Failed to save revision: ${response.status} ${fallbackErrorText}`,
          );
        }
      } else {
        throw new Error(
          `Failed to save revision: ${response.status} ${errorText}`,
        );
      }
    }

    const result = await response.json();
    console.log('API response data:', result);

    // Normalize server response to FlowEditor SaveResult format
    const rawRevision =
      (result && (result.data || result.revision || result)) || {};

    const normalizedRevision = {
      id:
        rawRevision.id ??
        rawRevision.revision_number ??
        rawRevision.uuid ??
        Date.now(),
      version:
        rawRevision.version ||
        (definitionObject && definitionObject.spec_version) ||
        '13.1.0',
      revision:
        rawRevision.revision ?? rawRevision.revision_number ?? Date.now(),
      created_on:
        rawRevision.created_on ||
        rawRevision.created_at ||
        rawRevision.updated_at ||
        new Date().toISOString(),
      user:
        rawRevision.user ||
        (typeof rawRevision.created_by === 'object'
          ? rawRevision.created_by
          : { email: 'system', name: 'System' }),
      current: true,
    };

    console.log('Normalized SaveResult.revision:', normalizedRevision);

    return {
      revision: normalizedRevision,
      issues: [],
      metadata: null,
    };
  } catch (error) {
    console.error('Error in saveRevision:', error);
    // Return error in expected format
    throw new Error(`Failed to save flow: ${error.message}`);
  }
};

const getRecentMessages = async endpoint => {
  console.log('getRecentMessages called with:', endpoint);
  return Promise.resolve([]);
};

const getAssets = async (endpoint, assetType, idKey = 'id') => {
  console.log('getAssets called with:', { endpoint, assetType, idKey });

  try {
    // Resolve endpoint which may include query params
    const rawUrl =
      typeof endpoint === 'string' ? endpoint : endpoint?.endpoint || '';
    if (!rawUrl || typeof rawUrl !== 'string') {
      console.warn('getAssets: invalid endpoint provided:', endpoint);
      return [];
    }

    // Split base and query (e.g., .../flows?version=13.1.0)
    const [base, query] = rawUrl.split('?');

    // Build the actual URL to fetch assets
    // Test assets: endpoints like '/assets/revisions.json/' — use as-is
    // API assets: different handling based on asset type
    let url = base;
    const isTestAsset = /\/assets\//.test(base) || /\.json\/?$/.test(base);

    if (!isTestAsset) {
      // Handle different asset types differently
      const isRevisionAsset = String(assetType).toLowerCase() === 'revision';

      if (isRevisionAsset) {
        // For revisions, we need to append the flow identifier and /revisions
        let flowIdentifier = resolveFlowIdentifier(base, null);

        // If not present in query params, try to extract from pathname
        if (!flowIdentifier && typeof window !== 'undefined') {
          const path = window.location.pathname || '';
          const match = path.match(/\/flows\/(?:editor|view)\/(\w+)/);
          if (match && match[1]) {
            flowIdentifier = match[1];
          }
        }

        if (!flowIdentifier || flowIdentifier === 'new') {
          console.log(
            'getAssets: no existing flow identifier, returning empty revisions',
          );
          return [];
        }

        // Ensure no trailing slash issues
        url = `${base.replace(/\/$/, '')}/${flowIdentifier}/revisions`;
      } else {
        // For other asset types (channels, groups, etc.), use the endpoint as-is
        url = base;
      }
    }

    // Re-attach query params if provided
    if (query) {
      url = `${url}?${query}`;
    }

    // Prepare headers (include auth if available)
    const headers = { 'Content-Type': 'application/json' };
    const authToken = getAuthToken();
    const accountId = getAccountContext();

    // DEBUG: Authentication status
    console.log(
      '🔐 AUTH DEBUG - Current auth token:',
      authToken ? `${authToken.substring(0, 20)}...` : 'NOT SET',
    );
    console.log('🔐 AUTH DEBUG - Current account ID:', accountId);
    console.log(
      '🔐 AUTH DEBUG - Stored auth token:',
      getStoredAuthToken()
        ? `${getStoredAuthToken().substring(0, 20)}...`
        : 'NOT SET',
    );
    console.log('🔐 AUTH DEBUG - Stored account ID:', getStoredAccountId());
    console.log(
      '🔐 AUTH DEBUG - localStorage floweditor_auth_token:',
      localStorage.getItem('floweditor_auth_token')
        ? `${localStorage.getItem('floweditor_auth_token').substring(0, 20)}...`
        : 'NOT SET',
    );
    console.log(
      '🔐 AUTH DEBUG - localStorage floweditor_account_id:',
      localStorage.getItem('floweditor_account_id'),
    );

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
      headers['api-access-token'] = authToken;
    }
    if (accountId) {
      headers['X-Account-ID'] = accountId;
    }

    console.log('🔍 getAssets - Final URL:', url);
    console.log('🔍 getAssets - Headers:', headers);
    console.log('🔍 getAssets - Asset Type:', assetType);
    console.log('🔍 getAssets - Original endpoint:', endpoint);

    const response = await fetch(url, { method: 'GET', headers });
    console.log('🔍 getAssets response status:', response.status);
    console.log(
      '🔍 getAssets response headers:',
      Object.fromEntries(response.headers.entries()),
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('getAssets failed:', response.status, errorText);

      // DEBUG: If authentication failed, log more details
      if (response.status === 401 || response.status === 403) {
        console.error('🔐 AUTHENTICATION FAILED - Status:', response.status);
        console.error('🔐 AUTHENTICATION FAILED - Error:', errorText);
        console.error(
          '🔐 AUTHENTICATION FAILED - Token used:',
          authToken ? `${authToken.substring(0, 20)}...` : 'NONE',
        );
        console.error('🔐 AUTHENTICATION FAILED - Account ID used:', accountId);
      }

      throw new Error(
        `Failed to fetch assets: ${response.status} ${errorText}`,
      );
    }

    const data = await response.json();
    console.log('getAssets raw data:', data);
    console.log('getAssets data type:', typeof data);
    console.log('getAssets data is array:', Array.isArray(data));

    let parsed = data;
    if (
      parsed &&
      typeof parsed === 'object' &&
      'statusCode' in parsed &&
      parsed.statusCode === 200 &&
      'body' in parsed
    ) {
      try {
        parsed =
          typeof parsed.body === 'string'
            ? JSON.parse(parsed.body)
            : parsed.body;
      } catch (_) {}
      console.log('getAssets parsed wrapper body:', parsed);
    }

    const isExpression = String(assetType).toLowerCase() === 'expression';
    if (isExpression) {
      const payload = Array.isArray(data)
        ? data[0]
        : Array.isArray(data?.results)
        ? data.results[0]
        : Array.isArray(data?.data)
        ? data.data[0]
        : data;

      if (payload && payload.context && payload.functions) {
        return payload;
      }
      return {};
    }

    let results;
    if (Array.isArray(parsed)) {
      results = parsed;
    } else if (parsed && typeof parsed === 'object') {
      const obj = parsed;
      results = Array.isArray(obj.payload)
        ? obj.payload
        : Array.isArray(obj.results)
        ? obj.results
        : Array.isArray(obj.data)
        ? obj.data
        : obj.results || obj.data || [];
    } else {
      results = [];
    }

    console.log('getAssets extracted results:', results);
    console.log('getAssets results type:', typeof results);
    console.log('getAssets results is array:', Array.isArray(results));

    // Ensure results is always an array
    if (!Array.isArray(results)) {
      console.warn(
        'getAssets: API response does not contain a valid array, returning empty array',
      );
      return [];
    }

    // Normalize server results to FlowEditor Asset[]
    const normalized = results.map(item => {
      const rawId = item?.[idKey] ?? item?.uuid ?? item?.id;
      const id = rawId != null ? String(rawId) : String(createUUID());
      const typeValue = assetType || item?.type || 'Asset';

      // Human-friendly name handling
      let name = item?.name;
      if (!name) {
        if (String(typeValue).toLowerCase() === 'revision') {
          const revNum = item?.revision ?? item?.revision_number ?? rawId;
          const ver = item?.version ? ` (v${item.version})` : '';
          name = `Revision ${revNum}${ver}`;
        } else {
          // For other asset types, use the name field or fall back to id
          name = item?.name || item?.label || id;
        }
      }

      return {
        id,
        name,
        type: typeValue,
        content: { ...item, current: false },
      };
    });

    console.log('getAssets normalized assets:', normalized);
    return normalized;
  } catch (error) {
    console.error('Error in getAssets:', error);
    return [];
  }
};

const getFlowDetails = async (endpoint, uuid) => {
  console.log('getFlowDetails called with:', endpoint, uuid);

  try {
    // Use resolved identifier for URL construction
    const identifier = resolveFlowIdentifier(endpoint, { uuid }, true) || uuid;
    const flowUrl = `${endpoint}/${identifier}`;

    // Prepare headers
    const headers = { 'Content-Type': 'application/json' };
    const authToken = getAuthToken();
    const accountId = getAccountContext();
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
      headers['api-access-token'] = authToken;
    }
    if (accountId) {
      headers['X-Account-ID'] = accountId;
    }

    console.log('Fetching flow details from:', flowUrl);
    const response = await fetch(flowUrl, { method: 'GET', headers });

    if (response.status === 404) {
      console.warn('getFlowDetails: flow not found, returning default');
      return {
        definition: {
          uuid: String(identifier || createUUID()),
          name: 'New Flow',
          language: 'base',
          spec_version: '13.1.0',
          revision: 1,
          nodes: [],
          _ui: { stickies: {}, languages: [] },
        },
        metadata: {},
        baseLanguage: 'base',
      };
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch flow: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('getFlowDetails raw response:', data);

    // Handle Rails API response structure (wrapped in results array)
    let flowData = data;
    if (
      data?.results &&
      Array.isArray(data.results) &&
      data.results.length > 0
    ) {
      flowData = data.results[0];
      console.log('getFlowDetails extracted flow data from results:', flowData);
    }

    // Accept Chatwoot (flow_data) and Node/test (definition/definition_json)
    const parsedDef = pickFlowDefinitionFromResponse(flowData) || {
      uuid: String(identifier || createUUID()),
      name: flowData?.name || 'New Flow',
      language: flowData?.language || 'base',
      spec_version: '13.1.0',
      revision: 1,
      nodes: [],
      _ui: { stickies: {}, languages: [] },
    };

    // Normalize identifier for Chatwoot Rails endpoints
    if (isChatwootFlowsEndpoint(endpoint)) {
      const flowId = String(flowData?.id ?? identifier);
      parsedDef.uuid = flowId;
      if (!parsedDef.name && flowData?.name) parsedDef.name = flowData.name;
      if (!parsedDef.language && flowData?.language)
        parsedDef.language = flowData.language;
    } else {
      parsedDef.uuid = String(parsedDef.uuid || flowData?.uuid || identifier);
    }

    console.log('getFlowDetails parsed definition:', parsedDef);

    return {
      definition: parsedDef,
      metadata: flowData?.metadata || {},
      baseLanguage: parsedDef?.language || 'base',
    };
  } catch (err) {
    console.error('getFlowDetails error:', err);
    throw err;
  }
};

const getCookie = name => {
  console.log('getCookie called with:', name);
  if (typeof document !== 'undefined') {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2)
      return parts
        .pop()
        .split(';')
        .shift();
  }
  return null;
};

const getBaseURL = () => {
  console.log('getBaseURL called');
  return window.location.origin;
};

const getURL = path => {
  console.log('getURL called with:', path);
  if (path == null) return path;
  const str = String(path);

  // Already absolute (http, https) or protocol-relative (//)
  if (/^(https?:)?\/\//i.test(str)) {
    return str;
  }

  // Root-relative path
  if (str.startsWith('/')) {
    return `${getBaseURL()}${str}`;
  }

  // Relative path: ensure single slash join
  return `${getBaseURL()}/${str}`;
};

// Enhanced PostMessage communication functions
const sendMessageToChatwoot = message => {
  console.log('sendMessageToChatwoot called with:', message);
  if (window.parent && window.parent !== window) {
    window.parent.postMessage(message, '*');
  }
};

const waitForAcknowledgment = (messageId, timeout = 5000) => {
  console.log('waitForAcknowledgment called with:', messageId, timeout);
  return Promise.resolve(true);
};

const notifyFlowSaveStart = () => {
  console.log('notifyFlowSaveStart called');
  sendMessageToChatwoot({ type: 'FLOW_SAVE_START' });
};

const notifyFlowSaveSuccess = () => {
  console.log('notifyFlowSaveSuccess called');
  sendMessageToChatwoot({ type: 'FLOW_SAVE_SUCCESS' });
};

const notifyFlowSaveError = error => {
  console.log('notifyFlowSaveError called with:', error);
  sendMessageToChatwoot({ type: 'FLOW_SAVE_ERROR', error });
};

const notifyFlowValidation = isValid => {
  console.log('notifyFlowValidation called with:', isValid);
  sendMessageToChatwoot({ type: 'FLOW_VALIDATION', isValid });
};

const notifyFlowLoaded = () => {
  console.log('notifyFlowLoaded called');
  sendMessageToChatwoot({ type: 'FLOW_LOADED' });
};

const requestAuthRefresh = () => {
  console.log('requestAuthRefresh called');
  sendMessageToChatwoot({ type: 'AUTH_REFRESH_REQUEST' });
  return Promise.resolve(true);
};

const enhancedSetAuthToken = token => {
  console.log('enhancedSetAuthToken called with token');
  setAuthToken(token);
  sendMessageToChatwoot({ type: 'AUTH_TOKEN_SET' });
};

const enhancedSetAccountContext = accountId => {
  console.log('enhancedSetAccountContext called with:', accountId);
  setAccountContext(accountId);
  sendMessageToChatwoot({ type: 'ACCOUNT_CONTEXT_SET', accountId });
};

export {
  storeAuthToken,
  getStoredAuthToken,
  storeAccountId,
  getStoredAccountId,
  storeAuthTokenData,
  getStoredAuthTokenData,
  extractAuthDataFromUrl,
  clearStoredAuth,
  setAuthTokenData,
  getAuthTokenData,
  initializeAuthFromStorage,
  initializeAuthFromUrl,
  extractTokenFromUrl,
  extractAccountIdFromUrl,
  setAuthToken,
  getAuthToken,
  setAccountContext,
  getAccountContext,
  setHTTPTimeout,
  createAssetStore,
  getBrainInfo,
  fetchAsset,
  postNewAsset,
  searchAssetMap,
  resultToAsset,
  getFlowType,
  getActivity,
  saveRevision,
  getRecentMessages,
  getAssets,
  getFlowDetails,
  getCookie,
  getBaseURL,
  getURL,
  showHelpArticle,
  Cancel,
  // Enhanced PostMessage communication functions
  sendMessageToChatwoot,
  waitForAcknowledgment,
  notifyFlowSaveStart,
  notifyFlowSaveSuccess,
  notifyFlowSaveError,
  notifyFlowValidation,
  notifyFlowLoaded,
  requestAuthRefresh,
  enhancedSetAuthToken,
  enhancedSetAccountContext,
};
