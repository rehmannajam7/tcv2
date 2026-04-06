import AirtimeRouterForm from 'components/flow/routers/airtime/AirtimeRouterForm';
import { composeComponentTestUtils, mock, setMock } from 'testUtils';
import {
  createAirtimeTransferNode,
  createTransferAirtimeAction,
  getRouterFormProps,
} from 'testUtils/assetCreators';
import * as utils from 'utils';
import { shallowToJson } from 'enzyme-to-json';

mock(utils, 'createUUID', utils.seededUUIDs());

const routerNode = createAirtimeTransferNode(createTransferAirtimeAction());
const { setup } = composeComponentTestUtils(
  AirtimeRouterForm,
  getRouterFormProps(routerNode),
);

describe(AirtimeRouterForm.name, () => {
  describe('render', () => {
    it('should render', () => {
      const { wrapper } = setup();
      expect(shallowToJson(wrapper)).toMatchSnapshot();
    });
  });

  describe('updates', () => {
    it('should update and save', () => {
      const components = setup(true, { updateRouter: setMock() });
      const instance = components.instance as AirtimeRouterForm;

      instance.handleTransferChanged(-1, {
        value: { code: 'USD', amount: '' },
      });
      expect(instance.state).toMatchSnapshot();
      instance.getButtons().primary.onClick();
      expect(components.props.updateRouter).toMatchSnapshot();
    });

    it('should cancel changes', () => {
      const components = setup(true, { updateRouter: setMock() });
      const instance = components.instance as AirtimeRouterForm;

      instance.handleTransferChanged(-1, {
        value: { code: 'USD', amount: '' },
      });
      instance.getButtons().secondary.onClick();
      expect(components.props.updateRouter).not.toBeCalled();
    });

    it('coverts from other node types', () => {
      const components = setup(true, {
        updateRouter: setMock(),
        nodeSettings: {
          originalNode: { ui: { $merge: { type: null } } },
        },
      });

      const instance = components.instance as AirtimeRouterForm;
      instance.handleTransferChanged(-1, {
        value: { code: 'USD', amount: '' },
      });
      instance.getButtons().primary.onClick();
      expect(components.props.updateRouter).toMatchSnapshot();
    });

    it('creates its own action uuid if necessary', () => {
      const components = setup(true, {
        updateRouter: setMock(),
        nodeSettings: {
          originalNode: {
            node: { $merge: { actions: [] } },
            ui: { $merge: { type: null } },
          },
        },
      });

      const instance = components.instance as AirtimeRouterForm;

      instance.handleTransferChanged(-1, {
        value: { code: 'USD', amount: '' },
      });
      instance.getButtons().primary.onClick();
      expect(components.props.updateRouter).toMatchSnapshot();
    });

    it('validates before saving', () => {
      const components = setup(true, { updateRouter: setMock() });
      const instance = components.instance as AirtimeRouterForm;

      instance.handleRemoved(0);
      instance.handleTransferChanged(-1, {
        value: { code: 'USD', amount: '' },
      });
      instance.getButtons().primary.onClick();
      expect(components.props.updateRouter).not.toBeCalled();
    });
  });
});
