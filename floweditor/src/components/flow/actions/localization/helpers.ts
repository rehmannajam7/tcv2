import { KeyLocalizationFormState } from 'components/flow/actions/localization/KeyLocalizationForm';
import { MsgLocalizationFormState } from 'components/flow/actions/localization/MsgLocalizationForm';
import { WeniGPTLocalizationFormState } from 'components/flow/actions/localization/WeniGPTLocalizationForm';
import { WhatsappMsgLocalizationFormState } from 'components/flow/actions/localization/WhastsappMsgLocalizationForm';
import { Types } from 'config/interfaces';
import { getTypeConfig } from 'config/typeConfigs';
import { NodeEditorSettings, StringEntry } from 'store/nodeEditor';
import {
  SendMsg,
  MsgTemplating,
  SayMsg,
  CallWeniGPT,
  SendWhatsAppMsg,
} from 'flowTypes';
import i18n from 'config/i18n';
import { Attachment } from 'components/flow/actions/sendmsg/attachments';
import {
  WHATSAPP_HEADER_TYPE_TEXT,
  WhatsAppHeaderType,
} from 'components/flow/actions/whatsapp/sendmsg/constants';
import { WhatsAppListItem } from '../whatsapp/sendmsg/SendWhatsAppMsgForm';

export const initializeLocalizedKeyForm = (
  settings: NodeEditorSettings,
): KeyLocalizationFormState => {
  const keyValues: { [key: string]: StringEntry } = {};
  const localized = settings.localizations[0];
  const action = localized.getObject() as any;

  const keys = settings.originalAction
    ? getTypeConfig(settings.originalAction.type).localizeableKeys || []
    : [];
  keys.forEach((key: string) => {
    keyValues[key] = {
      value: key in localized.localizedKeys ? action[key] : '',
    };
  });

  return {
    keyValues,
    valid: true,
  };
};

export const initializeLocalizedForm = (
  settings: NodeEditorSettings,
): MsgLocalizationFormState => {
  const state: MsgLocalizationFormState = {
    message: { value: '' },
    quickReplies: { value: [] },
    templateVariables: [],
    templating: null,
    audio: { value: null },
    valid: true,
    attachments: [],
  };

  const { originalAction, localizations } = settings;

  // check if our form should use a localized action
  if (
    originalAction &&
    (originalAction.type === Types.send_msg ||
      originalAction.type === Types.say_msg ||
      originalAction.type === Types.send_whatsapp_msg) &&
    localizations &&
    localizations.length > 0
  ) {
    if (originalAction && (originalAction as any).templating) {
      state.templating = (originalAction as any).templating;
      state.templateVariables = state.templating.variables.map(
        (value: string) => {
          return {
            value: '',
          };
        },
      );
    }

    for (const localized of localizations) {
      if (localized.isLocalized()) {
        const localizedObject = localized.getObject() as any;

        if (localizedObject.text) {
          const action = localizedObject as (SendMsg & SayMsg);
          state.message.value =
            'text' in localized.localizedKeys ? action.text : '';
          state.audio.value =
            'audio_url' in localized.localizedKeys ? action.audio_url : null;
          state.quickReplies.value =
            'quick_replies' in localized.localizedKeys
              ? action.quick_replies || []
              : [];

          const attachments: Attachment[] = [];

          if ('attachments' in localized.localizedKeys) {
            (action.attachments || []).forEach((attachmentString: string) => {
              const splitPoint = attachmentString.indexOf(':');

              const type = attachmentString.substring(0, splitPoint);
              const attachment = {
                type,
                url: attachmentString.substring(splitPoint + 1),
                uploaded: type.indexOf('/') > -1,
              };

              attachments.push(attachment);
            });
          }

          state.attachments = attachments;
          state.valid = true;
        }

        if (localizedObject.variables) {
          const templating = localizedObject as MsgTemplating;
          state.templateVariables = templating.variables.map(
            (value: string) => {
              return {
                value: 'variables' in localized.localizedKeys ? value : '',
              };
            },
          );
          state.valid = true;
        }
      }
    }
  }
  return state;
};

export const initializeWhatsappMsgLocalizedForm = (
  settings: NodeEditorSettings,
): WhatsappMsgLocalizationFormState => {
  const { originalAction, localizations } = settings;

  const state: WhatsappMsgLocalizationFormState = {
    valid: true,
    text: { value: '' },
    headerType: WHATSAPP_HEADER_TYPE_TEXT,
    headerText: { value: '' },
    footer: { value: '' },
    attachment: { value: { type: '', url: '' } },
    interactionType: null,

    buttonText: { value: '' },
    actionURL: { value: '' },
    listItems: {
      value: ((originalAction as SendWhatsAppMsg).list_items || []).map(
        item => {
          return {
            uuid: item.uuid,
            title: '',
            description: '',
          };
        },
      ),
    },
    listItemTitleEntry: { value: '' },
    listItemDescriptionEntry: { value: '' },

    quickReplies: { value: [] },
    quickReplyEntry: { value: '' },
  };

  if (
    originalAction &&
    (originalAction.type === Types.send_msg ||
      originalAction.type === Types.say_msg ||
      originalAction.type === Types.send_whatsapp_msg) &&
    localizations &&
    localizations.length > 0
  ) {
    for (const localized of localizations) {
      if (localized.isLocalized()) {
        const localizedObject = localized.getObject() as any;
        const action = localizedObject as (SendWhatsAppMsg);

        if (localizedObject.text) {
          state.text.value =
            'text' in localized.localizedKeys ? action.text : '';
          state.valid = true;
        }

        if (localizedObject.header_text) {
          state.headerText.value =
            'header_text' in localized.localizedKeys ? action.header_text : '';
          state.valid = true;
        }

        if (localizedObject.header_type) {
          const label =
            action.header_type === 'text'
              ? i18n.t('whatsapp_headers.text', 'Text')
              : i18n.t('whatsapp_headers.media', 'Media');
          const value =
            action.header_type === 'text'
              ? WhatsAppHeaderType.TEXT
              : WhatsAppHeaderType.MEDIA;
          state.headerType = { value, label };
          state.valid = true;
        }

        if (localizedObject.footer) {
          state.footer.value =
            'footer' in localized.localizedKeys ? action.footer : '';
          state.valid = true;
        }

        if (localizedObject.button_text) {
          state.buttonText.value =
            'button_text' in localized.localizedKeys ? action.button_text : '';
          state.valid = true;
        }

        if (localizedObject.action_url) {
          state.actionURL.value =
            'action_url' in localized.localizedKeys ? action.action_url : '';
          state.valid = true;
        }

        if ((originalAction as SendWhatsAppMsg).list_items) {
          const newItem = (originalAction as SendWhatsAppMsg).list_items.find(
            (item: any) => {
              return item.uuid === action.uuid;
            },
          );

          if (newItem) {
            const itemAction = (action as any) as WhatsAppListItem;
            state.listItems.value = state.listItems.value.map(item => {
              if (item.uuid === newItem.uuid) {
                return {
                  uuid: item.uuid,
                  title: itemAction.title || '',
                  description: itemAction.description || '',
                };
              }
              return item;
            });
          }
          state.listItems.value;
          state.valid = true;
        }

        if (localizedObject.quick_replies) {
          state.quickReplies.value =
            'quick_replies' in localized.localizedKeys
              ? action.quick_replies
              : [];
          state.valid = true;
        }

        if ('attachment' in localized.localizedKeys) {
          const splitPoint = action.attachment.indexOf(':');

          const type = action.attachment.substring(0, splitPoint);
          const attachment = {
            type,
            url: action.attachment.substring(splitPoint + 1),
            uploaded: type.indexOf('/') > -1,
          };
          state.attachment.value = attachment;
        }
      }
    }
  }
  return state;
};

export const initializeWeniGPTLocalizedForm = (
  settings: NodeEditorSettings,
): WeniGPTLocalizationFormState => {
  const state: WeniGPTLocalizationFormState = {
    expression: { value: '' },
    valid: true,
  };

  const weniGPTAction =
    settings.originalNode.node.actions[
      settings.originalNode.node.actions.length - 1
    ];

  // check if our form should use a localized action
  if (
    weniGPTAction &&
    weniGPTAction.type === Types.call_wenigpt &&
    settings.localizations &&
    settings.localizations.length > 0
  ) {
    for (const localized of settings.localizations) {
      if (localized.isLocalized()) {
        const localizedObject = localized.getObject() as any;

        if (localizedObject.input) {
          const action = localizedObject as CallWeniGPT;
          state.expression.value =
            'input' in localized.localizedKeys ? action.input : '';
          state.valid = true;
        }
      }
    }
  }
  return state;
};
