import AddGroupsForm from 'components/flow/actions/changegroups/addgroups/AddGroupsForm';
import { ActionFormProps } from 'components/flow/props';
import { composeComponentTestUtils, mock } from 'testUtils';
import {
  createAddGroupsAction,
  getActionFormProps,
  SubscribersGroup,
} from 'testUtils/assetCreators';
import * as utils from 'utils';
import { shallowToJson } from 'enzyme-to-json';

mock(utils, 'createUUID', utils.seededUUIDs());

const { setup } = composeComponentTestUtils<ActionFormProps>(
  AddGroupsForm,
  getActionFormProps(createAddGroupsAction()),
);

describe(AddGroupsForm.name, () => {
  describe('render', () => {
    it('should render self, children with base props', () => {
      const { wrapper } = setup();
      expect(shallowToJson(wrapper)).toMatchSnapshot();
    });

    it('should render with name_match groups', () => {
      const { wrapper } = setup(true, {
        nodeSettings: utils.set({
          originalAction: createAddGroupsAction({
            groups: [{ ...SubscribersGroup, name_match: 'Name Match' }],
          }),
        }),
      });

      expect(shallowToJson(wrapper)).toMatchSnapshot('name_match');
    });
  });

  describe('updates', () => {
    it('should handle updates and save', () => {
      const component = setup();

      const instance: AddGroupsForm = component.instance;
      const props: Partial<ActionFormProps> = component.props;

      instance.handleGroupsChanged([SubscribersGroup]);
      instance.handleSave();

      expect(props.updateAction).toHaveBeenCalled();
      expect(props.updateAction).toMatchSnapshot('update');
    });

    it('should allow switching from router', () => {
      const component = setup(true, {
        $merge: { updateAction: vi.fn() },
        nodeSettings: { $merge: { originalAction: null } },
      });

      const instance: AddGroupsForm = component.instance;
      const props: Partial<ActionFormProps> = component.props;

      instance.handleGroupAdded(SubscribersGroup);
      instance.handleSave();
      expect(props.updateAction).toMatchSnapshot('switch from router');
    });

    it('should allow creating a new group', () => {
      const component = setup(true);
      const instance: AddGroupsForm = component.instance;

      const newAsset = instance.handleCreateAssetFromInput('New Group');
      expect(newAsset).toMatchSnapshot({ name: 'New Group' });

      instance.handleGroupAdded(SubscribersGroup);
      expect(instance.state).toMatchSnapshot('create group');

      instance.handleSave();
      expect(component.props.updateAction).toHaveBeenCalled();
      expect(component.props.updateAction).toMatchSnapshot('add new group');
    });

    it('should allow inserting an expresison based group', () => {
      const component = setup(true);
      const instance: AddGroupsForm = component.instance;

      instance.handleGroupsChanged([
        {
          name: 'Expression Group',
          name_match: 'Expression Group name match',
          expression: true,
        },
      ]);

      expect(instance.state).toMatchSnapshot('expression group');

      instance.handleSave();
      expect(component.props.updateAction).toHaveBeenCalled();
      expect(component.props.updateAction).toMatchSnapshot(
        'add expression group',
      );
    });

    it('should not save without a group', () => {
      const component = setup(true, {
        $merge: { updateAction: vi.fn() },
        nodeSettings: { $merge: { originalAction: null } },
      });
      const instance: AddGroupsForm = component.instance;

      instance.handleSave();
      expect(component.props.updateAction).not.toHaveBeenCalled();
    });
  });

  it('should cancel', () => {
    const component = setup();
    const instance: AddGroupsForm = component.instance;
    const props: Partial<ActionFormProps> = component.props;

    instance.getButtons().secondary.onClick();
    expect(props.onClose).toHaveBeenCalled();
    expect(props.onClose).toMatchSnapshot();
  });
});
