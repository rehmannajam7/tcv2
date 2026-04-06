import {
  OrderDetailsSectionState,
  OrderDetailsSectionProps,
} from 'components/flow/actions/whatsapp/sendmsg/payments/OrderDetailsSection';
import {
  WhatsAppOrderBasePaymentSettingsTypes,
  WhatsAppOrderDetails,
} from 'components/flow/actions/whatsapp/sendmsg/payments/types';

export const propsToState = (
  props: OrderDetailsSectionProps,
): OrderDetailsSectionState => {
  const orderDetails = props && props.orderDetails && props.orderDetails.value;
  if (orderDetails) {
    const paymentSettings = orderDetails.payment_settings;
    return {
      activeTab: 0,
      referenceID: {
        value: orderDetails.reference_id,
      },
      itemList: {
        value: orderDetails.item_list,
      },
      taxValue: {
        value: orderDetails.tax.value,
      },
      taxDescription: {
        value: orderDetails.tax.description,
      },
      shippingValue: {
        value: orderDetails.shipping.value,
      },
      shippingDescription: {
        value: orderDetails.shipping.description,
      },
      discountValue: {
        value: orderDetails.discount.value,
      },
      discountDescription: {
        value: orderDetails.discount.description,
      },
      discountProgramName: {
        value: orderDetails.discount.program_name,
      },
      paymentType: {
        value: paymentSettings.type,
      },
      paymentLink: {
        value: paymentSettings.payment_link,
      },
      pixConfigKey: {
        value: paymentSettings.pix_config ? paymentSettings.pix_config.key : '',
      },
      pixConfigKeyType: {
        value: paymentSettings.pix_config
          ? paymentSettings.pix_config.key_type
          : '',
      },
      pixConfigMerchantName: {
        value: paymentSettings.pix_config
          ? paymentSettings.pix_config.merchant_name
          : '',
      },
      pixConfigCode: {
        value: paymentSettings.pix_config
          ? paymentSettings.pix_config.code
          : '',
      },
      valid: true,
    };
  }

  return {
    activeTab: 0,
    referenceID: {
      value: '',
    },
    itemList: {
      value: '',
    },
    taxValue: {
      value: '0',
    },
    taxDescription: {
      value: '',
    },
    shippingValue: {
      value: '',
    },
    shippingDescription: {
      value: '',
    },
    discountValue: {
      value: '',
    },
    discountDescription: {
      value: '',
    },
    discountProgramName: {
      value: '',
    },
    paymentType: {
      value: 'physical-goods',
    },
    paymentLink: {
      value: '',
    },
    pixConfigKey: {
      value: '',
    },
    pixConfigKeyType: {
      value: '',
    },
    pixConfigMerchantName: {
      value: '',
    },
    pixConfigCode: {
      value: '',
    },
    valid: true,
  };
};

export const stateToProps = (
  state: OrderDetailsSectionState,
): WhatsAppOrderDetails => {
  return {
    reference_id: state.referenceID.value,
    item_list: state.itemList.value,
    tax: {
      value: state.taxValue.value,
      description: state.taxDescription.value,
    },
    shipping: {
      value: state.shippingValue.value,
      description: state.shippingDescription.value,
    },
    discount: {
      value: state.discountValue.value,
      description: state.discountDescription.value,
      program_name: state.discountProgramName.value,
    },
    payment_settings: {
      type: state.paymentType.value as WhatsAppOrderBasePaymentSettingsTypes,
      payment_link: state.paymentLink.value,
      pix_config: {
        key: state.pixConfigKey.value,
        key_type: state.pixConfigKeyType.value,
        merchant_name: state.pixConfigMerchantName.value,
        code: state.pixConfigCode.value,
      },
    },
  };
};

export const initializeEmptyOrderDetails = (): WhatsAppOrderDetails => {
  return {
    reference_id: '',
    item_list: '',
    tax: {
      value: '0',
      description: '',
    },
    shipping: {
      value: '',
      description: '',
    },
    discount: {
      value: '',
      description: '',
      program_name: '',
    },
    payment_settings: {
      type: 'physical-goods',
      payment_link: '',
      pix_config: {
        key: '',
        key_type: '',
        merchant_name: '',
        code: '',
      },
    },
  };
};
