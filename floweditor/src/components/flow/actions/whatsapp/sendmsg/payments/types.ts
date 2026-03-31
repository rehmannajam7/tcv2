export interface WhatsAppOrderAmount {
  value: string;
  description?: string;
}

export interface WhatsAppOrderDiscount extends WhatsAppOrderAmount {
  program_name?: string;
}

export interface WhatsAppOrderPixConfig {
  key: string;
  key_type: string;
  merchant_name: string;
  code: string;
}

export type WhatsAppOrderBasePaymentSettingsTypes =
  | 'physical-goods'
  | 'digital-goods';

export interface WhatsAppOrderPaymentSettings {
  type: WhatsAppOrderBasePaymentSettingsTypes;
  payment_link?: string;
  pix_config?: WhatsAppOrderPixConfig;
}

export interface WhatsAppOrderDetails {
  reference_id: string;
  item_list: string;
  tax: WhatsAppOrderAmount;
  shipping: WhatsAppOrderAmount;
  discount: WhatsAppOrderDiscount;
  payment_settings: WhatsAppOrderPaymentSettings;
}
