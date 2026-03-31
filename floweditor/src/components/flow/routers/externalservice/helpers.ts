import { createWebhookBasedNode } from 'components/flow/routers/helpers';
import { ServiceCall, Types } from 'config/interfaces';
import { getType } from 'config/typeConfigs';
import { CallExternalService } from 'flowTypes';
import { AssetMap, RenderNode } from 'store/flowContext';
import { NodeEditorSettings, FormEntry } from 'store/nodeEditor';
import { createUUID } from 'utils';
import { ExternalServiceRouterFormState } from 'components/flow/routers/externalservice/ExternalServiceRouterForm';

export const getOriginalAction = (
  settings: NodeEditorSettings,
): CallExternalService => {
  const action =
    settings.originalAction ||
    (settings.originalNode.node.actions.length > 0 &&
      settings.originalNode.node.actions[0]);

  if (action.type === Types.call_external_service) {
    return action as CallExternalService;
  }
};

export const nodeToState = (
  settings: NodeEditorSettings,
  existingServices: AssetMap,
  initialExternalService: any,
): ExternalServiceRouterFormState => {
  let resultName = { value: 'Result' };

  let externalService: FormEntry = null;
  let initialCall: FormEntry = null;
  let initialParams: any[] = [];

  if (
    settings.originalNode &&
    getType(settings.originalNode) === Types.split_by_external_service
  ) {
    const action = getOriginalAction(settings) as CallExternalService;
    const service = existingServices[action.external_service.uuid];

    if (service) {
      externalService = {
        value: {
          ...service.content,
          name: service.name,
          external_service_type: service.type,
          uuid: service.id,
        },
      };
    } else {
      externalService = { value: action.external_service };
    }

    const existingCallParams =
      externalService.value.actions &&
      externalService.value.actions.find((a: ServiceCall) => {
        return a.name === action.call.name;
      }).params;

    initialCall = {
      value: existingCallParams
        ? { ...action.call, params: existingCallParams }
        : action.call,
    };
    initialParams = action.params;
    resultName = { value: action.result_name };
  } else {
    externalService = initialExternalService
      ? {
          value: {
            uuid: initialExternalService.id,
            name: initialExternalService.name,
            type: initialExternalService.type,
            actions: initialExternalService.content.actions,
          },
        }
      : { value: null };
  }

  const state: ExternalServiceRouterFormState = {
    externalService,
    call: initialCall,
    resultName,
    params: { value: initialParams },
    valid: true,
  };

  return state;
};

export const stateToNode = (
  settings: NodeEditorSettings,
  state: ExternalServiceRouterFormState,
): RenderNode => {
  let uuid = createUUID();
  const originalAction = getOriginalAction(settings);
  if (originalAction) {
    uuid = originalAction.uuid;
  }

  const validParams = state.params.value.filter(
    (param: any) =>
      param.valid === true &&
      param.data.value &&
      param.data.validationFailures.length === 0,
  );

  const newAction: CallExternalService = {
    uuid,
    type: Types.call_external_service,
    external_service: {
      uuid: state.externalService.value.uuid,
      name: state.externalService.value.name,
      external_service_type:
        state.externalService.value.external_service_type ||
        state.externalService.value.type,
      actions: state.externalService.value.actions,
    },
    call: state.call.value,
    params: validParams,
    result_name: state.resultName.value,
  };

  return createWebhookBasedNode(newAction, settings.originalNode, true);
};
