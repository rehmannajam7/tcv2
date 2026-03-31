import { ActionFormProps } from 'components/flow/props';
import React from 'react';
import { AssetType } from 'store/flowContext';
import { fireEvent, render, act, fireUnnnicInputChangeText } from 'test/utils';
import { composeComponentTestUtils, mock } from 'testUtils';
import {
  createStartSessionAction,
  getActionFormProps,
  SubscribersGroup,
} from 'testUtils/assetCreators';
import * as utils from 'utils';
import userEvent from '@testing-library/user-event';
import { shallowToJson } from 'enzyme-to-json';

import { StartSessionForm } from './StartSessionForm';

mock(utils, 'createUUID', utils.seededUUIDs());

const { setup } = composeComponentTestUtils<ActionFormProps>(
  StartSessionForm,
  getActionFormProps(createStartSessionAction()),
);

describe(StartSessionForm.name, () => {
  describe('render', () => {
    it('should render', () => {
      const props = getActionFormProps(createStartSessionAction());
      const { baseElement, queryByTestId } = render(
        <StartSessionForm {...props} />,
      );
      expect(baseElement).toMatchSnapshot();
      expect(queryByTestId('recipients')).not.toBeNull();
    });

    it('should render create new contacts', async () => {
      const props = getActionFormProps(createStartSessionAction());
      const { baseElement, queryByTestId, getByText } = render(
        <StartSessionForm {...props} />,
      );

      userEvent.click(getByText('Create a new contact'));

      expect(queryByTestId('recipients')).toBeNull();
      expect(baseElement).toMatchSnapshot();
    });

    it('should render contact query', async () => {
      const props = getActionFormProps(createStartSessionAction());
      const { baseElement, getByTestId, getByText } = render(
        <StartSessionForm {...props} />,
      );

      userEvent.click(getByText('Select recipients from a query'));

      await act(async () => {
        fireUnnnicInputChangeText(getByTestId('Contact Query'), 'my_field > 6');
      });
      expect(baseElement).toMatchSnapshot();

      fireEvent.click(getByText('Confirm'));
      expect(props.updateAction).toHaveBeenCalled();
      expect(props.updateAction).toMatchSnapshot();
    });

    it('should warn about invalid fields in contact queries', async () => {
      const props = getActionFormProps(createStartSessionAction());
      const { baseElement, getByTestId, getByText, debug } = render(
        <StartSessionForm {...props} />,
      );

      userEvent.click(getByText('Select recipients from a query'));

      const input = getByTestId('Contact Query');
      await act(async () => {
        fireUnnnicInputChangeText(input, '@fields.arst = 34');
        fireEvent.blur(input);
      });
      expect(baseElement).toMatchSnapshot();
    });

    it('should render self, children with base props', () => {
      const { wrapper } = setup(true);
      expect(shallowToJson(wrapper)).toMatchSnapshot();
    });

    it('should render an empty form with no action', () => {
      const { wrapper, instance } = setup(true, {
        $merge: {
          nodeSettings: { originalNode: null, originalAction: null },
        },
      });

      expect(instance.state).toMatchSnapshot();
      expect(shallowToJson(wrapper)).toMatchSnapshot();
    });
  });

  describe('updates', () => {
    it('should save changes', () => {
      const { instance, props } = setup(true);

      instance.handleRecipientsChanged([SubscribersGroup]);
      instance.handleFlowChanged([
        { id: 'my_flow', name: 'My Flow', type: AssetType.Flow },
      ]);
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

      instance.handleRecipientsChanged([SubscribersGroup]);
      instance.handleFlowChanged([
        { id: 'my_flow', name: 'My Flow', type: AssetType.Flow },
      ]);
      instance.handleSave();

      expect(props.updateAction).toMatchSnapshot();
    });
  });

  describe('cancel', () => {
    it('should cancel without changes', () => {
      const { instance, props } = setup(true, {
        $merge: { onClose: vi.fn(), updateAction: vi.fn() },
      });

      instance.handleRecipientsChanged([SubscribersGroup]);
      instance.handleFlowChanged([
        { id: 'my_flow', name: 'My Flow', type: AssetType.Flow },
      ]);
      instance.getButtons().secondary.onClick();
      expect(props.onClose).toHaveBeenCalled();
      expect(props.updateAction).not.toHaveBeenCalled();
    });
  });
});
