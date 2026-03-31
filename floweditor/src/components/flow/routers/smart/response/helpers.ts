import { CaseProps } from 'components/flow/routers/caselist/CaseList';
import {
  createCaseProps,
  createRenderNode,
  hasCases,
  resolveRoutes,
} from 'components/flow/routers/helpers';
import { SmartResponseRouterFormState } from 'components/flow/routers/smart/response/SmartResponseRouterForm';
import { DEFAULT_OPERAND } from 'components/nodeeditor/constants';
import { Operators, Type, Types, VISIBILITY_HIDDEN } from 'config/interfaces';
import { getType } from 'config/typeConfigs';
import { Router, RouterTypes, SwitchRouter, Wait, WaitTypes } from 'flowTypes';
import { RenderNode } from 'store/flowContext';
import { NodeEditorSettings, StringEntry } from 'store/nodeEditor';
import { ensureRoute } from '../../classify/helpers';
import { getOperatorConfig } from 'config';

export const nodeToState = (
  settings: NodeEditorSettings,
): SmartResponseRouterFormState => {
  let initialCases: CaseProps[] = [];

  // TODO: work out an incremental result name
  let resultName: StringEntry = { value: 'Result' };
  let timeout = 0;

  let hiddenCases: CaseProps[] = [];

  if (
    (settings.originalNode &&
      getType(settings.originalNode) === Types.wait_for_response) ||
    getType(settings.originalNode) === Types.smart_wait_for_response
  ) {
    const router = settings.originalNode.node.router as SwitchRouter;
    if (router) {
      if (hasCases(settings.originalNode.node)) {
        initialCases = createCaseProps(router.cases, settings.originalNode);

        hiddenCases = initialCases.filter(
          (kase: CaseProps) =>
            getOperatorConfig(kase.kase.type).visibility === VISIBILITY_HIDDEN,
        );

        initialCases = initialCases.filter(
          (kase: CaseProps) =>
            getOperatorConfig(kase.kase.type).visibility !== VISIBILITY_HIDDEN,
        );
      }

      resultName = { value: router.result_name || '' };
    }

    if (
      settings.originalNode.node.router.wait &&
      settings.originalNode.node.router.wait.timeout
    ) {
      timeout = settings.originalNode.node.router.wait.timeout.seconds || 0;
    }
  }

  return {
    cases: initialCases,
    hiddenCases,
    resultName,
    timeout,
    valid: true,
  };
};

export const stateToNode = (
  settings: NodeEditorSettings,
  typeConfig: Type,
  state: SmartResponseRouterFormState,
): RenderNode => {
  const hasFilledCases =
    state.cases.length > 0 && state.cases[0].categoryName.trim() !== '';

  const routes = resolveRoutes(
    [...state.cases, ...state.hiddenCases],
    state.timeout > 0,
    settings.originalNode.node,
    hasFilledCases ? 'Failure' : null,
  );

  if (hasFilledCases) {
    // make sure we have an other route since failure is our default
    ensureRoute(routes, {
      type: Operators.has_category,
      arguments: [],
      name: 'Other',
    });
  }

  const optionalRouter: Pick<Router, 'result_name'> = {};
  if (state.resultName.value) {
    optionalRouter.result_name = state.resultName.value;
  }

  const wait = { type: WaitTypes.msg } as Wait;
  if (state.timeout > 0) {
    wait.timeout = {
      seconds: state.timeout,
      category_uuid: routes.timeoutCategory,
    };
  }

  const router: SwitchRouter = {
    type: RouterTypes.smart,
    default_category_uuid: routes.defaultCategory,
    cases: routes.cases,
    categories: routes.categories,
    operand: DEFAULT_OPERAND,
    wait,
    ...optionalRouter,
  };

  const newRenderNode = createRenderNode(
    settings.originalNode.node.uuid,
    router,
    routes.exits,
    typeConfig.type,
    [],
    { cases: routes.caseConfig },
  );

  return newRenderNode;
};
