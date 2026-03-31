import RemoveGroupsForm from 'components/flow/actions/changegroups/removegroups/RemoveGroupsForm';
import { ActionFormProps } from 'components/flow/props';
import { composeComponentTestUtils, mock } from 'testUtils';
import {
  createRemoveGroupsAction,
  getActionFormProps,
  SubscribersGroup,
} from 'testUtils/assetCreators';
import * as utils from 'utils';
import { shallowToJson } from 'enzyme-to-json';

mock(utils, 'createUUID', utils.seededUUIDs());

const { setup } = composeComponentTestUtils(
  RemoveGroupsForm,
  getActionFormProps(createRemoveGroupsAction()),
);

describe(RemoveGroupsForm.name, () => {
  describe('render', () => {
    it('should render', () => {
      const { wrapper } = setup(true, {});
      expect(shallowToJson(wrapper)).toMatchSnapshot();
    });
  });

  describe('updates', () => {
    it('should handle updates and save', () => {
      const components = setup(true, { $merge: { updateAction: vi.fn() } });

      const instance: RemoveGroupsForm = components.instance;
      const props: Partial<ActionFormProps> = components.props;

      instance.handleGroupsChanged([SubscribersGroup]);
      instance.handleSave();

      expect(props.updateAction).toHaveBeenCalled();
      expect(props.updateAction).toMatchSnapshot('update');
    });

    it('should handle remove from all groups', () => {
      const components = setup(true, { $merge: { updateAction: vi.fn() } });

      const instance: RemoveGroupsForm = components.instance;
      const props: Partial<ActionFormProps> = components.props;

      instance.handleRemoveAllUpdate('true');
      instance.handleSave();

      expect(props.updateAction).toHaveBeenCalled();
      expect(props.updateAction).toMatchSnapshot('update');
    });

    it('should allow switching from router', () => {
      const components = setup(true, {
        $merge: { updateAction: vi.fn() },
        nodeSettings: { $merge: { originalAction: null } },
      });

      const instance: RemoveGroupsForm = components.instance;
      const props: Partial<ActionFormProps> = components.props;

      instance.handleGroupsChanged([SubscribersGroup]);
      instance.handleSave();
      expect(props.updateAction).toMatchSnapshot('switch from router');
    });

    it('should handle remove from all groups', () => {
      const components = setup(true, { $merge: { updateAction: vi.fn() } });

      const instance: RemoveGroupsForm = components.instance;
      const props: Partial<ActionFormProps> = components.props;

      instance.handleRemoveAllUpdate('true');
      instance.handleSave();

      expect(props.updateAction).toHaveBeenCalled();
      expect(props.updateAction).toMatchSnapshot('update');
    });

    it('should not allow empty groups if not removing all', () => {
      const components = setup(true, { $merge: { updateAction: vi.fn() } });

      const instance: RemoveGroupsForm = components.instance;
      const props: Partial<ActionFormProps> = components.props;

      instance.handleGroupsChanged([]);
      instance.handleRemoveAllUpdate('false');
      instance.handleSave();
      expect(props.updateAction).not.toHaveBeenCalled();
    });
  });

  it('should cancel', () => {
    const components = setup(true, { $merge: { updateAction: vi.fn() } });

    const instance: RemoveGroupsForm = components.instance;
    const props: Partial<ActionFormProps> = components.props;

    instance.getButtons().secondary.onClick();

    instance.getButtons().secondary.onClick();
    expect(props.onClose).toHaveBeenCalled();
    expect(props.onClose).toMatchSnapshot();
  });
});
