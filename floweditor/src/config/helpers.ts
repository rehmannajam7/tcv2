import {
  FlowTypes,
  FlowTypeVisibility,
  Operator,
  Type,
  Types,
  VISIBILITY_ONLINE,
} from 'config/interfaces';
import { FlowEditorConfig } from 'flowTypes';
import i18n from './i18n';
import { NodeEditorSettings } from '../store/nodeEditor';

export const isOnlineFlowType = (flowType: FlowTypes) => {
  return !!VISIBILITY_ONLINE.find((type: FlowTypes) => type === flowType);
};

export const filterOperators = (
  operators: Operator[],
  config: FlowEditorConfig,
): Operator[] => {
  return filterVisibility(operators, config);
};

export const filterTypeConfigs = (
  typeConfigs: Type[],
  config: FlowEditorConfig,
  nodeSettings: NodeEditorSettings,
): Type[] => {
  return filterVisibility(typeConfigs, config, nodeSettings).map(
    (typeConfig: Type) => {
      if (typeConfig.new) {
        return {
          ...typeConfig,
          description: `${typeConfig.description} (${i18n.t('new', 'New')})`,
        };
      }

      return typeConfig;
    },
  );
};

const filterVisibility = (
  items: FlowTypeVisibility[],
  config: FlowEditorConfig,
  nodeSettings?: NodeEditorSettings,
): any[] => {
  return items.filter((item: FlowTypeVisibility) => {
    if (nodeSettings) {
      const typeItem = item as Type;
      if (typeItem.type === Types.call_brain) {
        // check if we can show the call brain action
        // if we are not a ghost node
        // and if we are in a multi action node, we can't show the call brain action
        if (
          nodeSettings.originalNode.node.actions.length >= 1 &&
          !nodeSettings.originalNode.ghost
        ) {
          return false;
        }
      }
    }

    // if we have a filter on our type, don't return it unless its present in our config
    if (item.filter) {
      if (
        !(config.filters || []).find((name: string) => name === item.filter)
      ) {
        return false;
      }
    }

    if (item.visibility === undefined) {
      return true;
    }

    return (
      item.visibility.findIndex((ft: FlowTypes) => ft === config.flowType) > -1
    );
  });
};
