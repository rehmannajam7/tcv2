import { CaseProps } from 'components/flow/routers/caselist/CaseList';
import {
  createCaseProps,
  createRenderNode,
  hasCases,
  resolveRoutes,
} from 'components/flow/routers/helpers';
import { AutomaticClassifyRouterFormState } from 'components/flow/routers/smart/classify/AutomaticClassifyRouterForm';
import { DEFAULT_OPERAND } from 'components/nodeeditor/constants';
import { Operators, Type, Types, VISIBILITY_HIDDEN } from 'config/interfaces';
import { getType } from 'config/typeConfigs';
import { Router, RouterTypes, SwitchRouter } from 'flowTypes';
import { RenderNode } from 'store/flowContext';
import { NodeEditorSettings, StringEntry } from 'store/nodeEditor';
import { ensureRoute } from '../../classify/helpers';
import { getOperatorConfig } from 'config';

export const nodeToState = (
  settings: NodeEditorSettings,
): AutomaticClassifyRouterFormState => {
  let initialCases: CaseProps[] = [];

  // TODO: work out an incremental result name
  let resultName: StringEntry = { value: 'Result' };
  let operand = DEFAULT_OPERAND;

  let hiddenCases: CaseProps[] = [];

  if (
    settings.originalNode &&
    getType(settings.originalNode) === Types.automatic_classify
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
      operand = router.operand;
    }
  }

  return {
    cases: initialCases,
    hiddenCases,
    resultName,
    valid: true,
    operand: { value: operand },
  };
};

export const stateToNode = (
  settings: NodeEditorSettings,
  typeConfig: Type,
  state: AutomaticClassifyRouterFormState,
): RenderNode => {
  const routes = resolveRoutes(
    [...state.cases, ...state.hiddenCases],
    false,
    settings.originalNode.node,
    'Failure',
  );

  // make sure we have an other route since failure is our default
  ensureRoute(routes, {
    type: Operators.has_category,
    arguments: [],
    name: 'Other',
  });

  const optionalRouter: Pick<Router, 'result_name'> = {};
  if (state.resultName.value) {
    optionalRouter.result_name = state.resultName.value;
  }

  const routerResultName = state.resultName.value;

  const router: SwitchRouter = {
    type: RouterTypes.smart,
    default_category_uuid: routes.defaultCategory,
    cases: routes.cases,
    categories: routes.categories,
    operand: state.operand.value,
    result_name: routerResultName,
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
