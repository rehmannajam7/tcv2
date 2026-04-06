/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { getActionUUID } from 'components/flow/actions/helpers';
import {
  ProductSearchType,
  ProductViewSettings,
  ProductViewSettingsEntry,
  SendWhatsAppProductRouterFormState,
} from 'components/flow/routers/whatsapp/sendproduct/SendWhatsAppProductRouterForm';
import { Types } from 'config/interfaces';
import { SendWhatsAppProduct } from 'flowTypes';
import { RenderNode } from 'store/flowContext';
import { NodeEditorSettings } from 'store/nodeEditor';
import { createWebhookBasedNode } from 'components/flow/routers/helpers';
import { getType } from '../../../../../config/typeConfigs';

export const getOriginalAction = (
  settings: NodeEditorSettings,
): SendWhatsAppProduct => {
  const action =
    settings.originalAction ||
    (settings.originalNode.node.actions.length > 0 &&
      settings.originalNode.node.actions[0]);

  if (action.type === Types.send_msg_catalog) {
    return action as SendWhatsAppProduct;
  }
};

export const nodeToState = (
  settings: NodeEditorSettings,
): SendWhatsAppProductRouterFormState => {
  let productViewSettings: ProductViewSettingsEntry = {
    value: {
      header: { value: '' },
      body: { value: '' },
      footer: { value: '' },
      action: { value: '' },
    },
  };

  if (getType(settings.originalNode) === Types.split_by_whatsapp_product) {
    const action = getOriginalAction(settings) as SendWhatsAppProduct;

    if (action.productViewSettings) {
      productViewSettings = {
        value: {
          header: { value: action.productViewSettings.header },
          body: { value: action.productViewSettings.body },
          footer: { value: action.productViewSettings.footer },
          action: { value: action.productViewSettings.action },
        },
      };
    }

    return {
      products: { value: action.products },
      automaticProductSearch: action.automaticProductSearch,
      sendCatalog: action.sendCatalog,
      searchType: action.search_type || ProductSearchType.Default,
      searchUrl: { value: action.search_url },
      cartSimulationParams: { value: action.cart_simulation_params },
      sellerId: { value: action.seller_id },
      postalCode: { value: action.postal_code },
      productSearch: { value: action.productSearch },
      productViewSettings: productViewSettings,
      resultName: { value: action.result_name },
      valid: true,
    };
  }

  return {
    products: { value: [] },
    automaticProductSearch: false,
    sendCatalog: true,
    searchType: ProductSearchType.Default,
    searchUrl: { value: '' },
    cartSimulationParams: { value: '' },
    sellerId: { value: '' },
    postalCode: { value: '' },
    productSearch: { value: '' },
    productViewSettings: productViewSettings,
    resultName: { value: 'Result' },
    valid: false,
  };
};

export const stateToNode = (
  settings: NodeEditorSettings,
  state: SendWhatsAppProductRouterFormState,
): RenderNode => {
  const productViewSettings: ProductViewSettings = {
    header: state.productViewSettings.value.header.value,
    body: state.productViewSettings.value.body.value,
    footer: state.productViewSettings.value.footer.value,
    action: state.productViewSettings.value.action.value,
  };

  const newAction: SendWhatsAppProduct = {
    type: Types.send_msg_catalog,
    products: state.products.value,
    automaticProductSearch: state.automaticProductSearch,
    sendCatalog: state.sendCatalog,
    search_type: state.searchType,
    search_url: state.searchUrl.value,
    cart_simulation_params: state.cartSimulationParams.value,
    seller_id: state.sellerId.value,
    postal_code: state.postalCode.value,
    productSearch: state.productSearch.value,
    productViewSettings,
    result_name: state.resultName.value,
    uuid: getActionUUID(settings, Types.send_msg_catalog),
  };

  return createWebhookBasedNode(newAction, settings.originalNode, true);
};
