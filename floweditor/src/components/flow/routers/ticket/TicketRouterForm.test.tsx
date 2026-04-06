import { mock } from 'testUtils';
import {
  createOpenTicketNode,
  getRouterFormProps,
  createOpenWeniChatsTicketNode,
} from 'testUtils/assetCreators';
import { Types } from 'config/interfaces';
import { AssetType, RenderNode } from 'store/flowContext';
import TicketRouterForm from './TicketRouterForm';
import * as utils from 'utils';
import * as React from 'react';
import {
  render,
  fireEvent,
  fireUnnnicInputChangeText,
  waitFor,
  fireUnnnicTextAreaChangeText,
} from 'test/utils';
import userEvent from '@testing-library/user-event';
import { Ticketer } from '../../../../flowTypes';

mock(utils, 'createUUID', utils.seededUUIDs());

const ticketNode = createOpenTicketNode('Need help', 'Where are my cookies');
const ticketForm = getRouterFormProps({
  node: ticketNode,
  ui: { type: Types.split_by_ticket },
} as RenderNode);

const ticketer: Ticketer = (ticketNode.actions[0] as any).ticketer;
ticketForm.assetStore.ticketers = {
  type: AssetType.Ticketer,
  items: { [ticketer.uuid]: ticketer } as any,
  endpoint: '/assets/ticketers.json',
};

describe(TicketRouterForm.name, () => {
  describe('render', () => {
    it('should render', async () => {
      const { baseElement } = render(<TicketRouterForm {...ticketForm} />);

      await waitFor(() => expect(baseElement).toMatchSnapshot());
    });
  });

  describe('updates', () => {
    it('should save changes', async () => {
      const { baseElement, getByText, getByTestId } = render(
        <TicketRouterForm {...ticketForm} />,
      );

      await waitFor(() => expect(baseElement).toMatchSnapshot());

      const okButton = getByText('Ok');
      const resultName = getByTestId('Save as result');

      // our ticketer, body and result name are required
      fireUnnnicInputChangeText(resultName, '');
      fireEvent.click(okButton);
      expect(ticketForm.updateRouter).not.toBeCalled();

      userEvent.click(getByText('Agent User'));

      // we need a topic
      userEvent.click(getByText('General'));

      // we need a body
      const body = getByTestId('Body');
      fireUnnnicTextAreaChangeText(body, 'body text');

      fireUnnnicInputChangeText(resultName, 'My Ticket Result');

      fireEvent.click(okButton);

      expect(ticketForm.updateRouter).toHaveBeenCalled();
      expect(ticketForm.updateRouter).toMatchSnapshot();
    });

    it('should save changes for a wenichats ticketer', async () => {
      const wenichatsTicketNode = createOpenWeniChatsTicketNode(
        'Need help',
        'Where are my cookies',
        '1165a73a-2ee0-4891-895e-768645194863',
      );
      const wenichatsTicketNode2 = createOpenWeniChatsTicketNode(
        'Dont Need help',
        'Ate all your cookies',
        '1165a73a-2ee0-4891-895e-768645194864',
      );
      const wenichatsTicketForm = getRouterFormProps({
        node: wenichatsTicketNode,
        ui: { type: Types.split_by_ticket },
      } as RenderNode);

      const weniChatsTicketer: Ticketer = (wenichatsTicketNode
        .actions[0] as any).ticketer;
      const weniChatsTicketer2: Ticketer = (wenichatsTicketNode2
        .actions[0] as any).ticketer;

      wenichatsTicketForm.assetStore.ticketers = {
        type: AssetType.Ticketer,
        items: {
          [weniChatsTicketer.uuid]: { ...weniChatsTicketer, type: 'wenichats' },
          [weniChatsTicketer2.uuid]: {
            ...weniChatsTicketer2,
            type: 'wenichats',
          },
        } as any,
        endpoint: '/assets/ticketers.json',
      };

      const { baseElement, getByText, getByTestId } = render(
        <TicketRouterForm {...wenichatsTicketForm} />,
      );

      await waitFor(() => expect(baseElement).toMatchSnapshot());

      const okButton = getByText('Ok');
      const resultName = getByTestId('Save as result');

      // our ticketer, body and result name are required
      fireUnnnicInputChangeText(resultName, '');
      fireEvent.click(okButton);
      expect(wenichatsTicketForm.updateRouter).not.toHaveBeenCalled();

      userEvent.click(getByText('Viewer User'));

      // change our ticketer
      userEvent.click(getByText(weniChatsTicketer2.name));

      // change our queue
      userEvent.click(getByText('Queue 2'));

      // change our body
      const body = getByTestId('Body');
      fireUnnnicTextAreaChangeText(body, 'body text');

      fireUnnnicInputChangeText(resultName, 'My Ticket Result');

      fireEvent.click(okButton);

      expect(wenichatsTicketForm.updateRouter).toHaveBeenCalled();
      expect(wenichatsTicketForm.updateRouter).toMatchSnapshot();

      expect(baseElement).toMatchSnapshot();

      // check if uuidless ticketers are handled
      userEvent.click(getByText('Weni Chats Sector - 123'));

      fireEvent.click(okButton);

      expect(wenichatsTicketForm.updateRouter).toHaveBeenCalled();
      expect(wenichatsTicketForm.updateRouter).toMatchSnapshot();
    });
  });
});
