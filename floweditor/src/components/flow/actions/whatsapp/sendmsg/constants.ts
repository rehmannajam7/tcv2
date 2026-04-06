import i18n from 'config/i18n';
import { UnnnicSelectOption } from 'components/form/select/SelectElement';

export const MAX_LIST_ITEMS_COUNT = 10;
export const MAX_REPLIES_COUNT = 3;

export const enum WhatsAppMessageType {
  SIMPLE = 'simple',
  INTERACTIVE = 'interactive',
}

export const enum WhatsAppHeaderType {
  MEDIA = 'media',
  TEXT = 'text',
}

export const enum WhatsAppInteractionType {
  LIST = 'list',
  REPLIES = 'replies',
  LOCATION = 'location',
  CTA = 'cta_url',
  FLOW = 'flow_msg',
  ORDER_DETAILS = 'order_details',
}

export const enum WhatsAppOrderDetailsFailures {
  REFERENCE_ID = 'reference_id',
  ITEM_LIST = 'item_list',
  PAYMENT_BUTTONS = 'payment_buttons',
}

export const WHATSAPP_MESSAGE_TYPE_SIMPLE: UnnnicSelectOption<
  WhatsAppMessageType
> = {
  label: i18n.t('whatsapp_messages.simple_message', 'Simple message'),
  value: WhatsAppMessageType.SIMPLE,
};

export const WHATSAPP_MESSAGE_TYPE_INTERACTIVE: UnnnicSelectOption<
  WhatsAppMessageType
> = {
  label: i18n.t('whatsapp_messages.interactive_message', 'Interactive message'),
  value: WhatsAppMessageType.INTERACTIVE,
};

export const WHATSAPP_HEADER_TYPE_TEXT: UnnnicSelectOption<
  WhatsAppHeaderType
> = {
  label: i18n.t('whatsapp_headers.text', 'Text'),
  value: WhatsAppHeaderType.TEXT,
};
export const WHATSAPP_HEADER_TYPE_MEDIA: UnnnicSelectOption<
  WhatsAppHeaderType
> = {
  label: i18n.t('whatsapp_headers.media', 'Media'),
  value: WhatsAppHeaderType.MEDIA,
};

export const WHATSAPP_INTERACTION_TYPE_LIST: UnnnicSelectOption<
  WhatsAppInteractionType
> = {
  value: WhatsAppInteractionType.LIST,
  label: i18n.t('whatsapp_interactions.list', 'Option list'),
  description: i18n.t(
    'whatsapp_interactions.list_description',
    'Make choices easier with a list of up to 10 interactive options',
  ),
};

export const WHATSAPP_INTERACTION_TYPE_NONE: UnnnicSelectOption<
  WhatsAppInteractionType
> = {
  value: null,
  label: i18n.t('whatsapp_interactions.none', 'No interactions selected'),
};

export const WHATSAPP_INTERACTION_TYPE_REPLIES: UnnnicSelectOption<
  WhatsAppInteractionType
> = {
  value: WhatsAppInteractionType.REPLIES,
  label: i18n.t('whatsapp_interactions.replies', 'Quick replies'),
  description: i18n.t(
    'whatsapp_interactions.replies_description',
    'Create up to 3 quick replies with predefined messages',
  ),
};

export const WHATSAPP_INTERACTION_TYPE_CTA: UnnnicSelectOption<
  WhatsAppInteractionType
> = {
  value: WhatsAppInteractionType.CTA,
  label: i18n.t('whatsapp_interactions.add_url', 'URL Button'),
  description: i18n.t(
    'whatsapp_interactions.add_url_description',
    'Add a button with a link to an external URL.',
  ),
};

export const WHATSAPP_INTERACTION_TYPE_WHATSAPP_FLOWS: UnnnicSelectOption<
  WhatsAppInteractionType
> = {
  value: WhatsAppInteractionType.FLOW,
  label: i18n.t('whatsapp_flows.title', 'WhatsApp Flows'),
  description: i18n.t(
    'whatsapp_flows.description',
    'Use your interactive forms created on Meta.',
  ),
};

export const WHATSAPP_INTERACTION_TYPE_LOCATION: UnnnicSelectOption<
  WhatsAppInteractionType
> = {
  value: WhatsAppInteractionType.LOCATION,
  label: i18n.t('whatsapp_interactions.request_location', 'Request Location'),
  description: i18n.t(
    'whatsapp_interactions.location_description',
    'Ask users for their location to facilitate service',
  ),
};

export const WHATSAPP_INTERACTION_TYPE_ORDER_DETAILS: UnnnicSelectOption<
  WhatsAppInteractionType
> = {
  value: WhatsAppInteractionType.ORDER_DETAILS,
  label: i18n.t(
    'whatsapp_interactions.payments.order_details',
    'Payments: Order Details',
  ),
  description: i18n.t(
    'whatsapp_interactions.payments.order_details_description',
    'Send order details to the user',
  ),
};

export const WHATSAPP_MESSAGE_TYPE_OPTIONS: UnnnicSelectOption<
  WhatsAppMessageType
>[] = [WHATSAPP_MESSAGE_TYPE_SIMPLE, WHATSAPP_MESSAGE_TYPE_INTERACTIVE];

export const WHATSAPP_HEADER_TYPE_OPTIONS: UnnnicSelectOption<
  WhatsAppHeaderType
>[] = [WHATSAPP_HEADER_TYPE_MEDIA, WHATSAPP_HEADER_TYPE_TEXT];

export const WHATSAPP_INTERACTION_TYPE_OPTIONS: UnnnicSelectOption<
  WhatsAppInteractionType
>[] = [
  WHATSAPP_INTERACTION_TYPE_NONE,
  WHATSAPP_INTERACTION_TYPE_REPLIES,
  WHATSAPP_INTERACTION_TYPE_LIST,
  WHATSAPP_INTERACTION_TYPE_LOCATION,
  WHATSAPP_INTERACTION_TYPE_CTA,
  WHATSAPP_INTERACTION_TYPE_WHATSAPP_FLOWS,
  WHATSAPP_INTERACTION_TYPE_ORDER_DETAILS,
];
