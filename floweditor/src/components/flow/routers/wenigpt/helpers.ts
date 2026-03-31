import { createWebhookBasedNode } from 'components/flow/routers/helpers';
import { WeniGPTRouterFormState } from 'components/flow/routers/wenigpt/WeniGPTRouterForm';
import { Types } from 'config/interfaces';
import { getType } from 'config/typeConfigs';
import { CallWeniGPT } from 'flowTypes';
import { AssetStore, RenderNode } from 'store/flowContext';
import { NodeEditorSettings, StringEntry } from 'store/nodeEditor';
import { createUUID } from 'utils';

export const getOriginalAction = (
  settings: NodeEditorSettings,
): CallWeniGPT => {
  const action =
    settings.originalAction ||
    (settings.originalNode.node.actions.length > 0 &&
      settings.originalNode.node.actions[0]);

  if (action.type === Types.call_wenigpt) {
    return action as CallWeniGPT;
  }
};

interface KnowledgeBaseItem {
  id: string;
  name: string;
  content?: { intelligence?: string };
  source?: string;
}

export const nodeToState = (
  settings: NodeEditorSettings,
  assetStore: AssetStore,
): WeniGPTRouterFormState => {
  // TODO: work out an incremental result name
  const resultName: StringEntry = { value: 'Result' };

  const captainKBs = Object.values(assetStore?.captainKnowledgeBases?.items || {}).map((kb: KnowledgeBaseItem) => ({
    ...kb,
    // normalize assistant to a KB-like shape
    content: { intelligence: 'Captain' },
  }));
  const wenigptKBs = Object.values(assetStore?.knowledgeBases?.items || {});
  const knowledgeBases = [...wenigptKBs, ...captainKBs].map((kb: KnowledgeBaseItem) => {
    const source = kb.content?.intelligence || kb.source || 'KB';
    return { ...kb, label: `${source} - ${kb.name}` };
  });

  const state: WeniGPTRouterFormState = {
    knowledgeBase: { value: null },
    expression: { value: '@input.text' },
    knowledgeBases,
    resultName,
    valid: false,
  };

  if (getType(settings.originalNode) === Types.split_by_wenigpt) {
    const action = getOriginalAction(settings) as CallWeniGPT;

    const selectedKnowledgeBase = knowledgeBases.find(
      kb => kb.id === action.knowledge_base.toString(),
    );

    state.knowledgeBase = { value: selectedKnowledgeBase };
    state.expression = { value: action.input };
    state.resultName = { value: action.result_name };
    state.valid = true;
  }

  return state;
};

export const stateToNode = (
  settings: NodeEditorSettings,
  state: WeniGPTRouterFormState,
): RenderNode => {
  let uuid = createUUID();

  const originalAction = getOriginalAction(settings);
  if (originalAction) {
    uuid = originalAction.uuid;
  }

  const newAction: CallWeniGPT = {
    uuid,
    type: Types.call_wenigpt,
    knowledge_base: state.knowledgeBase.value.id,
    input: state.expression.value,
    result_name: state.resultName.value,
  };

  return createWebhookBasedNode(newAction, settings.originalNode, false);
};
