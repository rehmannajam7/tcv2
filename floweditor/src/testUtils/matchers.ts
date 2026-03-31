import { commaListsOr } from 'common-tags';
import { Exit } from 'flowTypes';
import { RenderNode } from 'store/flowContext';

interface MatcherResult {
  pass: boolean;
  message: () => string;
  actual?: unknown;
  expected?: unknown;
}

function toBeUnique(received: any): MatcherResult {
  const seen: { [value: string]: boolean } = {};

  for (const item of received) {
    const stringified = JSON.stringify(item, null, 1);
    if (seen[stringified]) {
      return {
        message: () => `Duplicate item in array:\n${stringified}`,
        pass: false,
      };
    } else {
      seen[stringified] = true;
    }
  }

  return {
    message: () => 'Array is unique',
    pass: true,
  };
}

function toHaveInboundConnections(received: RenderNode): MatcherResult {
  if (Object.keys(received.inboundConnections).length > 1) {
    return {
      message: () => `Node ${received.node.uuid} has an inbound connection`,
      pass: true,
    };
  }

  return {
    message: () => `Node ${received.node.uuid} has no inbound connections`,
    pass: false,
  };
}

function toHaveInboundFrom(
  received: RenderNode,
  expected: Exit,
): MatcherResult {
  for (const exitUUID of Object.keys(received.inboundConnections)) {
    if (exitUUID === expected.uuid) {
      return {
        message: () =>
          `Node ${received.node.uuid} incorrectly has inbound from ${expected.uuid}`,
        pass: true,
      };
    }
  }

  return {
    message: () =>
      `Node ${received.node.uuid} doesn't have inbound connection from ${expected.uuid}`,
    pass: false,
  };
}

function toPointTo(received: Exit, expected: RenderNode): MatcherResult {
  if (received.destination_uuid === expected.node.uuid) {
    return {
      message: () =>
        `${received.uuid} incorrectly points to ${expected.node.uuid}`,
      pass: true,
    };
  }

  return {
    message: () =>
      `Expected ${received.uuid} to point to ${expected.node.uuid}`,
    pass: false,
  };
}

function toHaveExitWithDestination(received: RenderNode): MatcherResult {
  for (const exit of received.node.exits) {
    if (exit.destination_uuid !== null) {
      return {
        message: () =>
          `Exit ${exit.uuid} in node ${received.node.uuid} has a destination`,
        pass: true,
      };
    }
  }

  return {
    message: () => `All exits for ${received.node.uuid} are disconnected`,
    pass: false,
  };
}

function toHaveExitThatPointsTo(
  received: RenderNode,
  expected: RenderNode,
): MatcherResult {
  for (const exit of received.node.exits) {
    if (exit.destination_uuid === expected.node.uuid) {
      return {
        message: () =>
          `${exit.uuid} incorrectly has exit that points to ${expected.node.uuid}`,
        pass: true,
      };
    }
  }

  return {
    message: () =>
      `Expected ${received.node.uuid} to have an exit that points to ${expected.node.uuid}`,
    pass: false,
  };
}

function toHavePayload(
  store: any,
  actionType: string,
  expectedPayload: any,
): MatcherResult {
  const payload = JSON.stringify(expectedPayload);
  for (const actionTaken of store.getActions()) {
    if (actionTaken.type === actionType) {
      if (JSON.stringify(actionTaken.payload) === payload) {
        return {
          message: () =>
            `Result contained action type ${actionType} with payload ${payload}`,
          pass: true,
        };
      }
    }
  }

  return {
    message: () =>
      `Could not find action type ${actionType} with payload ${payload}`,
    pass: false,
  };
}

function toHaveReduxActions(store: any, actionTypes: string[]): MatcherResult {
  const missedTypes: any[] = [];
  for (const actionTaken of store.getActions()) {
    for (const actionType of actionTypes) {
      if (actionTaken.type === actionType) {
        return {
          message: () => `Result contained action type ${actionType}`,
          pass: true,
        };
      } else {
        missedTypes.push(actionType);
      }
    }
  }

  return {
    message: () =>
      commaListsOr`Could not find action type(s): ${[...missedTypes]}`,
    pass: false,
  };
}

export default {
  toPointTo,
  toHaveExitThatPointsTo,
  toHaveInboundFrom,
  toHaveExitWithDestination,
  toHaveInboundConnections,
  toHavePayload,
  toHaveReduxActions,
  toBeUnique,
};
