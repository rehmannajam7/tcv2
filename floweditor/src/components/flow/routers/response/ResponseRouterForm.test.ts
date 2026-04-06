import { RouterFormProps } from 'components/flow/props';
import { CaseProps } from 'components/flow/routers/caselist/CaseList';
import ResponseRouterForm from 'components/flow/routers/response/ResponseRouterForm';
import { Operators } from 'config/interfaces';
import { Types } from 'config/interfaces';
import { composeComponentTestUtils, mock } from 'testUtils';
import { getRouterFormProps, createMatchRouter } from 'testUtils/assetCreators';
import * as utils from 'utils';
import { createUUID } from 'utils';
import { getSmartOrSwitchRouter } from 'components/flow/routers/helpers';
import { shallowToJson } from 'enzyme-to-json';

const routerNode = createMatchRouter(['Red']);

const { setup } = composeComponentTestUtils<RouterFormProps>(
  ResponseRouterForm,
  getRouterFormProps(routerNode),
);

describe(ResponseRouterForm.name, () => {
  beforeEach(() => {
    mock(utils, 'createUUID', utils.seededUUIDs());
  });

  it('should render', () => {
    const { wrapper } = setup(true);
    expect(shallowToJson(wrapper)).toMatchSnapshot();
  });

  it('initializes case config', () => {
    const dateCase = createUUID();

    const dateNode = createMatchRouter(
      ['Red'],
      null,
      Operators.has_any_word,
      null,
      true,
    );
    const router = getSmartOrSwitchRouter(dateNode.node);
    router.cases.push({
      uuid: dateCase,
      type: Operators.has_date_eq,
      arguments: ['@(datetime_add(today(), 5, "D"))'],
      category_uuid: router.categories[0].uuid,
    });

    dateNode.ui = {
      position: { left: 0, top: 0 },
      type: Types.wait_for_response,
      config: { cases: { [dateCase]: { arguments: ['5'] } } },
    };

    const { wrapper } = setup(true, {
      nodeSettings: {
        $set: {
          originalNode: dateNode,
        },
      },
    });

    expect(shallowToJson(wrapper)).toMatchSnapshot();
  });

  describe('updates', () => {
    it('should save changes', () => {
      const { instance, props } = setup(true, {
        $merge: { onClose: vi.fn(), updateRouter: vi.fn() },
      });

      instance.handleUpdateTimeout(180);
      instance.handleUpdateResultName('Favorite Color');
      instance.handleCasesUpdated([
        {
          uuid: createUUID(),
          kase: { type: Operators.has_any_word, arguments: ['red'] },
          categoryName: 'Red',
          valid: true,
        },
        {
          uuid: createUUID(),
          kase: { type: Operators.has_any_word, arguments: ['maroon'] },
          categoryName: 'Red',
          valid: true,
        },
        {
          uuid: createUUID(),
          kase: { type: Operators.has_any_word, arguments: ['green'] },
          categoryName: 'Green',
          valid: true,
        },
      ] as CaseProps[]);

      expect(instance.state).toMatchSnapshot();

      instance.handleSave();
      expect(props.onClose).toHaveBeenCalled();
      expect(props.updateRouter).toHaveBeenCalled();
      expect(props.updateRouter).toMatchSnapshot();
    });

    it('should save save config for relative dates', () => {
      const { instance, props } = setup(true, {
        $merge: { onClose: vi.fn(), updateRouter: vi.fn() },
      });

      instance.handleCasesUpdated([
        {
          uuid: createUUID(),
          kase: { type: Operators.has_date_gt, arguments: ['5'] },
          categoryName: 'In the Zone',
          valid: true,
        },
      ] as CaseProps[]);

      expect(instance.state).toMatchSnapshot();

      instance.handleSave();
      expect(props.onClose).toHaveBeenCalled();
      expect(props.updateRouter).toHaveBeenCalled();
      expect(props.updateRouter).toMatchSnapshot();
    });

    it('should cancel', () => {
      const { instance, props } = setup(true, {
        $merge: { onClose: vi.fn(), updateRouter: vi.fn() },
      });
      instance.handleUpdateTimeout(180);
      instance.getButtons().secondary.onClick();
      expect(props.onClose).toHaveBeenCalled();
      expect(props.updateRouter).not.toHaveBeenCalled();
    });
  });
});
