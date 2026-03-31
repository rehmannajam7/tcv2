import SendMsgForm from 'components/flow/actions/sendmsg/SendMsgForm';
import { ActionFormProps } from 'components/flow/props';
import { composeComponentTestUtils, mock } from 'testUtils';
import {
  createSendMsgAction,
  getActionFormProps,
} from 'testUtils/assetCreators';
import * as utils from 'utils';
import { shallowToJson } from 'enzyme-to-json';

const { setup } = composeComponentTestUtils<ActionFormProps>(
  SendMsgForm,
  getActionFormProps(createSendMsgAction()),
);

mock(utils, 'createUUID', utils.seededUUIDs());

describe(SendMsgForm.name, () => {
  describe('render', () => {
    it('should render', () => {
      const { wrapper } = setup(true);
      expect(shallowToJson(wrapper)).toMatchSnapshot();
    });
  });

  describe('updates', () => {
    it('should save changes', () => {
      const { instance, props } = setup(true);

      instance.handleMessageUpdate('What is your favorite color?', []);
      instance.handleQuickRepliesUpdate(['red', 'green', 'blue']);
      instance.handleSendAllUpdate(true);

      expect(instance.state).toMatchSnapshot();

      instance.handleSave();
      expect(props.updateAction).toHaveBeenCalled();
      expect(props.updateAction).toMatchSnapshot();
    });

    it('should allow switching from router', () => {
      const { instance, props } = setup(true, {
        $merge: { updateAction: vi.fn() },
        nodeSettings: { $merge: { originalAction: null } },
      });

      instance.handleMessageUpdate('What is your favorite color?', []);
      instance.handleSave();

      expect(props.updateAction).toMatchSnapshot();
    });
  });

  describe('cancel', () => {
    it('should cancel without changes', () => {
      const { instance, props } = setup(true, {
        $merge: { onClose: vi.fn(), updateAction: vi.fn() },
      });
      instance.handleMessageUpdate("Don't save me bro", []);
      instance.getButtons().tertiary.onClick();
      expect(props.onClose).toHaveBeenCalled();
      expect(props.updateAction).not.toHaveBeenCalled();
    });
  });
});
