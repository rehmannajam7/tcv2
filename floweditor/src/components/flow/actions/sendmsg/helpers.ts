/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { getActionUUID } from 'components/flow/actions/helpers';
import { SendMsgFormState } from 'components/flow/actions/sendmsg/SendMsgForm';
import { Types } from 'config/interfaces';
import { MsgTemplating, SendMsg } from 'flowTypes';
import { AssetStore } from 'store/flowContext';
import { FormEntry, NodeEditorSettings, StringEntry } from 'store/nodeEditor';
import { SelectOption } from 'components/form/select/SelectElement';
import { createUUID } from 'utils';
import { Attachment } from './attachments';
import i18n from '../../../../config/i18n';

export const TOPIC_OPTIONS: SelectOption[] = [
  { value: 'event', name: 'Event' },
  { value: 'account', name: 'Account' },
  { value: 'purchase', name: 'Purchase' },
  { value: 'agent', name: 'Agent' },
];

export const INSTAGRAM_RESPONSE_TYPES: SelectOption[] = [
  { name: i18n.t('forms.instagram.response_types.none'), value: 'none' },
  {
    name: i18n.t('forms.instagram.response_types.tag'),
    value: 'tag',
  },
  {
    name: i18n.t('forms.instagram.response_types.dm_comment'),
    value: 'dm_comment',
  },
  {
    name: i18n.t('forms.instagram.response_types.comment'),
    value: 'comment',
  },
];

export const TAG_OPTIONS: SelectOption[] = [
  { name: i18n.t('forms.instagram.tags.human_agent'), value: 'human_agent' },
];

// Note: Instagram properties are already defined in the SendMsg interface in flowTypes.ts

export const initializeForm = (
  settings: NodeEditorSettings,
  assetStore: AssetStore,
): SendMsgFormState => {
  let template: FormEntry = { value: null };
  let templateVariables: StringEntry[] = [];

  if (
    settings.originalAction &&
    settings.originalAction.type === Types.send_msg
  ) {
    const action = settings.originalAction as SendMsg;
    const attachments: Attachment[] = [];
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

    if (action.templating) {
      const msgTemplate = action.templating.template;
      template = {
        value: {
          uuid: msgTemplate.uuid,
          name: msgTemplate.name,
        },
      };
      templateVariables = action.templating.variables.map((value: string) => {
        return {
          value,
        };
      });
    }

    // Extract Instagram settings from action if they exist
    let instagramResponseType: { value: SelectOption | null } = { value: null };
    let commentId: { value: string } = { value: '' };
    let tag: { value: SelectOption | null } = { value: null };

    if (action.instagram_settings) {
      const responseValue = action.instagram_settings.response_type;
      instagramResponseType = {
        value:
          INSTAGRAM_RESPONSE_TYPES.find(
            (option: SelectOption) => option.value === responseValue,
          ) || null,
      };

      // Set the appropriate field based on response type
      if (
        (responseValue === 'dm_comment' || responseValue === 'comment') &&
        action.instagram_settings.comment_id
      ) {
        commentId = { value: action.instagram_settings.comment_id };
      } else if (responseValue === 'tag' && action.instagram_settings.tag) {
        tag = {
          value:
            TAG_OPTIONS.find(
              (option: SelectOption) =>
                option.value === action.instagram_settings.tag,
            ) || null,
        };
      }
    }

    return {
      topic: {
        value: TOPIC_OPTIONS.find(option => option.value === action.topic),
      },
      template,
      templateVariables,
      attachments,
      message: { value: action.text },
      quickReplies: { value: action.quick_replies || [] },
      quickReplyEntry: { value: '' },
      sendAll: action.all_urns,
      valid: true,
      instagramResponseType,
      commentId,
      tag,
    };
  }

  return {
    topic: { value: null },
    template,
    templateVariables: [],
    attachments: [],
    message: { value: '' },
    quickReplies: { value: [] },
    quickReplyEntry: { value: '' },
    sendAll: false,
    valid: false,
    instagramResponseType: { value: null },
    commentId: { value: '' },
    tag: { value: null },
  };
};

export const stateToAction = (
  settings: NodeEditorSettings,
  state: SendMsgFormState,
): SendMsg => {
  const attachments = state.attachments
    .filter((attachment: Attachment) => attachment.url.trim().length > 0)
    .map((attachment: Attachment) => `${attachment.type}:${attachment.url}`);

  let templating: MsgTemplating = null;

  if (state.template && state.template.value) {
    let templatingUUID = createUUID();
    if (
      settings.originalAction &&
      settings.originalAction.type === Types.send_msg
    ) {
      const action = settings.originalAction as SendMsg;
      if (
        action.templating &&
        action.templating.template &&
        action.templating.template.uuid === state.template.value.id
      ) {
        templatingUUID = action.templating.uuid;
      }
    }

    templating = {
      uuid: templatingUUID,
      template: {
        uuid: state.template.value.uuid,
        name: state.template.value.name,
      },
      variables: state.templateVariables.map(
        (variable: StringEntry) => variable.value,
      ),
    };
  }

  const result: SendMsg = {
    attachments,
    text: state.message.value,
    type: Types.send_msg,
    all_urns: state.sendAll,
    quick_replies: state.quickReplies.value,
    uuid: getActionUUID(settings, Types.send_msg),
  };

  if (templating) {
    result.templating = templating;
  }

  if (state.topic.value) {
    result.topic = state.topic.value.value;
  }

  // Add Instagram-specific properties if a response type is selected
  if (state.instagramResponseType.value) {
    const responseType = state.instagramResponseType.value.value;

    // Only add Instagram settings if response type is not 'none'
    if (responseType !== 'none') {
      result.instagram_settings = {
        response_type: responseType,
      };

      // Add specific fields based on response type
      if (
        (responseType === 'dm_comment' || responseType === 'comment') &&
        state.commentId.value
      ) {
        result.instagram_settings.comment_id = state.commentId.value;
      } else if (responseType === 'tag' && state.tag.value) {
        result.instagram_settings.tag = state.tag.value.value;
      }
    }
  }

  return result;
};
