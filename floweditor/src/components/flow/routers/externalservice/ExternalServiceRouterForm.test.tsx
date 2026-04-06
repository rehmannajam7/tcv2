import {
  createCallExternalServiceNode,
  getRouterFormProps,
} from 'testUtils/assetCreators';
import { Types } from 'config/interfaces';
import { RenderNode } from 'store/flowContext';
import ExternalServiceRouterForm from './ExternalServiceRouterForm';
import * as React from 'react';
import { render, fireEvent, fireUnnnicInputChangeText } from 'test/utils';
import { act, waitFor } from '@testing-library/react';
import { RouterFormProps } from '../../props';
import userEvent from '@testing-library/user-event';

const externalServiceAsset = require('test/assets/external_services.json');

describe(ExternalServiceRouterForm.name, () => {
  describe('ChatGPT', () => {
    let externalServiceForm: RouterFormProps;
    beforeEach(() => {
      externalServiceForm = getRouterFormProps({
        node: createCallExternalServiceNode(
          'chatgpt',
          externalServiceAsset.results[0].actions,
          externalServiceAsset.results[0].uuid,
          externalServiceAsset.results[0].actions[0],
        ),
        ui: { type: Types.split_by_external_service },
      } as RenderNode);
    });

    describe('render', () => {
      it('should render', async () => {
        externalServiceForm.assetStore.externalServices.items = {
          [externalServiceAsset.results[0].uuid]: {
            ...externalServiceAsset.results[0],
          },
          [externalServiceAsset.results[1].uuid]: {
            ...externalServiceAsset.results[1],
          },
        };
        let rendered: any;
        await act(async () => {
          rendered = render(
            <ExternalServiceRouterForm {...externalServiceForm} />,
          );
          return undefined;
        });
        expect(rendered.baseElement).toMatchSnapshot();
      });
    });

    describe('updates', () => {
      it('should save changes', async () => {
        externalServiceForm.assetStore.externalServices.items = {
          [externalServiceAsset.results[0].uuid]: {
            ...externalServiceAsset.results[0],
          },
          [externalServiceAsset.results[1].uuid]: {
            ...externalServiceAsset.results[1],
          },
        };
        let rendered: any;

        await act(async () => {
          rendered = render(
            <ExternalServiceRouterForm {...externalServiceForm} />,
          );
          return undefined;
        });

        userEvent.click(rendered.getByText('ChatGPT dummy project'));

        expect(rendered.baseElement).toMatchSnapshot();

        const okButton = rendered.getByText('Ok');
        const resultName = rendered.getByTestId('Save as result');

        // since there are no mandatory fields, we can save the router right away
        fireEvent.click(okButton);
        expect(externalServiceForm.updateRouter).toBeCalledTimes(1);

        // cannot save without the result field filled
        fireUnnnicInputChangeText(resultName, '');
        fireEvent.click(okButton);
        expect(externalServiceForm.updateRouter).toBeCalledTimes(1);

        fireUnnnicInputChangeText(resultName, 'My External Service Result');

        userEvent.click(rendered.getByText('Aditional Prompt 1 content'));
        userEvent.click(rendered.getByText('Aditional Prompt 2 content'));

        fireEvent.click(okButton);
        expect(externalServiceForm.updateRouter).toHaveBeenCalled();
        expect(externalServiceForm.updateRouter).toBeCalledTimes(2);
        expect(externalServiceForm.updateRouter).toMatchSnapshot();
      });
    });
  });

  describe('Omie', () => {
    let externalServiceForm: RouterFormProps;
    beforeEach(() => {
      externalServiceForm = getRouterFormProps({
        node: createCallExternalServiceNode(
          'omie',
          externalServiceAsset.results[1].actions,
          externalServiceAsset.results[1].uuid,
          externalServiceAsset.results[1].actions[0],
        ),
        ui: { type: Types.split_by_external_service },
      } as RenderNode);
    });

    describe('render', () => {
      it('should render', async () => {
        const { baseElement } = render(
          <ExternalServiceRouterForm {...externalServiceForm} />,
        );
        await waitFor(() => expect(baseElement).toMatchSnapshot());
      });
    });

    describe('updates', () => {
      it('should save changes', async () => {
        externalServiceForm.assetStore.externalServices.items = {
          [externalServiceAsset.results[0].uuid]: {
            ...externalServiceAsset.results[0],
          },
          [externalServiceAsset.results[1].uuid]: {
            ...externalServiceAsset.results[1],
          },
        };

        const { baseElement, getByTestId, getAllByTestId, getByText } = render(
          <ExternalServiceRouterForm {...externalServiceForm} />,
        );

        await waitFor(() => expect(baseElement).toMatchSnapshot());

        userEvent.click(getByText('Omie dummy project'));

        expect(baseElement).toMatchSnapshot();

        const okButton = getByText('Ok');
        const resultName = getByTestId('Save as result');

        fireUnnnicInputChangeText(resultName, '');
        fireEvent.click(okButton);
        expect(externalServiceForm.updateRouter).not.toBeCalled();

        userEvent.click(getByText('Inserir Contato'));

        await act(async () => {
          fireUnnnicInputChangeText(resultName, 'My External Service Result');
        });

        await act(async () => {
          fireUnnnicInputChangeText(
            getAllByTestId('Service Call Param Data')[0],
            'data 1',
          );
        });

        fireEvent.click(okButton);
        // cannot be called due to missing second required field
        expect(externalServiceForm.updateRouter).not.toBeCalled();

        await act(async () => {
          fireUnnnicInputChangeText(
            getAllByTestId('Service Call Param Data')[1],
            'data 2',
          );
        });

        fireEvent.click(okButton);
        expect(externalServiceForm.updateRouter).toHaveBeenCalled();
        expect(externalServiceForm.updateRouter).toMatchSnapshot();
      });
    });
  });
});
