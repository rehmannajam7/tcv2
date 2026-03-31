/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { RouterFormProps } from 'components/flow/props';
import WebhookRouterForm from 'components/flow/routers/webhook/WebhookRouterForm';
import { Types } from 'config/interfaces';
import { RenderNode } from 'store/flowContext';
import { composeComponentTestUtils, mock } from 'testUtils';
import {
  createWebhookRouterNode,
  getRouterFormProps,
} from 'testUtils/assetCreators';
import * as utils from 'utils';
import * as React from 'react';
import {
  render,
  fireEvent,
  fireUnnnicInputChangeText,
  act,
  fireUnnnicTextAreaChangeText,
} from 'test/utils';
import userEvent from '@testing-library/user-event';
import { shallowToJson } from 'enzyme-to-json';

mock(utils, 'createUUID', utils.seededUUIDs());

const webhookForm = getRouterFormProps({
  node: createWebhookRouterNode(),
  ui: { type: Types.call_webhook },
} as RenderNode);

const { setup } = composeComponentTestUtils<RouterFormProps>(
  WebhookRouterForm,
  webhookForm,
);

describe(WebhookRouterForm.name, () => {
  it('should render', () => {
    const { wrapper } = setup(true);
    expect(shallowToJson(wrapper)).toMatchSnapshot();
  });

  describe('updates', () => {
    it('should save changes', async () => {
      const { getByText, getByTestId, getAllByTestId } = render(
        <WebhookRouterForm {...webhookForm} />,
      );

      const okButton = getByText('Confirm');

      // our url is required
      fireEvent.click(okButton);
      expect(webhookForm.updateRouter).not.toBeCalled();

      // set our url and name
      const url = getByTestId('URL');
      const resultName = getByTestId('Save as result');

      fireUnnnicInputChangeText(url, 'http://app.rapidpro.io');
      fireUnnnicInputChangeText(resultName, 'My Webhook Result');

      await act(async () => {
        userEvent.click(getByText('POST'));
      });

      // set a post body
      fireEvent.click(getByText('POST Body'));
      const postBody = getByTestId('POST Body');

      await act(async () => {
        fireUnnnicTextAreaChangeText(postBody, 'Updated post body');
      });

      // add http header
      fireEvent.click(getByText('HTTP Headers'));
      let headerName = getAllByTestId('Ex: Accept')[0];
      let headerValue = getAllByTestId('Ex: application/json')[0];

      await act(async () => {
        fireUnnnicInputChangeText(headerName, 'Content-type');
        fireUnnnicInputChangeText(headerValue, 'application/json');
      });

      fireEvent.click(okButton);
      expect(webhookForm.updateRouter).toBeCalled();
      expect(webhookForm.updateRouter).toMatchSnapshot();

      fireEvent.click(getByText('General'));

      // change to the same method and save
      await act(async () => {
        userEvent.click(getByText('POST'));
      });

      fireEvent.click(okButton);
      expect(webhookForm.updateRouter).toBeCalled();
      expect(webhookForm.updateRouter).toMatchSnapshot();

      // test the GET method
      await act(async () => {
        userEvent.click(getByText('GET'));
      });

      // set a get body
      fireEvent.click(getByText('GET Body'));
      const getBody = getByTestId('GET Body');

      await act(async () => {
        fireUnnnicTextAreaChangeText(getBody, 'Updated get body');
      });

      fireEvent.click(okButton);
      expect(webhookForm.updateRouter).toBeCalled();
      expect(webhookForm.updateRouter).toMatchSnapshot();

      // Manually add content-type header and change back to POST
      fireEvent.click(getByText('HTTP Headers'));
      headerName = getAllByTestId('Ex: Accept')[0];
      headerValue = getAllByTestId('Ex: application/json')[0];

      fireUnnnicInputChangeText(headerName, 'Content-type');
      fireUnnnicInputChangeText(headerValue, 'application/json');

      fireEvent.click(getByText('General'));

      // change to the same method and save
      await act(async () => {
        userEvent.click(getByText('POST'));
      });

      // remonve an http header
      await act(async () => {
        fireEvent.click(getByText('HTTP Headers'));
      });

      const deleteButton = getAllByTestId('remove-icon')[0];
      fireEvent.click(deleteButton);

      fireEvent.click(okButton);
      expect(webhookForm.updateRouter).toBeCalled();
      expect(webhookForm.updateRouter).toMatchSnapshot();

      fireEvent.click(getByText('General'));

      // go back to GET and save
      await act(async () => {
        userEvent.click(getByText('GET'));
      });

      fireEvent.click(okButton);
      expect(webhookForm.updateRouter).toBeCalled();
      expect(webhookForm.updateRouter).toMatchSnapshot();
    });

    it('should repopulate post body', () => {
      const { instance } = setup(true, {
        $merge: { onClose: vi.fn(), updateRouter: vi.fn() },
      });

      instance.handleMethodUpdate({ value: 'GET' });
      instance.handleUrlUpdate('http://domain.com/');
      expect(instance.state).toMatchSnapshot();

      instance.handleMethodUpdate('POST');
      expect(instance.state).toMatchSnapshot();
    });

    it('should cancel', () => {
      const { instance, props } = setup(true, {
        $merge: { onClose: vi.fn(), updateRouter: vi.fn() },
      });
      instance.getButtons().secondary.onClick();
      instance.handleUrlUpdate('http://domain.com/');
      expect(props.onClose).toHaveBeenCalled();
      expect(props.updateRouter).not.toHaveBeenCalled();
    });

    it('should validate urls', async () => {
      webhookForm.updateRouter = vi.fn();
      const { getByText, getByTestId } = render(
        <WebhookRouterForm {...webhookForm} />,
      );

      // set our url and name
      const url = getByTestId('URL');
      const resultName = getByTestId('Save as result');

      fireUnnnicInputChangeText(url, 'bad url');
      fireUnnnicInputChangeText(resultName, 'My Webhook Result');

      // we need a valid url
      const okButton = getByText('Confirm');
      fireEvent.click(okButton);
      expect(webhookForm.updateRouter).not.toBeCalled();

      // but not if it has an expression
      await act(async () => {
        fireUnnnicInputChangeText(url, '@fields.valid_url');
      });
      fireEvent.click(okButton);
      expect(webhookForm.updateRouter).toBeCalled();
    });
  });

  it("should render a split_by_webhook's original action", () => {
    const webhookForm = getRouterFormProps({
      node: {
        ...createWebhookRouterNode({
          'Content-Type': 'application/json',
        }),
      },
      ui: { type: Types.split_by_webhook },
    } as RenderNode);

    const { setup } = composeComponentTestUtils<RouterFormProps>(
      WebhookRouterForm,
      webhookForm,
    );
    const { wrapper } = setup(true);

    expect(shallowToJson(wrapper)).toMatchSnapshot();
  });
});
