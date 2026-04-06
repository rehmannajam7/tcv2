import { fieldToAsset } from 'components/flow/actions/updatecontact/helpers';
import { getResultName } from 'components/flow/node/helpers';
import { DefaultExitNames } from 'components/flow/routers/constants';
import { getSmartOrSwitchRouter } from 'components/flow/routers/helpers';
import { GROUPS_OPERAND } from 'components/nodeeditor/constants';
import { FlowTypes, Types } from 'config/interfaces';
import { getType } from 'config/typeConfigs';
import { getActivity } from 'external';
import {
  AddLabels,
  AnyAction,
  Category,
  ChangeGroups,
  FlowDefinition,
  FlowNode,
  FlowPosition,
  HintTypes,
  RouterTypes,
  SetContactField,
  SetRunResult,
  StickyNote,
  SwitchRouter,
  UIMetaData,
  Wait,
  WaitTypes,
  SendMsg,
  FlowIssue,
  FlowIssueType,
  SendWhatsAppMsg,
} from 'flowTypes';
import Localization, { LocalizedObject } from 'services/Localization';
import { Activity, EditorState, Warnings } from 'store/editor';
import {
  Asset,
  AssetMap,
  AssetType,
  RenderNode,
  RenderNodeMap,
  FlowIssueMap,
} from 'store/flowContext';
import { addResult } from 'store/mutators';
import { DispatchWithState, GetState, mergeEditorState } from 'store/thunks';
import { createUUID, snakify } from 'utils';

export interface Bounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface Reflow {
  uuid: string;
  bounds: Bounds;
}

// track if we have an active timeout before issuing a new one
let activityTimeout: any = null;

// Configuration to disable activity polling
const DISABLE_ACTIVITY_POLLING = process.env.NODE_ENV === 'development' || 
  (window as any).DISABLE_ACTIVITY_POLLING === true;

// Intelligent polling configuration
const POLLING_CONFIG = {
  MIN_INTERVAL: 5200,        // 5 seconds minimum
  MAX_INTERVAL: 300000,      // 5 minutes maximum
  BACKOFF_MULTIPLIER: 1.5,   // Exponential backoff multiplier
  VISIBILITY_INTERVAL: 30000, // 30 seconds when not visible
  ERROR_RETRY_DELAY: 10000,  // 10 seconds on error
  MAX_CONSECUTIVE_ERRORS: 3, // Circuit breaker threshold
  ACTIVITY_RESET_THRESHOLD: 60000, // Reset interval if activity detected
};

// Circuit breaker state
let consecutiveErrors = 0;
let lastActivityTime = Date.now();
let isCircuitOpen = false;

export const getNodeWithAction = (
  nodes: RenderNodeMap,
  actionUUID: string,
): RenderNode => {
  for (const nodeUUID of Object.keys(nodes)) {
    const renderNode = nodes[nodeUUID];
    for (const action of renderNode.node.actions) {
      if (action.uuid === actionUUID) {
        return renderNode;
      }
    }
  }
};

export const getNode = (nodes: RenderNodeMap, nodeUUID: string) => {
  const node = nodes[nodeUUID];
  if (!node) {
    throw new Error('Cannot find node ' + nodeUUID);
  }
  return node;
};

export const getExitIndex = (node: FlowNode, exitUUID: string) => {
  for (const [exitIdx, exit] of node.exits.entries()) {
    if (exit.uuid === exitUUID) {
      return exitIdx;
    }
  }
  throw new Error('Cannot find exit ' + exitUUID);
};

export const getActionIndex = (node: FlowNode, actionUUID: string) => {
  for (const [actionIdx, action] of node.actions.entries()) {
    if (action.uuid === actionUUID) {
      return actionIdx;
    }
  }
  throw new Error('Cannot find action ' + actionUUID);
};

export const getSuggestedResultName = (count: number) => `Result ${count}`;

export const hasRouter = (renderNode: RenderNode): boolean => {
  return !!(renderNode && renderNode.node.router);
};

export const hasWait = (renderNode: RenderNode): boolean => {
  return !!(renderNode.node.router && renderNode.node.router.wait);
};

export const hasLoopSplit = (renderNode: RenderNode): boolean => {
  const type = getType(renderNode);

  return (
    hasWait(renderNode) ||
    type === Types.split_by_expression ||
    type === Types.split_by_subflow
  );
};

/**
 * Follows every path from fromNodeUUID to toNodeUUID and throws
 * an error if we hit ourselves again without hitting a wait
 * @param nodes the entire node map
 * @param fromNodeUUID which node we are originating from
 * @param toNodeUUID where we are trying to go
 * @param path the path we have tried so far
 */
export const detectLoops = (
  nodes: RenderNodeMap,
  fromNodeUUID: string,
  toNodeUUID: string,
  path: string[] = [],
): void => {
  const fromNode = nodes[fromNodeUUID];
  const toNode = nodes[toNodeUUID];

  if (fromNodeUUID === toNodeUUID) {
    throw new Error("Flow loop detected, can't point to self");
  }

  if (hasLoopSplit(toNode) || hasLoopSplit(fromNode)) {
    return;
  }

  if (path.length === 0) {
    path.push(fromNodeUUID);
    for (const exit of toNode.node.exits) {
      if (exit.destination_uuid) {
        detectLoops(nodes, toNode.node.uuid, exit.destination_uuid, path);
      }
    }
    return;
  }

  // we're back where we started
  if (toNodeUUID === path[0]) {
    throw new Error('Flow loop detected, route through a wait first');
  }

  // add us to the path
  path.push(toNodeUUID);

  // follow each of our exits
  for (const exit of toNode.node.exits) {
    if (exit.destination_uuid) {
      detectLoops(nodes, toNodeUUID, exit.destination_uuid, path);
    }
  }

  return;
};

export const getLocalizations = (
  node: FlowNode,
  action: AnyAction,
  language: Asset,
  translations?: { [uuid: string]: any },
): LocalizedObject[] => {
  const localizations: LocalizedObject[] = [];

  // Account for localized cases
  if (
    node.router &&
    [RouterTypes.switch, RouterTypes.smart].includes(node.router.type)
  ) {
    const router = node.router as SwitchRouter;

    router.cases.forEach(kase =>
      localizations.push(Localization.translate(kase, language, translations)),
    );
  }

  if (action) {
    localizations.push(Localization.translate(action, language, translations));
    // check for localized template variables]
    if (action.type === Types.send_msg) {
      const sendMsgAction = action as SendMsg;
      if (sendMsgAction.templating) {
        localizations.push(
          Localization.translate(
            sendMsgAction.templating,
            language,
            translations,
          ),
        );
      }
    }

    if (action.type === Types.send_whatsapp_msg) {
      const sendWppMsgAction = action as SendWhatsAppMsg;
      if (sendWppMsgAction.list_items) {
        sendWppMsgAction.list_items.forEach(item => {
          localizations.push(
            Localization.translate(item, language, translations),
          );
        });
      }
    }
  }

  // Account for localized categories
  if (node.router) {
    node.router.categories.forEach(category => {
      if (category.name) {
        localizations.push(
          Localization.translate(category, language, translations),
        );
      }
    });
  }

  return localizations;
};

export const getUniqueDestinations = (node: FlowNode): string[] => {
  const destinations: any = {};
  for (const exit of node.exits) {
    if (exit.destination_uuid) {
      destinations[exit.destination_uuid] = true;
    }
  }
  return Object.keys(destinations);
};

export const getCurrentDefinition = (
  definition: FlowDefinition,
  nodeMap: RenderNodeMap,
  includeUI = true,
): FlowDefinition => {
  const renderNodes = getOrderedNodes(nodeMap);
  const nodes: FlowNode[] = [];
  renderNodes.forEach((renderNode: RenderNode) => nodes.push(renderNode.node));

  // tslint:disable-next-line:variable-name
  const uiNodes: any = {};
  for (const uuid of Object.keys(nodeMap)) {
    uiNodes[uuid] = nodeMap[uuid].ui;
  }

  const result = {
    ...definition,
    nodes,
  };

  if (includeUI) {
    // tslint:disable-next-line:variable-name
    result._ui = {
      nodes: uiNodes,
      stickies: definition._ui.stickies,
      languages: definition._ui.languages,
      translation_filters: definition._ui.translation_filters,
    } as UIMetaData;
  }

  return result;
};

export const newPosition = (left: number, top: number): FlowPosition => {
  return { left, top };
};

export const addPosition = (a: FlowPosition, b: FlowPosition): FlowPosition => {
  const width = a.right - a.left;
  const height = a.bottom - a.top;

  // we allow dragging out of bounds
  const top = a.top + b.top;
  const left = a.left + b.left;

  if (width && height) {
    return {
      left,
      top,
      right: left + width,
      bottom: top + height,
    };
  }

  return { top, left };
};

export const subtractPosition = (
  a: FlowPosition,
  b: FlowPosition,
): FlowPosition => {
  return { left: a.left - b.left, top: a.top - b.top };
};

export const getOrderedNodes = (nodes: RenderNodeMap): RenderNode[] => {
  const sorted: RenderNode[] = [];
  Object.keys(nodes).forEach((nodeUUID: string) => {
    sorted.push(nodes[nodeUUID]);
  });
  return sorted.sort((a: RenderNode, b: RenderNode) => {
    let diff = a.ui.position.top - b.ui.position.top;
    if (diff === 0) {
      diff = a.ui.position.left - b.ui.position.left;
    }
    return diff;
  });
};

export const getCollisions = (
  nodes: RenderNodeMap,
  stickies: { [key: string]: StickyNote },
  box: FlowPosition,
): { [uuid: string]: FlowPosition } => {
  const collisions: any = {};
  for (const nodeUUID of Object.keys(nodes)) {
    const node = nodes[nodeUUID];
    if (collides(box, node.ui.position)) {
      collisions[node.node.uuid] = node.ui.position;
    }
  }

  for (const uuid in stickies) {
    const sticky = stickies[uuid];
    if (collides(box, sticky.position)) {
      collisions[uuid] = sticky.position;
    }
  }

  return collisions;
};

export const collides = (a: FlowPosition, b: FlowPosition) => {
  // don't bother with collision if we don't have full dimensions
  /* istanbul ignore next -- @preserve */
  if (!a.bottom || !b.bottom) {
    return false;
  }

  return !(
    b.left > a.right ||
    b.right < a.left ||
    b.top > a.bottom ||
    b.bottom < a.top
  );
};

/**
 * Gets the first collsion in the node map returning the original node,
 * the node it collides with and optionally an additional node it
 * collides with if inserting between two nodes
 * @param nodes
 */
export const getCollision = (nodes: RenderNodeMap): RenderNode[] => {
  const sortedNodes = getOrderedNodes(nodes);

  for (let i = 0; i < sortedNodes.length; i++) {
    const current = sortedNodes[i];
    if (i + 1 < sortedNodes.length) {
      for (let j = i + 1; j < sortedNodes.length; j++) {
        const other = sortedNodes[j];
        if (collides(current.ui.position, other.ui.position)) {
          // if the next node collides too, include it
          // to deal with inserting between two closely
          // positioned nodes
          if (j + 1 < sortedNodes.length) {
            const cascaded = sortedNodes[j + 1];
            if (collides(other.ui.position, cascaded.ui.position)) {
              return [current, other, cascaded];
            }
          }
          return [current, other];
        }
      }
    }
  }
  return [];
};

export const createEmptyNode = (
  fromNode: RenderNode,
  fromExitUUID: string,
  suggestedResultNameCount: number,
  flowType: FlowTypes,
): RenderNode => {
  const emptyNode: FlowNode = {
    uuid: createUUID(),
    actions: [],
    exits: [
      {
        uuid: createUUID(),
        destination_uuid: null,
      },
    ],
  };

  let type = Types.execute_actions;

  // Add an action next if 1) this is first node, 2) we are coming from a router or 3) this is a background flow
  if (
    !fromNode ||
    hasRouter(fromNode) ||
    flowType === FlowTypes.MESSAGING_BACKGROUND
  ) {
    const replyType =
      flowType === FlowTypes.VOICE ? Types.say_msg : Types.send_msg;
    const replyAction = {
      uuid: createUUID(),
      text: '',
      type: replyType,
    };

    emptyNode.actions.push(replyAction);
  } else {
    // Otherwise we are going to a switch
    const categories: Category[] = [
      {
        uuid: createUUID(),
        name: DefaultExitNames.All_Responses,
        exit_uuid: emptyNode.exits[0].uuid,
      },
    ];

    const wait: Wait = { type: WaitTypes.msg };
    type = Types.wait_for_response;
    if (flowType === FlowTypes.VOICE) {
      wait.hint = { type: HintTypes.digits, count: 1 };
    }

    emptyNode.router = {
      type: RouterTypes.switch,
      result_name: getSuggestedResultName(suggestedResultNameCount),
      default_category_uuid: categories[0].uuid,
      categories,
      wait,
      cases: [],
    } as SwitchRouter;
  }

  let inboundConnections = {};
  if (fromNode) {
    inboundConnections = { [fromExitUUID]: fromNode.node.uuid };
  }

  return {
    node: emptyNode,
    ui: { position: { left: 0, top: 0 }, type },
    inboundConnections,
    ghost: true,
  };
};

export interface FlowComponents {
  renderNodeMap: RenderNodeMap;
  groups: AssetMap;
  fields: AssetMap;
  labels: AssetMap;
  results: AssetMap;
  warnings: Warnings;
}

export const isGroupAction = (actionType: string) => {
  return (
    actionType === Types.add_contact_groups ||
    actionType === Types.remove_contact_groups ||
    actionType === Types.send_broadcast
  );
};

/**
 * This isn't necessarily supported, but lets make a best effort to guess node
 * types from cues within the definition if somebody loads a flow without _ui details.
 * @param node
 */
export const guessNodeType = (node: FlowNode) => {
  // router based nodes
  if (node.router) {
    // hybrid nodes
    if (node.actions.length === 1) {
      if (node.actions[0].type === Types.call_webhook) {
        return Types.split_by_webhook;
      }

      if (node.actions[0].type === Types.transfer_airtime) {
        return Types.split_by_airtime;
      }

      if (node.actions[0].type === Types.call_resthook) {
        return Types.split_by_resthook;
      }

      if (node.actions[0].type === Types.enter_flow) {
        return Types.split_by_subflow;
      }
    }

    if (node.router.wait) {
      return Types.wait_for_response;
    }

    if (node.router.type === RouterTypes.random) {
      return Types.split_by_random;
    }

    const switchRouter = getSmartOrSwitchRouter(node);
    if (switchRouter) {
      if (switchRouter.operand === GROUPS_OPERAND) {
        return Types.split_by_groups;
      }
    }

    return Types.split_by_expression;
  }

  return Types.execute_actions;
};

export const generateResultQuery = (resultName: string) =>
  `@run.results.${snakify(resultName)}`;

/**
 * Converts a list of assets to a map keyed by their id
 */
export const assetListToMap = (assets: Asset[]): AssetMap => {
  const assetMap: any = {};
  for (const asset of assets) {
    assetMap[asset.id] = asset;
  }
  return assetMap;
};

export const assetMapToList = (assets: AssetMap): any[] => {
  return Object.keys(assets).map(key => {
    const asset = assets[key];
    return { uuid: asset.id, name: asset.name };
  });
};

/**
 * Processes an initial FlowDefinition for details necessary for the editor
 */
export const getFlowComponents = (
  definition: FlowDefinition,
): FlowComponents => {
  const renderNodeMap: RenderNodeMap = {};
  const warnings: Warnings = {};
  const { nodes, _ui } = definition;

  // initialize our nodes
  const pointerMap: { [uuid: string]: { [uuid: string]: string } } = {};

  const groups: AssetMap = {};
  const fields: AssetMap = {};
  const labels: AssetMap = {};
  let results: AssetMap = {};

  for (const node of nodes) {
    if (!node.actions) {
      node.actions = [];
    }

    const ui = _ui.nodes[node.uuid];
    const renderNode: RenderNode = {
      node,
      ui,
      inboundConnections: {},
    };

    renderNodeMap[node.uuid] = renderNode;

    const resultName = getResultName(node);
    if (resultName) {
      results = addResult(resultName, results, { nodeUUID: node.uuid });
    }

    const type = getType(renderNode);

    // if we are split by group, look at our categories for groups
    if (type === Types.split_by_groups) {
      const router = getSmartOrSwitchRouter(node);

      for (const kase of router.cases) {
        const groupUUID = kase.arguments[0];
        const category = router.categories.find((cat: Category) => {
          return cat.uuid === kase.category_uuid;
        });

        /* istanbul ignore else */
        if (category) {
          if (groupUUID) {
            groups[groupUUID] = {
              name: category.name,
              id: groupUUID,
              type: AssetType.Group,
            };
          }
        }
      }
    }

    for (const action of node.actions) {
      if (isGroupAction(action.type)) {
        const groupsToChange = (action as ChangeGroups).groups;
        if (groupsToChange) {
          for (const group of groupsToChange) {
            if (group.uuid) {
              groups[group.uuid] = {
                name: group.name,
                id: group.uuid,
                type: AssetType.Group,
              };
            }
          }
        }
      } else if (action.type === Types.set_contact_field) {
        const fieldAction = action as SetContactField;
        fields[fieldAction.field.key] = {
          name: fieldAction.field.name,
          id: fieldAction.field.key,
          type: AssetType.Field,
        };
      } else if (action.type === Types.add_input_labels) {
        for (const label of (action as AddLabels).labels) {
          labels[label.uuid] = {
            name: label.name,
            id: label.uuid,
            type: AssetType.Label,
          };
        }
      } else if (action.type === Types.set_run_result) {
        const resultAction = action as SetRunResult;
        const key = snakify(resultAction.name);

        if (key in results) {
          results[key].references.push({
            nodeUUID: node.uuid,
            actionUUID: action.uuid,
          });
        } else {
          results[key] = {
            name: resultAction.name,
            id: key,
            type: AssetType.Result,
            references: [{ nodeUUID: node.uuid, actionUUID: action.uuid }],
          };
        }
      }
    }

    // Ensure node.exits exists and is iterable before processing
    if (node.exits && Array.isArray(node.exits)) {
      for (const exit of node.exits) {
        if (exit.destination_uuid) {
          let pointers: { [uuid: string]: string } =
            pointerMap[exit.destination_uuid];

          if (!pointers) {
            pointers = {};
          }

          pointers[exit.uuid] = node.uuid;
          pointerMap[exit.destination_uuid] = pointers;
        }
      }
    } else {
      // If exits is missing or not an array, initialize it as an empty array
      console.warn(`Node ${node.uuid} has invalid exits property, initializing as empty array`);
      node.exits = [];
    }
  }

  // store our pointers with their associated nodes
  for (const nodeUUID of Object.keys(pointerMap)) {
    renderNodeMap[nodeUUID].inboundConnections = pointerMap[nodeUUID];
  }

  return { renderNodeMap, groups, fields, labels, results, warnings };
};

/**
 * Extracts contact fields from a list of nodes
 */
export const extractContactFields = (nodes: FlowNode[]): Asset[] =>
  nodes.reduce((fieldList, { actions }) => {
    actions.forEach(action => {
      if (action.type === Types.set_contact_field) {
        fieldList.push(fieldToAsset((action as SetContactField).field));
      }
    });
    return fieldList;
  }, []);

/** Adds all the items from toAdd if that don't already exist in assets */
export const mergeAssetMaps = (assets: AssetMap, toAdd: AssetMap): void => {
  Object.keys(toAdd).forEach((key: string) => {
    assets[key] = assets[key] || toAdd[key];
  });
};

export const createFlowIssueMap = (
  previousIssues: FlowIssueMap,
  issues: FlowIssue[],
): FlowIssueMap => {
  const issueMap: FlowIssueMap = (issues || [])
    .filter((issue: FlowIssue) => issue.type !== FlowIssueType.LEGACY_EXTRA)
    .reduce((issueMap: FlowIssueMap, issue: FlowIssue) => {
      const nodeIssues: FlowIssue[] = issueMap[issue.node_uuid] || [];
      nodeIssues.push(issue);
      issueMap[issue.node_uuid] = nodeIssues;
      return issueMap;
    }, {});

  for (const [nodeUUID, nodeIssues] of Object.entries(issueMap)) {
    // would be nice not to use stringify as a deepequals here
    if (
      JSON.stringify(previousIssues[nodeUUID]) === JSON.stringify(nodeIssues)
    ) {
      issueMap[nodeUUID] = previousIssues[nodeUUID];
    }
  }
  return issueMap;
};

// ActionCable integration for real-time flow activity updates
let actionCableConnection: any = null;

function initializeActionCable() {
  if (actionCableConnection || typeof window === 'undefined') {
    return;
  }

  try {
    // Initialize ActionCable connection if available
    const ActionCable = (window as any).ActionCable;
    if (ActionCable && (window as any).chatwootConfig?.websocketURL) {
      const websocketURL = (window as any).chatwootConfig.websocketURL;
      const pubsubToken = (window as any).chatwootConfig?.pubsubToken;
      
      if (pubsubToken) {
        actionCableConnection = ActionCable.createConsumer(`${websocketURL}?pubsub_token=${pubsubToken}`);
        
        // Subscribe to flow activity updates
        actionCableConnection.subscriptions.create(
          { channel: 'RoomChannel', pubsub_token: pubsubToken },
          {
            received: (data: any) => {
              if (data.event === 'flow.activity_updated') {
                handleFlowActivityUpdate(data.data);
              }
            },
            connected: () => {
              console.log('Flow activity ActionCable connected');
            },
            disconnected: () => {
              console.log('Flow activity ActionCable disconnected');
            }
          }
        );
      }
    }
  } catch (error) {
    console.warn('ActionCable initialization failed:', error);
  }
}

function handleFlowActivityUpdate(data: any) {
  // Reset polling state when real-time activity is received
  if (data.has_activity) {
    lastActivityTime = Date.now();
    consecutiveErrors = 0;
    isCircuitOpen = false;
    
    // Note: Cannot trigger immediate activity fetch here without proper context
    // The polling mechanism will pick up the activity on the next scheduled poll
    console.log('Flow activity update received via ActionCable');
  }
}

// Initialize ActionCable when the module loads
if (typeof window !== 'undefined') {
  // Delay initialization to ensure ActionCable is available
  setTimeout(initializeActionCable, 1000);
}

export const fetchFlowActivity = (
  endpoint: string,
  dispatch: DispatchWithState,
  getState: GetState,
  uuid: string,
): void => {
  // Check if activity polling is disabled
  if (DISABLE_ACTIVITY_POLLING) {
    console.log('Activity polling is disabled');
    return;
  }

  // Circuit breaker: stop polling if too many consecutive errors
  if (isCircuitOpen) {
    console.warn('Flow activity polling circuit breaker is open, skipping poll');
    scheduleNextPoll(endpoint, dispatch, getState, uuid, POLLING_CONFIG.ERROR_RETRY_DELAY);
    return;
  }

  const {
    editorState: { simulating, activityInterval, visible },
  } = getState();

  // Calculate intelligent polling interval
  const nextInterval = calculateNextInterval(visible, activityInterval);

  if (visible) {
    getActivity(endpoint, uuid)
      .then((activity: Activity) => {
        // Reset error counter on successful response
        consecutiveErrors = 0;
        isCircuitOpen = false;

        if (activity) {
          // Check if there's new activity
          const hasNewActivity = checkForNewActivity(activity, getState());
          
          // Update activity time if new activity detected
          if (hasNewActivity) {
            lastActivityTime = Date.now();
          }

          const sanitizedActivity = { nodes: activity.nodes || {}, segments: activity.segments || {}, recentMessages: activity.recentMessages };
          const updates: Partial<EditorState> = {
            liveActivity: sanitizedActivity,
            activityInterval: nextInterval,
          };

          if (!simulating) {
            updates.activity = sanitizedActivity;
          }

          dispatch(mergeEditorState(updates));

          // Schedule next poll with calculated interval
          scheduleNextPoll(endpoint, dispatch, getState, uuid, nextInterval);
        }
      })
      .catch((error: Error) => {
        handlePollingError(error, endpoint, dispatch, getState, uuid);
      });
  } else {
    // When not visible, use longer interval to reduce load
    scheduleNextPoll(endpoint, dispatch, getState, uuid, POLLING_CONFIG.VISIBILITY_INTERVAL);
  }
};

// Helper function to calculate intelligent polling interval
const calculateNextInterval = (visible: boolean, currentInterval: number): number => {
  if (!visible) {
    return POLLING_CONFIG.VISIBILITY_INTERVAL;
  }

  // Check if there's been recent activity
  const timeSinceLastActivity = Date.now() - lastActivityTime;
  
  if (timeSinceLastActivity < POLLING_CONFIG.ACTIVITY_RESET_THRESHOLD) {
    // Recent activity detected, use minimum interval
    return POLLING_CONFIG.MIN_INTERVAL;
  }

  // Apply exponential backoff, but cap at maximum
  const nextInterval = Math.min(
    currentInterval * POLLING_CONFIG.BACKOFF_MULTIPLIER,
    POLLING_CONFIG.MAX_INTERVAL
  );

  return Math.max(nextInterval, POLLING_CONFIG.MIN_INTERVAL);
};

// Helper function to check for new activity
const checkForNewActivity = (newActivity: Activity, state: any): boolean => {
  const currentActivity = state.editorState.liveActivity;
  
  if (!currentActivity) {
    return true; // First time getting activity
  }

  // Compare activity timestamps or other indicators of change
  // This is a simplified check - you may need to adjust based on Activity structure
  return JSON.stringify(newActivity) !== JSON.stringify(currentActivity);
};

// Helper function to handle polling errors
const handlePollingError = (
  error: Error,
  endpoint: string,
  dispatch: DispatchWithState,
  getState: GetState,
  uuid: string
): void => {
  consecutiveErrors++;
  
  console.error(`Flow activity polling error (${consecutiveErrors}/${POLLING_CONFIG.MAX_CONSECUTIVE_ERRORS}):`, error);

  // Open circuit breaker if too many consecutive errors
  if (consecutiveErrors >= POLLING_CONFIG.MAX_CONSECUTIVE_ERRORS) {
    isCircuitOpen = true;
    console.warn('Flow activity polling circuit breaker opened due to consecutive errors');
    
    // Reset circuit breaker after a delay
    setTimeout(() => {
      isCircuitOpen = false;
      consecutiveErrors = 0;
      console.info('Flow activity polling circuit breaker reset');
    }, POLLING_CONFIG.ERROR_RETRY_DELAY * 3); // Wait 3x the retry delay before resetting
  }

  // Schedule retry with error delay
  scheduleNextPoll(endpoint, dispatch, getState, uuid, POLLING_CONFIG.ERROR_RETRY_DELAY);
};

// Helper function to schedule the next poll
const scheduleNextPoll = (
  endpoint: string,
  dispatch: DispatchWithState,
  getState: GetState,
  uuid: string,
  delay: number
): void => {
  if (activityTimeout) {
    window.clearTimeout(activityTimeout);
  }

  activityTimeout = window.setTimeout(() => {
    fetchFlowActivity(endpoint, dispatch, getState, uuid);
  }, delay);
};
