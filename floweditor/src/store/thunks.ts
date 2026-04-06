import { determineTypeConfig } from 'components/flow/helpers';
import { getResultName } from 'components/flow/node/helpers';
import { getSmartOrSwitchRouter } from 'components/flow/routers/helpers';
import { SaveResult } from 'components/revisions/RevisionExplorer';
import { FlowTypes, Type, Types } from 'config/interfaces';
import { getTypeConfig } from 'config/typeConfigs';
import {
  createAssetStore,
  getBrainInfo,
  getFlowDetails,
  saveRevision,
} from 'external';
import isEqual from 'fast-deep-equal';
import {
  Action,
  AnyAction,
  Category,
  Dimensions,
  Endpoints,
  Exit,
  FlowDefinition,
  FlowNode,
  SendMsg,
  SetContactField,
  SetRunResult,
  StickyNote,
  FlowDetails,
} from 'flowTypes';
import mutate from 'immutability-helper';
import { Dispatch } from 'redux';
import {
  CanvasPositions,
  EditorState,
  EMPTY_DRAG_STATE,
  updateEditorState,
} from 'store/editor';
import {
  Asset,
  AssetStore,
  DEFAULT_LANGUAGE,
  RenderNode,
  RenderNodeMap,
  updateAssets,
  updateBaseLanguage,
  updateContactFields,
  updateDefinition,
  updateNodes,
  updateMetadata,
  updateIssues,
  Search,
  updateSearch,
  updateBrainInfo,
} from 'store/flowContext';
import {
  createEmptyNode,
  fetchFlowActivity,
  getActionIndex,
  getCurrentDefinition,
  getFlowComponents,
  getLocalizations,
  getNode,
  guessNodeType,
  mergeAssetMaps,
  createFlowIssueMap,
} from 'store/helpers';
import * as mutators from 'store/mutators';
import {
  NodeEditorSettings,
  updateNodeEditorSettings,
  updateTypeConfig,
  updateUserAddingAction,
} from 'store/nodeEditor';
import AppState from 'store/state';
import {
  createUUID,
  hasString,
  NODE_SPACING,
  timeEnd,
  timeStart,
  ACTIVITY_INTERVAL,
} from 'utils';
import { AxiosError } from 'axios';
import i18n from 'config/i18n';
import { TembaStore } from 'temba-components';

// TODO: Remove use of Function
// tslint:disable:ban-types
export type DispatchWithState = Dispatch<AppState>;

export type GetState = () => AppState;

export type Thunk<T> = (dispatch: Dispatch<AppState>, getState?: GetState) => T;

export type AsyncThunk = Thunk<Promise<void>>;

export type OnAddToNode = (node: FlowNode) => Thunk<void>;

export type HandleTypeConfigChange = (typeConfig: Type) => Thunk<void>;

export type UpdateTranslationFilters = (translationFilters: {
  categories: boolean;
  rules: boolean;
}) => Thunk<void>;

export type TriggerSave = () => Thunk<void>;

export type OnOpenNodeEditor = (settings: NodeEditorSettings) => Thunk<void>;

export type UpdateNodesEditor = (nodes: any) => Thunk<void>;

export type OnUpdateCanvasPositions = (
  positions: CanvasPositions,
) => Thunk<RenderNodeMap>;

export type OnRemoveNodes = (nodeUUIDs: string[]) => Thunk<RenderNodeMap>;

export type AddAsset = (assetType: string, asset: Asset) => Thunk<void>;

export type RemoveNode = (nodeToRemove: FlowNode) => Thunk<RenderNodeMap>;

export type UpdateDimensions = (
  uuid: string,
  dimensions: Dimensions,
) => Thunk<void>;

export type FetchFlow = (
  endpoints: Endpoints,
  uuid: string,
  forceSave: boolean,
) => Thunk<Promise<void>>;

export type LoadFlowDefinition = (
  details: FlowDetails,
  assetStore: AssetStore,
) => Thunk<void>;

export type CreateNewRevision = () => Thunk<void>;

export type NoParamsAC = () => Thunk<void>;

export type UpdateConnection = (
  source: string,
  target: string,
) => Thunk<RenderNodeMap>;

export type OnConnectionDrag = (
  event: ConnectionEvent,
  flowType: FlowTypes,
) => Thunk<void>;

export type OnUpdateLocalizations = (
  language: string,
  changes: LocalizationUpdates,
) => Thunk<FlowDefinition>;

export type UpdateSticky = (
  stickyUUID: string,
  sticky: StickyNote,
) => Thunk<void>;

export type OnUpdateAction = (
  action: AnyAction,
  onUpdated?: (dispatch: DispatchWithState, getState: GetState) => void,
) => Thunk<RenderNodeMap>;

export type ActionAC = (
  nodeUUID: string,
  action: AnyAction,
) => Thunk<RenderNodeMap>;

export type DisconnectExit = (
  nodeUUID: string,
  exitUUID: string,
) => Thunk<RenderNodeMap>;

export type HandleLanguageChange = (language: Asset) => Thunk<void>;

export type HandleSearchChange = (search: Search) => Thunk<void>;

export type MergeEditorState = (
  state: Partial<EditorState>,
) => Thunk<EditorState>;

export interface ReplaceAction {
  nodeUUID: string;
  actionUUID: string;
}

export type OnUpdateRouter = (node: RenderNode) => Thunk<RenderNodeMap>;

export interface Connection {
  previousConnection: Connection;
}

export interface ConnectionEvent {
  connection: Connection;
  source: Element;
  target: Element;
  sourceId: string;
  targetId: string;
  suspendedElementId: string;
  endpoints: any[];
}

export interface ErrorMessage {
  status: string;
  description: string;
}

export type LocalizationUpdates = { uuid: string; translations?: any }[];
const QUIET_SAVE = 1000;
const SAVE_ALERT_MILLIS = 1000 * 60;

let markDirty: (quiet?: number) => void = () => {};
let lastDirtyAttemptTimeout: any = null;
let postingRevision = false;

let lastDirtyMillis = 0;
let lastSuccessfulMillis = 0;

const NETWORK_ERROR = i18n.t(
  'errors.network',
  'Hmm, we ran into a problem trying to save your changes. It could just be that your internet connection is not working well at the moment. Please wait a minute or so and try again.',
);

const SERVER_ERROR = i18n.t(
  'errors.server',
  'Hmm, we ran into a problem trying to save your changes. If this problem persists, take note of the change you are trying to make and contact support.',
);

export const ACTIONS_WITHOUT_EXIT = [Types.call_brain];

export const createSaveMonitor = (dispatch: DispatchWithState) => {
  window.setInterval(() => {
    if (
      lastSuccessfulMillis < lastDirtyMillis &&
      new Date().getTime() - lastDirtyMillis > SAVE_ALERT_MILLIS
    ) {
      console.error('🚨 FlowEditor Save Monitor: Save timeout detected!', {
        lastSuccessfulMillis,
        lastDirtyMillis,
        timeSinceLastDirty: new Date().getTime() - lastDirtyMillis,
        saveAlertThreshold: SAVE_ALERT_MILLIS,
        timestamp: new Date().toISOString()
      });
      
      dispatch(
        mergeEditorState({
          modalMessage: {
            title: "Uh oh, we couldn't save your changes",
            body: NETWORK_ERROR,
          },
          saving: false,
        }),
      );
    }
  }, 5000);
};

export const createDirty = (
  revisionsEndpoint: string,
  dispatch: DispatchWithState,
  getState: GetState,
) => (quiet: number = QUIET_SAVE) => {
  lastDirtyMillis = new Date().getTime();

  if (lastDirtyAttemptTimeout) {
    window.clearTimeout(lastDirtyAttemptTimeout);
  }

  const {
    flowContext: { definition, nodes, assetStore, issues },
    editorState: { currentRevision },
  } = getState();

  dispatch(mergeEditorState({ saving: true }));

  // make sure we have the most current revision number we know about
  const newDefinition = getCurrentDefinition(definition, nodes, true);
  newDefinition.revision = currentRevision;

  if (postingRevision) {
    lastDirtyAttemptTimeout = window.setTimeout(() => {
      markDirty();
    }, QUIET_SAVE);
    return;
  }

  lastDirtyAttemptTimeout = window.setTimeout(() => {
    postingRevision = true;

    // Save to account-specific localStorage storage first
    (async () => {
      try {
        const { FlowStore } = await import('../services/FlowStore');
        const flowStore = FlowStore.get();
        
        // Ensure the definition has a proper UUID before saving
        if (!newDefinition.uuid) {
          console.warn('Flow definition missing UUID, cannot save to storage');
          return;
        }
        
        flowStore.save(newDefinition);
        console.log('Flow saved to account-specific storage:', {
          uuid: newDefinition.uuid,
          revision: newDefinition.revision,
          name: newDefinition.name
        });
      } catch (storageError) {
        console.warn(
          'Failed to save to account-specific storage:',
          storageError,
        );
      }
    })();

    saveRevision(revisionsEndpoint, newDefinition).then(
      (result: any) => {
        console.log('🔍 FlowEditor Save Success: Received result from saveRevision', {
          result,
          hasRevision: !!(result.revision || result.data),
          resultKeys: Object.keys(result || {}),
          isNewFlowCreation: !!(result.success && result.data),
          isFlowUpdate: !!result.revision
        });

        // Handle different response formats:
        // 1. SaveResult format: {revision: Revision, issues: FlowIssue[], metadata: FlowMetadata}
        // 2. Direct API response: {id: string, definition: string, saved_on: string}
        // 3. New flow creation: {success: true, data: revision, message: string}
        let rawRevision;
        let issues = [];
        let metadata = null;

        if (result.success && result.data) {
          // New flow creation: API response format
          console.log('🔍 Processing new flow creation response');
          rawRevision = result.data;
          issues = []; // New flows don't have issues initially
          metadata = null; // New flows don't have metadata initially
        } else if (result.revision) {
          // Flow update: SaveResult format
          console.log('🔍 Processing flow update response (SaveResult format)');
          rawRevision = result.revision;
          issues = result.issues || [];
          metadata = result.metadata || null;
        } else if (result.id && result.saved_on) {
          // Direct API response format from external saveRevision
          console.log('🔍 Processing direct API response format');
          rawRevision = {
            id: result.id,
            revision: Date.now(),
            revision_number: Date.now(),
            created_on: result.saved_on,
            version: '13.1.0',
            user: { email: 'system', name: 'System' },
            current: true
          } as any;
          issues = [];
          metadata = null;
        } else {
          console.error('🚨 FlowEditor Save Error: Invalid save result structure', {
            result,
            expectedStructure: 'SaveResult {revision, issues, metadata} or API response {id, saved_on} or new flow {success, data}'
          });
          
          dispatch(
            mergeEditorState({
              saving: false
            }),
          );
          postingRevision = false;
          return;
        }

        // Normalize revision to client shape expected by RevisionExplorer and asset store
        const normalizedRevision = {
          id:
            (rawRevision as any)?.id ??
            (rawRevision as any)?.revision_number ??
            (rawRevision as any)?.revision ??
            Date.now(),
          version: (rawRevision as any)?.version || newDefinition.spec_version || '13.1.0',
          revision:
            (rawRevision as any)?.revision ??
            (rawRevision as any)?.revision_number ??
            Date.now(),
          created_on:
            (rawRevision as any)?.created_on ||
            (rawRevision as any)?.created_at ||
            new Date().toISOString(),
          user:
            (rawRevision as any)?.user || {
              email: 'system',
              name: 'System',
            },
          current: true,
        };

        console.log('🔍 FlowEditor Save: Processing revision', {
          revision: normalizedRevision,
          revisionNumber: normalizedRevision.revision,
          revisionId: normalizedRevision.id,
          revisionVersion: normalizedRevision.version,
          isNewFlow: !!(result.success && result.data)
        });

        // Update the definition with the correct revision number
        // For new flows: use revision_number from API response
        // For updates: use revision property from SaveResult
        definition.revision = normalizedRevision.revision;
         dispatch(updateDefinition(definition));
         dispatch(updateIssues(createFlowIssueMap({}, issues)));

        if (metadata) {
          dispatch(updateMetadata(metadata));
        }

        const updatedAssets = mutators.addRevision(assetStore, normalizedRevision as any);
        dispatch(updateAssets(updatedAssets));
        dispatch(
          mergeEditorState({
            currentRevision: normalizedRevision.revision,
            saving: false,
            activityInterval: ACTIVITY_INTERVAL,
          }),
        );

        lastSuccessfulMillis = new Date().getTime();
        postingRevision = false;
        console.log('✅ FlowEditor Save: Successfully completed save operation');
      },
      (error: AxiosError) => {
        console.error('🚨 FlowEditor Save Error: Failed to save flow!', {
          error,
          errorType: (error as any)?.constructor?.name || 'Unknown',
          errorMessage: error?.message,
          errorStack: error?.stack,
          isAxiosError: error?.isAxiosError,
          axiosErrorDetails: {
            status: error?.response?.status,
            statusText: error?.response?.statusText,
            responseData: error?.response?.data,
            requestUrl: error?.config?.url,
            requestMethod: error?.config?.method,
            requestHeaders: error?.config?.headers,
            requestData: error?.config?.data,
          },
          networkError: !error?.response,
          timestamp: new Date().toISOString()
        });

        let body = NETWORK_ERROR;

        if (error.response && error.response.status === 500) {
          console.error('🚨 FlowEditor: Server error (500)', {
            status: error.response.status,
            statusText: error.response.statusText,
            responseData: error.response.data,
            timestamp: new Date().toISOString()
          });
          body = SERVER_ERROR;
        }

        if (
          error.response &&
          error.response.data &&
          error.response.data.description
        ) {
          console.error('🚨 FlowEditor: Error with description', {
            status: error.response.status,
            statusText: error.response.statusText,
            responseData: error.response.data,
            errorDescription: error.response.data.description,
            timestamp: new Date().toISOString()
          });
          body = error.response.data.description;
        }

        // Handle 404 errors specifically - this indicates URL construction issues
        if (error.response && error.response.status === 404) {
          console.error('🚨 FlowEditor: 404 Not Found - Check endpoint URL construction', {
            status: error.response.status,
            statusText: error.response.statusText,
            requestUrl: error.config?.url,
            requestMethod: error.config?.method,
            responseData: error.response.data,
            timestamp: new Date().toISOString()
          });
          body = 'The save endpoint was not found. This may be a configuration issue. Please check your network connection and try again.';
        }

        if (!error.response) {
          console.error('🚨 FlowEditor: Network error - no response received', {
            errorCode: error?.code,
            errorMessage: error?.message,
            timestamp: new Date().toISOString()
          });
        }

        dispatch(
          mergeEditorState({
            modalMessage: {
              title: "Uh oh, we couldn't save your changes",
              body,
            },
            saving: false,
          }),
        );
        postingRevision = false;
      },
    );
  }, quiet);
};

export const mergeEditorState = (changes: Partial<EditorState>) => (
  dispatch: DispatchWithState,
  getState: GetState,
): EditorState => {
  const { editorState } = getState();
  const updated = mutate(editorState, { $merge: changes });
  dispatch(updateEditorState(updated));
  return updated;
};

export const createNewRevision = () => (
  dispatch: DispatchWithState,
  getState: GetState,
): void => {
  // mark us dirty with no quiet period
  markDirty(0);
};
export const loadFlowDefinition = (
  details: FlowDetails,
  assetStore: AssetStore,
) => (dispatch: DispatchWithState, getState: GetState): void => {
  console.log('🔍 loadFlowDefinition - Input details.definition keys:', Object.keys(details.definition));
  console.log('🔍 loadFlowDefinition - Input details.definition uuid:', details.definition.uuid);
  console.log('🔍 loadFlowDefinition - Input details.definition name:', details.definition.name);

  let { definition } = details;

  // first see if we need our asset store initialized
  
  console.log('loadFlowDefinition - details object:', details);
  console.log('loadFlowDefinition - definition before processing:', definition);
  
  // Handle case where definition might be a string (JSON)
  if (typeof definition === 'string') {
    try {
      definition = JSON.parse(definition);
      console.log('Parsed string definition to object:', definition);
    } catch (error) {
      console.error('Failed to parse definition string:', error);
      throw new Error('Invalid flow definition format: definition is a string but not valid JSON');
    }
  }
  
  // Handle case where the flow definition is nested inside definition.definition
  if (definition && typeof definition === 'object' && (definition as any).definition && !(definition as any).nodes) {
    console.log('Found nested definition structure, extracting inner definition');
    const outerDefinition = definition as any;
    const innerDefinition = outerDefinition.definition;
    
    // Preserve uuid and name from outer definition if they exist and inner definition doesn't have them
    if (outerDefinition.uuid && !innerDefinition.uuid) {
      innerDefinition.uuid = outerDefinition.uuid;
    }
    if (outerDefinition.name && !innerDefinition.name) {
      innerDefinition.name = outerDefinition.name;
    }
    
    definition = innerDefinition;
  }
  
  console.log('loadFlowDefinition - definition after processing:', definition);
  console.log('loadFlowDefinition - definition keys:', Object.keys(definition || {}));
  console.log('loadFlowDefinition - definition.nodes:', definition?.nodes);
  
  const {
    flowContext: { issues },
    editorState: { fetchingFlow },
  } = getState();

  if (!fetchingFlow) {
    // mark us as underway
    dispatch(mergeEditorState({ fetchingFlow: true }));
  }

  // while we don't officially support doing it, lets make a best effort to load
  // definitions that don't have _ui information (created outside of the editor)
  definition.localization = definition.localization || {};
  definition._ui = definition._ui || { nodes: {}, languages: [], stickies: {} };

  // Ensure nodes property exists and is an array
  if (!definition.nodes || !Array.isArray(definition.nodes)) {
    console.error('Invalid flow definition: nodes property is missing or not an array', definition);
    
    // If definition is missing nodes but has other flow properties, create an empty nodes array
    if (definition && typeof definition === 'object' && (definition.uuid || definition.name)) {
      console.warn('Flow definition missing nodes array, creating empty nodes array');
      definition.nodes = [];
    } else {
      throw new Error('Invalid flow definition: nodes property must be an array');
    }
  }

  // make sure we have a ui entry for each node
  let currentTop = 0;
  for (const node of definition.nodes) {
    if (!definition._ui.nodes[node.uuid]) {
      definition._ui.nodes[node.uuid] = {
        position: { left: 0, top: currentTop },
        type: guessNodeType(node),
      };
      currentTop += 150;
    } else {
      definition._ui.nodes[node.uuid].position = {
        left: parseFloat(definition._ui.nodes[node.uuid].position.left as any),
        top: parseFloat(definition._ui.nodes[node.uuid].position.top as any),
      };
    }
  }

  if (definition._ui.stickies) {
    for (const stickyUuid of Object.keys(definition._ui.stickies)) {
      definition._ui.stickies[stickyUuid].position = {
        left: parseFloat(definition._ui.stickies[stickyUuid].position
          .left as any),
        top: parseFloat(definition._ui.stickies[stickyUuid].position
          .top as any),
      };
    }
  }

  // add assets we found in our flow to our asset store
  const components = getFlowComponents(definition);
  mergeAssetMaps(assetStore.fields.items, components.fields);
  mergeAssetMaps(assetStore.groups.items, components.groups);
  mergeAssetMaps(assetStore.labels.items, components.labels);
  mergeAssetMaps(assetStore.results.items, components.results);

  // initialize our language
  let language: Asset;
  if (definition.language) {
    language = assetStore.languages.items[definition.language];
  }

  if (!language) {
    language = DEFAULT_LANGUAGE;
    dispatch(mergeEditorState({ language: DEFAULT_LANGUAGE }));
    mergeAssetMaps(assetStore.languages.items, { base: DEFAULT_LANGUAGE });
  }

  if (details.issues) {
    dispatch(updateIssues(createFlowIssueMap(issues, details.issues)));
  } else {
    dispatch(updateIssues({}));
  }

  dispatch(updateBaseLanguage(language));
  dispatch(updateMetadata(details.metadata));

  // store our flow definition without any nodes
  console.log('🔍 loadFlowDefinition - Before pruneDefinition, definition keys:', Object.keys(definition));
  console.log('🔍 loadFlowDefinition - Before pruneDefinition, definition uuid:', definition.uuid);
  console.log('🔍 loadFlowDefinition - Before pruneDefinition, definition name:', definition.name);
  
  const prunedDefinition = mutators.pruneDefinition(definition);
  
  console.log('🔍 loadFlowDefinition - After pruneDefinition, prunedDefinition keys:', Object.keys(prunedDefinition));
  console.log('🔍 loadFlowDefinition - After pruneDefinition, prunedDefinition uuid:', prunedDefinition.uuid);
  console.log('🔍 loadFlowDefinition - After pruneDefinition, prunedDefinition name:', prunedDefinition.name);
  
  dispatch(updateDefinition(prunedDefinition));
  dispatch(updateNodes(components.renderNodeMap));

  // finally update our assets, and mark us as fetched
  dispatch(updateAssets(assetStore));
  dispatch(mergeEditorState({ language, fetchingFlow: false }));

  const store: TembaStore = document.querySelector('temba-store');
  if (store) {
    store.setKeyedAssets('results', Object.keys(assetStore.results.items));
  }
};

/**
 * Fetches a flow. Fetches all assets as well if the haven't been initialized yet
 * @param endpoints where our assets live
 * @param uuid the uuid for the flow to fetch
 */
export const fetchFlow = (
  endpoints: Endpoints,
  uuid: string,
  forceSave = false,
) => async (dispatch: DispatchWithState, getState: GetState) => {
  // mark us as underway
  dispatch(mergeEditorState({ fetchingFlow: true }));

  // first see if we need our asset store initialized
  let {
    flowContext: { assetStore },
  } = getState();

  if (!Object.keys(assetStore).length) {
    assetStore = await createAssetStore(endpoints);
  }

  // Import FlowStore for account-specific flow loading
  const { FlowStore } = await import('../services/FlowStore');
  const flowStore = FlowStore.get();

  // Extract flow UUID from URL parameters with multiple possible parameter names
  const urlParams = new URLSearchParams(window.location.search);
  const flowUuidFromUrl = urlParams.get('uuid') || urlParams.get('flow_uuid') || urlParams.get('flow') || uuid;
  
  console.log('Flow loading parameters:', {
    providedUuid: uuid,
    urlUuid: urlParams.get('uuid'),
    flowUuid: urlParams.get('flow_uuid'),
    flowParam: urlParams.get('flow'),
    finalUuid: flowUuidFromUrl,
    isNewAction: urlParams.get('action') === 'new',
    newParam: urlParams.get('new')
  });

  // Use the extracted UUID for all operations
  const actualFlowUuid = flowUuidFromUrl;

  // Check if activity polling should be disabled
  const DISABLE_ACTIVITY_POLLING = process.env.NODE_ENV === 'development' || (window as any).DISABLE_ACTIVITY_POLLING;
  
  if (!DISABLE_ACTIVITY_POLLING) {
    fetchFlowActivity(endpoints.activity, dispatch, getState, actualFlowUuid);
  }
  
  (window as any).triggerActivityUpdate = () => {
    if (!DISABLE_ACTIVITY_POLLING) {
      fetchFlowActivity(endpoints.activity, dispatch, getState, actualFlowUuid);
    }
  };

  // Restore brain API calls - fetch brain info if endpoint is available
  if (endpoints.brain) {
    try {
      const brainInfo = await getBrainInfo(endpoints.brain);
      dispatch(updateBrainInfo(brainInfo));
    } catch (error) {
      console.warn('Failed to fetch brain info:', error);
      // Provide fallback brain info if API call fails
      const fallbackBrainInfo = {
        name: 'Brain API Unavailable',
        occupation: 'Service temporarily unavailable',
        enabled: false,
      };
      dispatch(updateBrainInfo(fallbackBrainInfo));
    }
  } else {
    // No brain endpoint configured
    const noBrainInfo = {
      name: 'Brain Not Configured',
      occupation: 'No brain endpoint available',
      enabled: false,
    };
    dispatch(updateBrainInfo(noBrainInfo));
  }

  // Check if this is a request for a new flow by looking at URL parameters ONLY
  // Do NOT check localStorage as it may be cleared during account switching
  const isNewFlow = urlParams.get('new') === 'true' || urlParams.get('action') === 'new';

  // If this is explicitly a new flow request, create blank flow
  if (isNewFlow) {
    console.log('Creating new blank flow as requested');
    
    // Generate account-specific flow name
    const { getAccountContext } = await import('../external');
    const accountId = getAccountContext();
    const flowName = accountId
      ? `New Flow - Account ${accountId}`
      : 'New Flow';

    const newFlow: FlowDefinition = {
      uuid: actualFlowUuid,
      name: flowName,
      language: 'base',
      nodes: [],
      localization: {},
      spec_version: '13.1.0',
      revision: 1,
      _ui: {
        nodes: {},
        stickies: {},
        languages: [],
      },
    };

    const details: FlowDetails = {
      definition: newFlow,
      issues: [],
      metadata: {
        dependencies: [],
        results: [],
        waiting_exit_uuids: [],
        parent_refs: [],
      },
    };

    dispatch(loadFlowDefinition(details, assetStore));
    dispatch(
      mergeEditorState({
        currentRevision: details.definition.revision,
      }),
    );

    markDirty = createDirty(assetStore.revisions.endpoint, dispatch, getState);
    if (forceSave) {
      markDirty(0);
    }

    createSaveMonitor(dispatch);
    return;
  }

  // First try to load from Chatwoot database via API (prioritize database over localStorage)
  console.log('Attempting to load flow from Chatwoot database via API');
  
  try {
    const response: any = await getFlowDetails(assetStore.revisions.endpoint, actualFlowUuid);
    console.log('🔍 API response:', response);
    console.log('🔍 API response.definition.nodes length:', response.definition?.nodes?.length || 0);
    console.log('🔍 API response.definition._ui.nodes keys:', Object.keys(response.definition?._ui?.nodes || {}));
    
    // backwards compatibility for during deployment
    const details: FlowDetails = response.definition
      ? response
      : {
          definition: response as FlowDefinition,
          issues: [],
          metadata: {
            dependencies: [],
            results: [],
            waiting_exit_uuids: [],
            parent_refs: [],
          },
        };

    // Save the loaded flow to localStorage for offline access
    flowStore.save(details.definition);
    console.log('Flow loaded from database and cached to localStorage');

    dispatch(loadFlowDefinition(details, assetStore));
    dispatch(
      mergeEditorState({
        currentRevision: details.definition.revision,
      }),
    );

    markDirty = createDirty(
      assetStore.revisions.endpoint,
      dispatch,
      getState,
    );
    if (forceSave) {
      markDirty(0);
    }

    createSaveMonitor(dispatch);
  } catch (error: any) {
    // Enhanced error handling with detailed logging and recovery
    console.error('API failed to fetch flow, attempting localStorage fallback:', {
      error: error.message,
      status: error.response?.status,
      uuid: actualFlowUuid,
      timestamp: new Date().toISOString()
    });

    // Fallback to localStorage if API fails
    try {
      const storedFlow = flowStore.getFlowFromStore(actualFlowUuid);
      
      if (storedFlow) {
        console.log('Successfully recovered flow from localStorage after API failure');
        console.log('🔍 storedFlow from localStorage:', storedFlow);
        console.log('🔍 storedFlow.nodes length:', storedFlow.nodes?.length || 0);
        console.log('🔍 storedFlow._ui.nodes keys:', Object.keys(storedFlow._ui?.nodes || {}));
        
        const details: FlowDetails = {
          definition: storedFlow,
          issues: [],
          metadata: {
            dependencies: [],
            results: [],
            waiting_exit_uuids: [],
            parent_refs: [],
          },
        };

        dispatch(loadFlowDefinition(details, assetStore));
        dispatch(
          mergeEditorState({
            currentRevision: details.definition.revision,
          }),
        );

        markDirty = createDirty(
          assetStore.revisions.endpoint,
          dispatch,
          getState,
        );
        if (forceSave) {
          markDirty(0);
        }

        createSaveMonitor(dispatch);
        return;
      }
    } catch (storageError) {
      console.warn('Failed to recover from localStorage:', storageError);
    }

    // If all recovery attempts fail, create a new empty flow for this account
    console.log('All recovery attempts failed, creating new empty flow for account');

    // Generate account-specific flow name
    const { getAccountContext } = await import('../external');
    const accountId = getAccountContext();
    const flowName = accountId
      ? `New Flow - Account ${accountId}`
      : 'New Flow';

    const newFlow: FlowDefinition = {
      uuid: actualFlowUuid,
      name: flowName,
      language: 'base',
      nodes: [],
      localization: {},
      spec_version: '13.1.0',
      revision: 1,
      _ui: {
        nodes: {},
        stickies: {},
        languages: [],
      },
    };

    const details: FlowDetails = {
      definition: newFlow,
      issues: [],
      metadata: {
        dependencies: [],
        results: [],
        waiting_exit_uuids: [],
        parent_refs: [],
      },
    };

    dispatch(loadFlowDefinition(details, assetStore));
    dispatch(
      mergeEditorState({
        currentRevision: details.definition.revision,
      }),
    );

    markDirty = createDirty(
      assetStore.revisions.endpoint,
      dispatch,
      getState,
    );
    if (forceSave) {
      markDirty(0);
    }

    createSaveMonitor(dispatch);
  }
};

export const addAsset: AddAsset = (assetType: string, asset: Asset) => (
  dispatch: DispatchWithState,
  getState: GetState,
): void => {
  const {
    flowContext: { assetStore },
  } = getState();

  const updated = mutate(assetStore, {
    [assetType]: { items: { $merge: { [asset.id]: asset } } },
  });

  // update our temba store if we have one
  const store: TembaStore = document.querySelector('temba-store');
  if (store) {
    store.setKeyedAssets(assetType, Object.keys(updated[assetType]));
  }

  dispatch(updateAssets(updated));
};

export const handleLanguageChange: HandleLanguageChange = language => (
  dispatch,
  getState,
) => {
  const {
    flowContext: { baseLanguage },
    editorState: { translating, language: currentLanguage },
  } = getState();

  // determine translating state
  if (!isEqual(language, baseLanguage)) {
    if (!translating) {
      dispatch(mergeEditorState({ translating: true }));
    }
  } else {
    dispatch(mergeEditorState({ translating: false }));
  }

  // update language
  if (!isEqual(language, currentLanguage)) {
    dispatch(mergeEditorState({ language }));
  }
};

export const handleSearchChange: HandleSearchChange = (search: Search) => (
  dispatch,
  getState,
) => {
  const {
    flowContext: { search: currentSearch },
  } = getState();

  // update language
  if (!isEqual(search, currentSearch)) {
    dispatch(updateSearch(search));
  }
};

export const onUpdateLocalizations = (
  language: string,
  changes: LocalizationUpdates,
) => (dispatch: DispatchWithState, getState: GetState): FlowDefinition => {
  const {
    flowContext: { definition },
  } = getState();
  const updated = mutators.updateLocalization(definition, language, changes);
  dispatch(updateDefinition(updated));

  markDirty();
  return updated;
};

export const updateExitDestination = (
  nodeUUID: string,
  exitUUID: string,
  destination: string,
) => (dispatch: DispatchWithState, getState: GetState): RenderNodeMap => {
  const {
    flowContext: { nodes },
  } = getState();
  const updated = mutators.updateConnection(
    nodes,
    nodeUUID,
    exitUUID,
    destination,
  );
  dispatch(updateNodes(updated));
  markDirty();
  return updated;
};

export const disconnectExit = (nodeUUID: string, exitUUID: string) => (
  dispatch: DispatchWithState,
  getState: GetState,
): RenderNodeMap => dispatch(updateExitDestination(nodeUUID, exitUUID, null));

export const updateConnection = (source: string, target: string) => (
  dispatch: DispatchWithState,
  getState: GetState,
): RenderNodeMap => {
  const [nodeUUID, exitUUID] = source.split(':');
  return dispatch(updateExitDestination(nodeUUID, exitUUID, target));
};

export const removeNode = (node: FlowNode) => (
  dispatch: DispatchWithState,
  getState: GetState,
): RenderNodeMap => {
  // Remove result name if node has one
  const {
    flowContext: { nodes, assetStore },
  } = getState();

  // update asset store to remove results that no longer exist
  if (node.router && node.router.result_name) {
    const updatedAssets = mutators.removeResultFromStore(
      node.router.result_name,
      assetStore,
      {
        nodeUUID: node.uuid,
      },
    );
    dispatch(updateAssets(updatedAssets));
  }

  const updated = mutators.removeNode(nodes, node.uuid);
  dispatch(updateNodes(updated));
  markDirty();
  return updated;
};

export const removeAction = (nodeUUID: string, action: AnyAction) => (
  dispatch: DispatchWithState,
  getState: GetState,
): RenderNodeMap => {
  const {
    flowContext: { nodes, assetStore },
  } = getState();
  const renderNode = nodes[nodeUUID];

  // update asset store to remove results that no longer exist
  if (action.type === Types.set_run_result) {
    const resultAction = action as SetRunResult;
    const updatedAssets = mutators.removeResultFromStore(
      resultAction.name,
      assetStore,
      {
        nodeUUID,
        actionUUID: action.uuid,
      },
    );
    dispatch(updateAssets(updatedAssets));
  }

  // If it's our last action, then nuke the node
  if (renderNode.node.actions.length === 1) {
    const updated = dispatch(removeNode(renderNode.node));
    markDirty();
    return updated;
  } else {
    // Otherwise, just remove that action
    const updated = mutators.removeAction(nodes, nodeUUID, action.uuid);
    dispatch(updateNodes(updated));
    markDirty();
    return updated;
  }
};

export const moveActionUp = (nodeUUID: string, action: AnyAction) => (
  dispatch: DispatchWithState,
  getState: GetState,
): RenderNodeMap => {
  const {
    flowContext: { nodes },
  } = getState();
  const updated = mutators.moveActionUp(nodes, nodeUUID, action.uuid);
  dispatch(updateNodes(updated));
  markDirty();
  return updated;
};

/**
 * Splices a router into a list of actions creating up to three nodes where there
 * was once one node.
 * @param nodeUUID the node to replace
 * @param node the new node being added (shares the previous node uuid)
 * @param type the type of the new router
 * @param previousAction the previous action that is being replaced with our router
 * @returns a list of RenderNodes that were created
 */
export const spliceInRouter = (
  newRouterNode: RenderNode,
  previousAction: { nodeUUID: string; actionUUID: string },
) => (dispatch: DispatchWithState, getState: GetState): RenderNodeMap => {
  const {
    flowContext: { nodes },
  } = getState();
  const previousNode = nodes[previousAction.nodeUUID];

  // remove our old node, we'll make new ones
  let updatedNodes = nodes;
  updatedNodes = mutators.removeNode(
    updatedNodes,
    previousNode.node.uuid,
    false,
  );

  newRouterNode.node = mutators.uniquifyNode(newRouterNode.node);

  const actionIdx = getActionIndex(
    previousNode.node,
    previousAction.actionUUID,
  );

  // we need to splice a wait node where our previousAction was
  const topActions: Action[] =
    actionIdx > 0 ? [...previousNode.node.actions.slice(0, actionIdx)] : [];
  const bottomActions: Action[] = previousNode.node.actions.slice(
    actionIdx + 1,
    previousNode.node.actions.length,
  );

  // tslint:disable-next-line:prefer-const
  let { left, top } = previousNode.ui.position;

  let topNode: RenderNode;
  let bottomNode: RenderNode;

  // add our top node if we have one
  if (topActions.length > 0) {
    topNode = {
      node: {
        uuid: createUUID(),
        actions: topActions,
        exits: [
          {
            uuid: createUUID(),
            destination_uuid: null,
          },
        ],
      },
      ui: { position: { left, top } },
      inboundConnections: { ...previousNode.inboundConnections },
    };

    updatedNodes = mutators.mergeNode(updatedNodes, topNode);
    top += NODE_SPACING;

    // update our routerNode for the presence of a top node
    newRouterNode.inboundConnections = {
      [topNode.node.exits[0].uuid]: topNode.node.uuid,
    };
    newRouterNode.ui.position.top += NODE_SPACING;
  } else {
    newRouterNode.inboundConnections = { ...previousNode.inboundConnections };
  }

  // now add our routerNode
  updatedNodes = mutators.mergeNode(updatedNodes, newRouterNode);

  // add our bottom
  if (bottomActions.length > 0) {
    bottomNode = {
      node: {
        uuid: createUUID(),
        actions: bottomActions,
        exits: [
          {
            uuid: createUUID(),
            destination_uuid: previousNode.node.exits[0].destination_uuid,
          },
        ],
      },
      ui: {
        position: { left, top },
      },
      inboundConnections: {
        [newRouterNode.node.exits[0].uuid]: newRouterNode.node.uuid,
      },
    };
    updatedNodes = mutators.mergeNode(updatedNodes, bottomNode);
  } else {
    // if we don't have a bottom, route our routerNode to the previous destination
    if (
      ACTIONS_WITHOUT_EXIT.includes(previousNode.node.actions[actionIdx].type)
    ) {
      previousNode.node.exits = [
        {
          uuid: createUUID(),
          destination_uuid: null,
        },
      ];
    }

    updatedNodes = mutators.updateConnection(
      updatedNodes,
      newRouterNode.node.uuid,
      newRouterNode.node.exits[0].uuid,
      previousNode.node.exits[0].destination_uuid,
    );
  }

  dispatch(updateNodes(updatedNodes));

  markDirty();
  return updatedNodes;
};

export const handleTypeConfigChange = (typeConfig: Type) => (
  dispatch: DispatchWithState,
) => {
  // TODO: Generate suggested result name if user is changing to a `wait_for_response` router.
  dispatch(updateTypeConfig(typeConfig));
};

export const resetNodeEditingState = () => (
  dispatch: DispatchWithState,
  getState: GetState,
) => {
  dispatch(mergeEditorState({ ghostNode: null }));
  dispatch(updateNodeEditorSettings(null));
};

export const updateNodesEditor = (nodes: any) => (
  dispatch: DispatchWithState,
) => {
  dispatch(updateNodes(nodes));
  markDirty(0);
};

export const onUpdateAction = (
  action: AnyAction,
  onUpdated?: (dispatch: DispatchWithState, getState: GetState) => void,
) => (dispatch: DispatchWithState, getState: GetState) => {
  timeStart('onUpdateAction');

  const {
    nodeEditor: { userAddingAction, settings },
    flowContext: { nodes, contactFields, assetStore },
  } = getState();

  if (settings == null || settings.originalNode == null) {
    throw new Error('Need originalNode in settings to update an action');
  }
  const { originalNode, originalAction } = settings;

  let updatedAssets = assetStore;

  // remove our result reference
  if (originalAction && originalAction.type === Types.set_run_result) {
    const { name: resultName } = originalAction as SetRunResult;
    updatedAssets = mutators.removeResultFromStore(resultName, updatedAssets, {
      nodeUUID: originalNode.node.uuid,
      actionUUID: action.uuid,
    });
  }

  let updatedNodes = nodes;
  const creatingNewNode = !!(originalNode !== null && originalNode.ghost);

  let nodeUUID: string = null;

  if (creatingNewNode) {
    const newNode: RenderNode = {
      node: {
        uuid: createUUID(),
        actions: [action],
        exits: [{ uuid: createUUID(), destination_uuid: null }],
      },
      ui: { position: originalNode.ui.position, type: Types.execute_actions },
      inboundConnections: originalNode.inboundConnections,
    };

    if (ACTIONS_WITHOUT_EXIT.includes(action.type)) {
      newNode.node.exits = [];
    }

    updatedNodes = mutators.mergeNode(nodes, newNode);

    nodeUUID = newNode.node.uuid;
  } else {
    nodeUUID = originalNode.node.uuid;

    if (userAddingAction) {
      updatedNodes = mutators.addAction(nodes, originalNode.node.uuid, action);
    } else if (originalNode.node.hasOwnProperty('router')) {
      updatedNodes = mutators.spliceInAction(
        nodes,
        originalNode.node.uuid,
        action,
      );
    } else {
      updatedNodes = mutators.updateAction(
        nodes,
        originalNode.node.uuid,
        action,
        originalAction,
      );
    }
  }

  dispatch(updateNodes(updatedNodes));
  dispatch(updateUserAddingAction(false));

  // Add result to store.
  if (action.type === Types.set_run_result) {
    const { name: resultName } = action as SetRunResult;
    updatedAssets = mutators.addResultToStore(resultName, updatedAssets, {
      nodeUUID,
      actionUUID: action.uuid,
    });
    dispatch(updateAssets(updatedAssets));
  }

  // Add contact field to our store.
  if (action.type === Types.set_contact_field) {
    const { field } = action as SetContactField;
    dispatch(
      updateContactFields({ ...contactFields, [field.key]: field.name }),
    );
  }

  markDirty(0);

  timeEnd('onUpdateAction');

  if (onUpdated) {
    onUpdated(dispatch, getState);
  }
  return updatedNodes;
};



/**
 * Opens the NodeEditor in the state for adding to a provided node
 * @param node the node to add to
 */
export const onAddToNode = (node: FlowNode) => (
  dispatch: DispatchWithState,
  getState: GetState,
) => {
  console.log('🟡 onAddToNode: Starting with node:', node);
  
  const {
    flowContext: { nodes },
  } = getState();

  console.log('🟡 onAddToNode: Current nodes state:', nodes);

  // TODO: remove the need for this once we all have formHelpers
  const newAction: SendMsg = {
    uuid: createUUID(),
    type: Types.send_msg,
    text: '',
  };

  console.log('🟡 onAddToNode: Created newAction:', newAction);

  const nodeEditorSettings = {
    originalNode: getNode(nodes, node.uuid),
    originalAction: newAction,
    showAdvanced: false,
  };

  console.log('🟡 onAddToNode: Created nodeEditorSettings:', nodeEditorSettings);

  // Set up the node editor configuration
  dispatch(updateUserAddingAction(true));
  console.log('🟡 onAddToNode: Dispatched updateUserAddingAction(true)');
  
  // Use onOpenNodeEditor instead of directly calling updateNodeEditorSettings
  // This ensures proper initialization including localizations and type config
  console.log('🟡 onAddToNode: About to call onOpenNodeEditor');
  dispatch(onOpenNodeEditor(nodeEditorSettings));
  console.log('🟡 onAddToNode: Called onOpenNodeEditor');

  // Only call markDirty if it has been properly initialized
  if (markDirty && typeof markDirty === 'function' && markDirty.toString() !== '() => {}') {
    markDirty();
    console.log('🟡 onAddToNode: Called markDirty');
  }
  
  console.log('🟡 onAddToNode: Completed successfully');
};

export const onRemoveNodes = (uuids: string[]) => (
  dispatch: DispatchWithState,
  getState: GetState,
): RenderNodeMap => {
  const {
    flowContext: { nodes, definition },
  } = getState();

  let updatedNodes = nodes;
  let updatedDefinition = definition;
  let didNodes = false;
  let didDef = false;

  uuids.forEach((uuid: string) => {
    if (uuid in updatedNodes) {
      updatedNodes = mutators.removeNode(updatedNodes, uuid, true);
      didNodes = true;
    } else if (uuid in updatedDefinition._ui.stickies) {
      updatedDefinition = mutators.updateStickyNote(
        updatedDefinition,
        uuid,
        null,
      );
      didDef = true;
    }
  });

  if (didNodes) {
    dispatch(updateNodes(updatedNodes));
  }

  if (didDef) {
    dispatch(updateDefinition(updatedDefinition));
  }

  if (didDef || didNodes) {
    markDirty();
  }

  return nodes;
};

export const onUpdateCanvasPositions = (positions: CanvasPositions) => (
  dispatch: DispatchWithState,
  getState: GetState,
): RenderNodeMap => {
  const {
    flowContext: { nodes, definition },
  } = getState();

  let updatedDefinition = definition;
  let updatedNodes = nodes;

  let updatedNodePosition = false;
  let updatedStickyPosition = false;

  for (const uuid in positions) {
    if (updatedNodes[uuid]) {
      updatedNodes = mutators.updatePosition(
        updatedNodes,
        uuid,
        positions[uuid],
      );
      updatedNodePosition = true;
    } else if (updatedDefinition._ui.stickies[uuid]) {
      updatedDefinition = mutators.updateStickyNotePosition(
        updatedDefinition,
        uuid,
        positions[uuid],
      );
      updatedStickyPosition = true;
    }
  }

  let updated = false;

  if (updatedNodePosition) {
    updated = true;
    dispatch(updateNodes(updatedNodes));
  }

  if (updatedStickyPosition) {
    updated = true;
    dispatch(updateDefinition(updatedDefinition));
  }

  if (updated) {
    markDirty();
  }

  return updatedNodes;
};

/**
 * Called when a connection begins to be dragged from an endpoint both
 * when a new connection is desired or when an existing one is being moved.
 * @param event
 */
export const onConnectionDrag = (
  event: ConnectionEvent,
  flowType: FlowTypes,
) => (dispatch: DispatchWithState, getState: GetState) => {
  const {
    flowContext: { nodes, assetStore },
  } = getState();

  // We finished dragging a ghost node, create the spec for our new ghost component
  const [fromNodeUUID, fromExitUUID] = event.sourceId.split(':');

  const fromNode = nodes[fromNodeUUID];

  const names = Object.keys(assetStore.results ? assetStore.results.items : {});

  let resultCount = names.length + 1;
  let key = `result_${resultCount}`;

  while (hasString(names, key)) {
    resultCount++;
    key = `result_${resultCount}`;
  }

  // set our ghost node
  const ghostNode = createEmptyNode(
    fromNode,
    fromExitUUID,
    resultCount,
    flowType,
  );
  ghostNode.inboundConnections = { [fromExitUUID]: fromNodeUUID };
  dispatch(mergeEditorState({ ghostNode }));
};

export const updateSticky = (uuid: string, sticky: StickyNote) => (
  dispatch: DispatchWithState,
  getState: GetState,
): void => {
  const {
    flowContext: { definition },
  } = getState();

  const updated = mutators.updateStickyNote(definition, uuid, sticky);
  dispatch(updateDefinition(updated));
  markDirty();
};

export const onUpdateRouter = (renderNode: RenderNode) => (
  dispatch: DispatchWithState,
  getState: GetState,
): RenderNodeMap => {
  const {
    flowContext: { nodes, assetStore },
    nodeEditor: {
      settings: { originalNode, originalAction },
    },
  } = getState();

  let updated = nodes;
  if (originalNode) {
    const previousPosition = originalNode.ui.position;
    renderNode.ui.position = previousPosition;
    renderNode.inboundConnections = originalNode.inboundConnections;
  }

  if (originalNode.ghost) {
    renderNode.inboundConnections = originalNode.inboundConnections;
    const { left, top } = originalNode.ui.position;
    renderNode.ui.position = { left, top };
    renderNode.node = mutators.uniquifyNode(renderNode.node);
  }

  // update our results
  const resultName = getResultName(renderNode.node);
  if (resultName) {
    let updatedAssets = assetStore;

    // remove our original result name
    const originalResultName = getResultName(originalNode.node);
    if (originalResultName) {
      updatedAssets = mutators.removeResultFromStore(
        originalResultName,
        updatedAssets,
        {
          nodeUUID: originalNode.node.uuid,
        },
      );
    }

    updatedAssets = mutators.addFlowResult(updatedAssets, renderNode.node);
    dispatch(updateAssets(updatedAssets));
  }

  if (
    originalNode &&
    originalAction &&
    !originalNode.ghost &&
    !getSmartOrSwitchRouter(originalNode.node)
  ) {
    const actionToSplice = originalNode.node.actions.find(
      (action: Action) => action.uuid === originalAction.uuid,
    );

    if (actionToSplice) {
      // if we are splicing using the original top
      renderNode.ui.position.top = originalNode.ui.position.top;

      return dispatch(
        spliceInRouter(renderNode, {
          nodeUUID: originalNode.node.uuid,
          actionUUID: actionToSplice.uuid,
        }),
      );
    }

    // didn't recognize that action, let's add a new router node
    // if we are appendeng in, see if we need to route through
    const switchRouter = getSmartOrSwitchRouter(renderNode.node);
    if (switchRouter) {
      const defaultCategory = switchRouter.categories.find(
        (cat: Category) => cat.uuid === switchRouter.default_category_uuid,
      );
      const exitToUpdate = renderNode.node.exits.find(
        (exit: Exit) => exit.uuid === defaultCategory.exit_uuid,
      );

      exitToUpdate.destination_uuid =
        originalNode.node.exits[0].destination_uuid;
    }

    renderNode.inboundConnections = {
      [originalNode.node.exits[0].uuid]: originalNode.node.uuid,
    };
    renderNode.node = mutators.uniquifyNode(renderNode.node);
    renderNode.ui.position.top += NODE_SPACING;
    updated = mutators.mergeNode(updated, renderNode);
  } else {
    updated = mutators.mergeNode(updated, renderNode);
  }

  dispatch(updateNodes(updated));

  markDirty(0);
  return updated;
};

export const onOpenNodeEditor = (settings: NodeEditorSettings) => (
  dispatch: DispatchWithState,
  getState: GetState,
) => {
  console.log('🟢 onOpenNodeEditor: called with settings:', settings);
  
  const {
    flowContext: {
      definition: { localization },
    },
    editorState: { language, translating },
  } = getState();

  console.log('🟢 onOpenNodeEditor: current state - language:', language, 'translating:', translating);

  const { originalNode: renderNode } = settings;
  let { originalAction: action } = settings;

  const node = renderNode.node;
  console.log('🟢 onOpenNodeEditor: node:', node);
  console.log('🟢 onOpenNodeEditor: originalAction:', action);

  // stuff our localization objects in our settings
  settings.localizations = [];
  if (translating) {
    console.log('🟢 onOpenNodeEditor: in translating mode');
    let actionToTranslate = action;

    // TODO: this is a hack, would be nice to find how to make that area respond differently
    // if they clicked just below the actions, treat it as the last action
    if (!actionToTranslate && node.actions.length > 0) {
      actionToTranslate = node.actions[node.actions.length - 1];

      const ACTIONS_AVAILABLE_TO_TRANSLATE = [
        Types.send_msg,
        Types.send_broadcast,
        Types.call_wenigpt,
      ];

      if (!ACTIONS_AVAILABLE_TO_TRANSLATE.includes(actionToTranslate.type)) {
        console.log('🟢 onOpenNodeEditor: action not available for translation, returning early');
        return;
      }
    }

    const translations = localization[language.id];
    settings.localizations.push(
      ...getLocalizations(node, actionToTranslate, language, translations),
    );
  }

  // Account for hybrids or clicking on the empty exit table
  if (!action && node.actions.length > 0) {
    action = node.actions[node.actions.length - 1];
    console.log('🟢 onOpenNodeEditor: no action provided, using last action:', action);
  }

  const typeConfig = determineTypeConfig(settings);
  console.log('🟢 onOpenNodeEditor: determined typeConfig:', typeConfig);
  
  console.log('🟢 onOpenNodeEditor: dispatching handleTypeConfigChange');
  dispatch(handleTypeConfigChange(typeConfig));
  
  console.log('🟢 onOpenNodeEditor: dispatching updateNodeEditorSettings with settings:', settings);
  dispatch(updateNodeEditorSettings(settings));
  
  console.log('🟢 onOpenNodeEditor: completed successfully');
};

export const updateTranslationFilters = (translationFilters: {
  categories: boolean;
  rules: boolean;
}) => (dispatch: DispatchWithState, getState: GetState): void => {
  const {
    flowContext: { definition },
  } = getState();

  definition._ui.translation_filters = translationFilters;
  dispatch(updateDefinition(definition));
  markDirty();
};

export const triggerSave = () => (
  dispatch: DispatchWithState,
  getState: GetState,
): void => {
  markDirty();
};
