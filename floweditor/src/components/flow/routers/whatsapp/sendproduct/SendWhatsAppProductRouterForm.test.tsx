import { mock } from 'testUtils';
import {
  createSendWhatsAppProductNode,
  getRouterFormProps,
} from 'testUtils/assetCreators';
import { Types } from 'config/interfaces';
import { AssetMap, AssetType, RenderNode } from 'store/flowContext';
import SendWhatsAppProductRouterForm, {
  ProductSearchType,
} from './SendWhatsAppProductRouterForm';
import * as utils from 'utils';
import * as React from 'react';
import {
  render,
  fireEvent,
  fireUnnnicInputChangeText,
  waitFor,
  fireUnnnicTextAreaChangeText,
  fireUnnnicSwitch,
  act,
} from 'test/utils';
import userEvent from '@testing-library/user-event';
import { WhatsAppProduct } from 'flowTypes';

mock(utils, 'createUUID', utils.seededUUIDs());

import whatsappProducts from 'test/assets/whatsapp_products.json';
import { resultToAsset } from '../../../../../external';

function getProps(automatic = false) {
  const productNode = createSendWhatsAppProductNode(
    {
      header: '',
      body: '',
      footer: '',
      action: '',
    },
    [],
    automatic,
    false,
    ProductSearchType.Default,
    '',
    '',
    '',
    '',
  );

  const sendWhatsAppProductForm = getRouterFormProps({
    node: productNode,
    ui: { type: Types.split_by_whatsapp_product },
  } as RenderNode);

  const productsAssets: AssetMap = {};
  whatsappProducts.results.forEach((product: WhatsAppProduct) => {
    productsAssets[product.facebook_product_id] = resultToAsset(
      product,
      AssetType.WhatsAppProduct,
      'facebook_product_id',
    );
  });
  sendWhatsAppProductForm.assetStore.whatsapp_products = {
    type: AssetType.WhatsAppProduct,
    items: productsAssets,
    endpoint: '/assets/whatsapp_products.json',
  };

  return sendWhatsAppProductForm;
}

describe(SendWhatsAppProductRouterForm.name, () => {
  beforeEach(() => {
    mock(utils, 'createUUID', utils.seededUUIDs());
  });

  describe('manual product search', () => {
    it('should render', async () => {
      const props = getProps();
      const { baseElement } = render(
        <SendWhatsAppProductRouterForm {...props} />,
      );

      await waitFor(() => expect(baseElement).toMatchSnapshot());
    });

    it('should change from manual to automatic', async () => {
      const props = getProps();
      const { baseElement, getByTestId } = render(
        <SendWhatsAppProductRouterForm {...props} />,
      );

      await waitFor(() => expect(baseElement).toMatchSnapshot());

      const automaticSwitch = getByTestId('switch');
      fireUnnnicSwitch(automaticSwitch);

      await waitFor(() => expect(baseElement).toMatchSnapshot());
    });

    it('should save a manual product sending with header', async () => {
      const props = getProps();
      const { baseElement, getByText, getByTestId, getAllByTestId } = render(
        <SendWhatsAppProductRouterForm {...props} />,
      );

      await waitFor(() => expect(baseElement).toMatchSnapshot());

      // open the view settings inputs
      userEvent.click(getByTestId('ViewSettings'));
      await waitFor(() => expect(baseElement).toMatchSnapshot());

      const okButton = getByText('Confirm');
      const resultName = getByTestId('Save as result');
      const selectManuallyButton = getByText('Select products to send');

      // our products, productViewSettings and result name are required
      await act(async () => {
        fireUnnnicInputChangeText(resultName, '');
      });
      fireEvent.click(okButton);
      expect(props.updateRouter).not.toBeCalled();

      await act(async () => {
        fireUnnnicInputChangeText(resultName, '');
      });

      fireEvent.click(selectManuallyButton);
      //find tembaselect input
      const tembaSelectInput = getAllByTestId(
        'temba_select_input_manually_select_products',
      )[0];
      expect(tembaSelectInput).toBeDefined();

      const product1 = getByText('Product 1');
      await waitFor(() => expect(product1).toBeDefined());

      userEvent.click(getByText('Product 1'));
      userEvent.click(getByText('Product 3'));

      fireEvent.click(okButton);
      expect(props.updateRouter).not.toBeCalled();

      const header = getByTestId('Header');
      const body = getByTestId('Body');
      const footer = getByTestId('Footer (optional)');
      const action = getByTestId('Action button title');

      // still requires body and action
      await act(async () => {
        fireUnnnicInputChangeText(header, 'header text');
      });
      fireEvent.click(okButton);
      expect(props.updateRouter).not.toBeCalled();

      // still requires action and result
      await act(async () => {
        fireUnnnicTextAreaChangeText(body, 'body text');
      });
      fireEvent.click(okButton);
      expect(props.updateRouter).not.toBeCalled();

      // still requires action and result
      await act(async () => {
        fireUnnnicInputChangeText(footer, 'footer text');
      });
      fireEvent.click(okButton);
      expect(props.updateRouter).not.toBeCalled();

      // still requires result
      await act(async () => {
        fireUnnnicInputChangeText(action, 'action text');
      });
      fireEvent.click(okButton);
      expect(props.updateRouter).not.toBeCalled();

      await act(async () => {
        fireUnnnicInputChangeText(resultName, 'ResultName');
      });

      // now it should save
      fireEvent.click(okButton);

      await waitFor(() => expect(props.updateRouter).toBeCalled());

      expect(props.updateRouter).toMatchSnapshot();
    });

    it('should save a catalog sending', async () => {
      const props = getProps();
      const { baseElement, getByText, getByTestId } = render(
        <SendWhatsAppProductRouterForm {...props} />,
      );

      await waitFor(() => expect(baseElement).toMatchSnapshot());

      // open the view settings inputs
      userEvent.click(getByTestId('ViewSettings'));
      await waitFor(() => expect(baseElement).toMatchSnapshot());

      const okButton = getByText('Confirm');
      const resultName = getByTestId('Save as result');

      userEvent.click(getByText('Send complete catalog'));

      // productViewSettings and result name are required
      await act(async () => {
        fireUnnnicInputChangeText(resultName, '');
      });
      fireEvent.click(okButton);
      expect(props.updateRouter).not.toBeCalled();

      await waitFor(() => expect(baseElement).toMatchSnapshot());

      fireEvent.click(okButton);
      expect(props.updateRouter).not.toBeCalled();

      const body = getByTestId('Body');
      const footer = getByTestId('Footer (optional)');
      const action = getByTestId('Action button title');

      // still requires action and result
      await act(async () => {
        fireUnnnicTextAreaChangeText(body, 'body text');
      });
      fireEvent.click(okButton);
      expect(props.updateRouter).not.toBeCalled();

      // still requires action and result
      await act(async () => {
        fireUnnnicInputChangeText(footer, 'footer text');
      });
      fireEvent.click(okButton);
      expect(props.updateRouter).not.toBeCalled();

      // still requires result
      await act(async () => {
        fireUnnnicInputChangeText(action, 'action text');
      });
      fireEvent.click(okButton);
      expect(props.updateRouter).not.toBeCalled();

      await act(async () => {
        fireUnnnicInputChangeText(resultName, 'ResultName');
      });

      // now it should save
      fireEvent.click(okButton);

      await waitFor(() => expect(props.updateRouter).toBeCalled());

      expect(props.updateRouter).toMatchSnapshot();
    });
  });

  describe('automatic product search', () => {
    it('should render', async () => {
      const props = getProps(true);
      const { baseElement } = render(
        <SendWhatsAppProductRouterForm {...props} />,
      );

      await waitFor(() => expect(baseElement).toMatchSnapshot());
    });

    it('should save an automatic product sending', async () => {
      const props = getProps(true);
      const { baseElement, getByText, getByTestId } = render(
        <SendWhatsAppProductRouterForm {...props} />,
      );

      await waitFor(() => expect(baseElement).toMatchSnapshot());

      // open the view settings inputs
      userEvent.click(getByTestId('ViewSettings'));
      await waitFor(() => expect(baseElement).toMatchSnapshot());

      const okButton = getByText('Confirm');
      const resultName = getByTestId('Save as result');

      // productSearch, productViewSettings and result name are required
      await act(async () => {
        fireUnnnicInputChangeText(resultName, '');
      });
      fireEvent.click(okButton);
      expect(props.updateRouter).not.toBeCalled();

      const productSearch = getByTestId(
        'Enter an expression to be used as input',
      );
      const header = getByTestId('Header');
      const body = getByTestId('Body');
      const footer = getByTestId('Footer (optional)');
      const action = getByTestId('Action button title');

      // still requires header, body and action
      await act(async () => {
        fireUnnnicInputChangeText(productSearch, '@results.result');
      });
      fireEvent.click(okButton);
      expect(props.updateRouter).not.toBeCalled();

      // still requires body and action
      await act(async () => {
        fireUnnnicInputChangeText(header, 'header text');
      });
      fireEvent.click(okButton);
      expect(props.updateRouter).not.toBeCalled();

      // still requires action and result
      await act(async () => {
        fireUnnnicTextAreaChangeText(body, 'body text');
      });
      fireEvent.click(okButton);
      expect(props.updateRouter).not.toBeCalled();

      // still requires action and result
      await act(async () => {
        fireUnnnicInputChangeText(footer, 'footer text');
      });
      fireEvent.click(okButton);
      expect(props.updateRouter).not.toBeCalled();

      // still requires result
      await act(async () => {
        fireUnnnicInputChangeText(action, 'action text');
      });
      fireEvent.click(okButton);
      expect(props.updateRouter).not.toBeCalled();

      await act(async () => {
        fireUnnnicInputChangeText(resultName, 'ResultName');
      });

      // now it should save
      fireEvent.click(okButton);

      await waitFor(() => expect(props.updateRouter).toBeCalled());

      expect(props.updateRouter).toMatchSnapshot();
    });

    it('should save an automatic product sending with vtex search', async () => {
      const props = getProps(true);
      const { baseElement, getByText, getByTestId } = render(
        <SendWhatsAppProductRouterForm {...props} />,
      );

      await waitFor(() => expect(baseElement).toMatchSnapshot());

      // change to VTEX search
      userEvent.click(getByText('VTEX Search'));

      // open the view settings inputs
      userEvent.click(getByTestId('ViewSettings'));
      await waitFor(() => expect(baseElement).toMatchSnapshot());

      const okButton = getByText('Confirm');
      const resultName = getByTestId('Save as result');

      // productSearch, searchUrl, productViewSettings and result name are required
      await act(async () => {
        fireUnnnicInputChangeText(resultName, '');
      });
      fireEvent.click(okButton);
      expect(props.updateRouter).not.toBeCalled();

      const productSearch = getByTestId(
        'Enter an expression to be used as input',
      );
      const searchUrl = getByTestId('Custom Search URL');
      const sellerId = getByTestId('Seller ID (optional)');
      const postalCode = getByTestId('Postal Code (optional)');
      const header = getByTestId('Header');
      const body = getByTestId('Body');
      const footer = getByTestId('Footer (optional)');
      const action = getByTestId('Action button title');

      // still requires searchUrl, header, body and action
      await act(async () => {
        fireUnnnicInputChangeText(productSearch, '@results.result');
      });
      fireEvent.click(okButton);
      expect(props.updateRouter).not.toBeCalled();

      // still requires header, body and action
      await act(async () => {
        fireUnnnicInputChangeText(searchUrl, 'https://weni.ai');
      });
      fireEvent.click(okButton);
      expect(props.updateRouter).not.toBeCalled();

      // still requires header, body and action
      await act(async () => {
        fireUnnnicInputChangeText(sellerId, 'seller123');
      });
      fireEvent.click(okButton);
      expect(props.updateRouter).not.toBeCalled();

      // still requires header, body and action
      await act(async () => {
        fireUnnnicInputChangeText(postalCode, 'cep123');
      });
      fireEvent.click(okButton);
      expect(props.updateRouter).not.toBeCalled();

      // still requires body and action
      await act(async () => {
        fireUnnnicInputChangeText(header, 'header text');
      });
      fireEvent.click(okButton);
      expect(props.updateRouter).not.toBeCalled();

      // still requires action and result
      await act(async () => {
        fireUnnnicTextAreaChangeText(body, 'body text');
      });
      fireEvent.click(okButton);
      expect(props.updateRouter).not.toBeCalled();

      // still requires action and result
      await act(async () => {
        fireUnnnicInputChangeText(footer, 'footer text');
      });
      fireEvent.click(okButton);
      expect(props.updateRouter).not.toBeCalled();

      // still requires result
      await act(async () => {
        fireUnnnicInputChangeText(action, 'action text');
      });
      fireEvent.click(okButton);
      expect(props.updateRouter).not.toBeCalled();

      await act(async () => {
        fireUnnnicInputChangeText(resultName, 'ResultName');
      });

      // now it should save
      fireEvent.click(okButton);

      await waitFor(() => expect(props.updateRouter).toBeCalled());

      expect(props.updateRouter).toMatchSnapshot();
    });
  });
});
