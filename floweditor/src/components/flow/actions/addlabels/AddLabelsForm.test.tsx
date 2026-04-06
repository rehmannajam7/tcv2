import React from 'react';
import {
  fireEvent,
  render,
  getCallParams,
  getDomElement,
  act,
} from 'test/utils';
import { mock } from 'testUtils';
import {
  createAddLabelsAction,
  createStartSessionAction,
  getActionFormProps,
} from 'testUtils/assetCreators';
import * as utils from 'utils';
import AddLabelsForm from './AddLabelsForm';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';

mock(utils, 'createUUID', utils.seededUUIDs());
const props = getActionFormProps(
  createAddLabelsAction([
    { name: 'My Label', uuid: utils.createUUID() },
    {
      name: 'My Label with match',
      name_match: 'Match',
      uuid: utils.createUUID(),
    },
  ]),
);

describe(AddLabelsForm.name, () => {
  describe('render', () => {
    it('should render', () => {
      const { baseElement } = render(<AddLabelsForm {...props} />);
      expect(baseElement).toMatchSnapshot();
    });

    it('allows expressions', async () => {
      const props = getActionFormProps(createStartSessionAction());
      const ref: React.RefObject<any> = React.createRef();
      const { baseElement, getByText, getByTestId } = render(
        <AddLabelsForm ref={ref} {...props} />,
      );

      const input = getDomElement(getByTestId('temba_select_labels'), 'input');

      await act(async () => {
        userEvent.type(input, '@contact.uuid');
      });

      userEvent.click(getByText('contact.uuid'));

      expect(baseElement).toMatchSnapshot();

      // save our action
      fireEvent.click(getByText('Confirm'));
      expect(props.updateAction).toHaveBeenCalled();
      expect(props.updateAction).toMatchSnapshot();

      const [addLabelAction] = getCallParams(props.updateAction);
      expect(JSON.stringify(addLabelAction)).toMatch('name_match');
    });
  });

  it('should close', () => {
    const { getByText } = render(<AddLabelsForm {...props} />);
    fireEvent.click(getByText('Cancel'));
    expect(props.onClose).toHaveBeenCalled();
  });
});
