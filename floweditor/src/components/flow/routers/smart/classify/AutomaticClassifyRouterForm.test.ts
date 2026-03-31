import { RouterFormProps } from 'components/flow/props';
import { CaseProps } from 'components/flow/routers/caselist/CaseList';
import AutomaticClassifyRouterFormState from 'components/flow/routers/smart/classify/AutomaticClassifyRouterForm';
import DescriptionAlert from 'components/flow/routers/smart/DescriptionAlert/DescriptionAlert';
import { Operators } from 'config/interfaces';
import { Types } from 'config/interfaces';
import { composeComponentTestUtils, mock } from 'testUtils';
import { getRouterFormProps, createMatchRouter } from 'testUtils/assetCreators';
import * as utils from 'utils';
import { createUUID } from 'utils';
import { getSmartOrSwitchRouter } from 'components/flow/routers/helpers';
import { vi } from 'vitest';
import { shallowToJson } from 'enzyme-to-json';

const routerNode = createMatchRouter(['Red']);

const { setup } = composeComponentTestUtils<RouterFormProps>(
  AutomaticClassifyRouterFormState,
  getRouterFormProps(routerNode),
);

describe(AutomaticClassifyRouterFormState.name, () => {
  beforeEach(() => {
    mock(utils, 'createUUID', utils.seededUUIDs());
  });

  it('should render', () => {
    const { wrapper } = setup(true);
    expect(shallowToJson(wrapper)).toMatchSnapshot();
  });

  it('initializes case config', () => {
    const baseCase = createUUID();

    const baseNode = createMatchRouter(['Red']);
    const router = getSmartOrSwitchRouter(baseNode.node);
    router.cases.push({
      uuid: baseCase,
      type: Operators.has_any_word,
      arguments: ['not blue'],
      category_uuid: router.categories[0].uuid,
    });

    baseNode.ui = {
      position: { left: 0, top: 0 },
      type: Types.automatic_classify,
      config: { cases: { [baseCase]: { arguments: ['not blue'] } } },
    };

    const { wrapper } = setup(true, {
      nodeSettings: {
        $set: {
          originalNode: baseNode,
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

      instance.handleOperandUpdated('@results.result1');
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
      instance.handleUpdateResultName('Favorite Color');

      expect(instance.state).toMatchSnapshot();

      instance.handleSave();
      expect(props.onClose).toHaveBeenCalled();
      expect(props.updateRouter).toHaveBeenCalled();
      expect(props.updateRouter).toMatchSnapshot();
    });

    it('should not save changes if case is invalid', () => {
      const { instance, props } = setup(true, {
        $merge: { onClose: vi.fn(), updateRouter: vi.fn() },
      });

      instance.handleOperandUpdated('@results.result1');
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
          valid: false,
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
      expect(props.onClose).not.toHaveBeenCalled();
      expect(props.updateRouter).not.toHaveBeenCalled;
    });

    it('should cancel', () => {
      const { instance, props } = setup(true, {
        $merge: { onClose: vi.fn(), updateRouter: vi.fn() },
      });
      instance.handleOperandUpdated('@results.result1');
      instance.getButtons().secondary.onClick();
      expect(props.onClose).toHaveBeenCalled();
      expect(props.updateRouter).not.toHaveBeenCalled();
    });
  });

  it('should open description edit', () => {
    const { wrapper, instance } = setup(true);
    const spy = vi.spyOn(window.parent, 'postMessage');

    const descriptionAlert = wrapper.find(DescriptionAlert);
    expect(descriptionAlert.exists()).toBeTruthy();
    wrapper.find(DescriptionAlert).prop('openDescriptionEdit')();

    expect(spy).toHaveBeenCalledWith({ event: 'openConnectEditProject' }, '*');

    expect(instance.state.hasDescription).toBeFalsy();
    // send the message back
    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          event: 'setConnectProjectDescription',
          connectProjectDescription: 'test',
        },
      }),
    );
    expect(instance.state.hasDescription).toBe(true);
  });
});
