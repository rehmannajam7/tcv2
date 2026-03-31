import { react as bindCallbacks } from 'auto-bind';
import Dialog, { ButtonSet } from 'components/dialog/Dialog';
import {
  nodeToState,
  stateToAction,
  createEmptyListItem,
} from 'components/flow/actions/whatsapp/sendmsg/helpers';
import { ActionFormProps } from 'components/flow/props';
import TextInputElement, {
  TextInputSizes,
} from 'components/form/textinput/TextInputElement';
import TypeList from 'components/nodeeditor/TypeList';
import { fakePropType } from 'config/ConfigProvider';
import * as React from 'react';
import {
  FormState,
  mergeForm,
  StringEntry,
  FormEntry,
  StringArrayEntry,
  UnnnicSelectOptionEntry,
  ValidationFailure,
} from 'store/nodeEditor';
import { ValidURL, shouldRequireIf, validate } from 'store/validators';

import styles from 'components/flow/actions/whatsapp/sendmsg/SendWhatsAppMsgForm.module.scss';

import i18n from 'config/i18n';

import { applyVueInReact } from 'veaury';
// @ts-ignore
import Unnnic from '@weni/unnnic-system';
import {
  Attachment,
  FILE_TYPE,
  FILE_TYPE_MAP,
  FILE_TYPE_REGEX,
  renderUploadButton,
} from 'components/flow/actions/whatsapp/sendmsg/attachments';
import { UnnnicSelectOption } from 'components/form/select/SelectElement';
import update from 'immutability-helper';
import { AxiosResponse } from 'axios';
import TextEditorElement from 'components/form/texteditor/TextEditorElement';
import QuickRepliesList, {
  hasEmptyReply,
} from 'components/flow/actions/whatsapp/sendmsg/QuickRepliesList';
import OptionsList, {
  hasEmptyListItem,
} from 'components/flow/actions/whatsapp/sendmsg/OptionsList';
import { renderIf } from 'utils';
import { Trans } from 'react-i18next';
import AssetSelector from 'components/form/assetselector/AssetSelector';
import { TembaSelectStyle } from 'temba/TembaSelect';
import WhatsAppFlowData from 'components/flow/actions/whatsapp/sendmsg/WhatsAppFlowData';
import OrderDetailsSection from 'components/flow/actions/whatsapp/sendmsg/payments/OrderDetailsSection';
import { WhatsAppOrderDetails } from 'components/flow/actions/whatsapp/sendmsg/payments/types';
import {
  WHATSAPP_HEADER_TYPE_MEDIA,
  WHATSAPP_HEADER_TYPE_TEXT,
  WHATSAPP_INTERACTION_TYPE_LIST,
  WHATSAPP_INTERACTION_TYPE_REPLIES,
  WHATSAPP_MESSAGE_TYPE_INTERACTIVE,
  WHATSAPP_MESSAGE_TYPE_SIMPLE,
  WhatsAppMessageType,
  WhatsAppHeaderType,
  WhatsAppInteractionType,
  MAX_LIST_ITEMS_COUNT,
  MAX_REPLIES_COUNT,
  WHATSAPP_INTERACTION_TYPE_NONE,
  WHATSAPP_HEADER_TYPE_OPTIONS,
  WHATSAPP_MESSAGE_TYPE_OPTIONS,
  WHATSAPP_INTERACTION_TYPE_OPTIONS,
  WhatsAppOrderDetailsFailures,
} from 'components/flow/actions/whatsapp/sendmsg/constants';
import { initializeEmptyOrderDetails } from './payments/helpers';

const UnnnicIcon = applyVueInReact(Unnnic.unnnicIcon, {
  vue: {
    componentWrap: 'div',
    slotWrap: 'div',
    componentWrapAttrs: {
      'data-draggable': 'true',
      style: {
        all: '',
        padding: '4px',
      },
    },
  },
});

const UnnnicSelectSmart = applyVueInReact(Unnnic.unnnicSelectSmart, {
  vue: {
    componentWrap: 'div',
    slotWrap: 'div',
    componentWrapAttrs: {
      style: {
        all: '',
      },
    },
  },
});

const UnnnicTooltip = applyVueInReact(Unnnic.unnnicToolTip, {
  vue: {
    componentWrap: 'div',
    slotWrap: 'div',
    componentWrapAttrs: {
      style: {
        all: '',
      },
    },
  },
});

export interface WhatsAppListItem {
  uuid: string;
  title: string;
  description: string;
}

export interface WhatsAppFlow {
  id: string;
  name: string;
  assets: {
    screens: string[];
    variables: string[];
  };
}

export interface FlowData {
  [key: string]: string;
}

export interface SendWhatsAppMsgFormState extends FormState {
  message: StringEntry;

  messageType: UnnnicSelectOptionEntry<WhatsAppMessageType>;

  headerType: UnnnicSelectOptionEntry<WhatsAppHeaderType>;
  headerText: StringEntry;
  attachment: FormEntry<Attachment>;

  footer: StringEntry;

  interactionType: UnnnicSelectOptionEntry<WhatsAppInteractionType>;

  buttonText: StringEntry;
  actionURL: StringEntry;
  listItems: FormEntry<WhatsAppListItem[]>;
  listItemTitleEntry: StringEntry;
  listItemDescriptionEntry: StringEntry;

  quickReplies: StringArrayEntry;
  quickReplyEntry: StringEntry;
  whatsappFlow: FormEntry<WhatsAppFlow>;
  flowScreen: StringEntry;
  flowData: FormEntry<FlowData>;
  flowDataAttachmentNameMap: Record<string, string>;
  orderDetails: FormEntry<WhatsAppOrderDetails>;
}

interface UpdateKeys {
  message?: string;
  messageType?: UnnnicSelectOption<WhatsAppMessageType>;
  headerType?: UnnnicSelectOption<WhatsAppHeaderType>;
  headerText?: string;
  attachment?: Attachment;
  footer?: string;
  interactionType?: UnnnicSelectOption<WhatsAppInteractionType>;
  buttonText?: string;
  actionURL?: string;
  listItems?: WhatsAppListItem[];
  removeListItem?: WhatsAppListItem;
  quickReplies?: string[];
  whatsAppFlow?: WhatsAppFlow;
  flowData?: FlowData;
  flowScreen?: string;
  flowDataAttachmentNameMap?: Record<string, string>;
  orderDetails?: WhatsAppOrderDetails;
}

export default class SendWhatsAppMsgForm extends React.Component<
  ActionFormProps,
  SendWhatsAppMsgFormState
> {
  constructor(props: ActionFormProps) {
    super(props);

    this.state = nodeToState(this.props.nodeSettings, this.props.assetStore);

    const listItems = [...this.state.listItems.value];
    if (
      !hasEmptyListItem(listItems) &&
      listItems.length < MAX_LIST_ITEMS_COUNT
    ) {
      listItems.push(createEmptyListItem());
    }

    const replies = [...this.state.quickReplies.value];
    if (!hasEmptyReply(replies) && replies.length < MAX_REPLIES_COUNT) {
      replies.push('');
    }

    this.state = {
      ...this.state,
      listItems: {
        value: listItems,
      },
      quickReplies: {
        value: replies,
      },
    };

    bindCallbacks(this, {
      include: [/^handle/, /^on/],
    });
  }

  public static contextTypes = {
    config: fakePropType,
  };

  private hasValidAttachment(): boolean {
    const attachment = this.state.attachment.value;
    return (
      attachment &&
      attachment.type !== FILE_TYPE.UNKNOWN &&
      this.state.attachment.validationFailures.length === 0
    );
  }

  private hasRequiredListItems(): boolean {
    return (
      this.state.interactionType.value.value ===
      WHATSAPP_INTERACTION_TYPE_LIST.value
    );
  }

  private hasRequiredListItem(listItems: WhatsAppListItem[]): boolean {
    const validItems = listItems.filter(
      (item: WhatsAppListItem) => item.title.trim().length > 0,
    );

    return validItems.length > 0;
  }

  private hasRequiredReplies(): boolean {
    return (
      this.state.interactionType.value.value ===
      WHATSAPP_INTERACTION_TYPE_REPLIES.value
    );
  }

  private hasValidReply(replies: string[]): boolean {
    const validReplies = replies.filter(
      (reply: string) => reply.trim().length > 0,
    );

    return validReplies.length > 0;
  }

  private handleUpdate(keys: UpdateKeys, submitting = false): boolean {
    const updates: Partial<SendWhatsAppMsgFormState> = {};

    if (keys.hasOwnProperty('message')) {
      updates.message = validate(
        i18n.t('forms.message', 'Message'),
        keys.message,
        [
          shouldRequireIf(
            (submitting && !this.hasValidAttachment()) ||
              (this.hasValidReply(this.state.quickReplies.value) ||
                this.hasRequiredListItem(this.state.listItems.value)),
          ),
        ],
      );
    }

    if (keys.hasOwnProperty('messageType')) {
      updates.messageType = { value: keys.messageType };
    }

    if (keys.hasOwnProperty('headerType')) {
      updates.headerType = { value: keys.headerType };
    }

    if (keys.hasOwnProperty('headerText')) {
      updates.headerText = validate(
        i18n.t('forms.header_text', 'Header text'),
        keys.headerText,
        [],
      );
    }

    if (keys.hasOwnProperty('attachment')) {
      updates.attachment = { value: keys.attachment, validationFailures: [] };
      if (
        keys.attachment &&
        !keys.attachment.uploaded &&
        keys.attachment.type === FILE_TYPE.UNKNOWN &&
        keys.attachment.url.length > 0
      ) {
        updates.attachment.validationFailures = [
          {
            message: i18n.t(
              'whatsapp_msg.invalid_attachment_type',
              'Invalid attachment type',
            ),
          },
        ];
      }
    }

    if (keys.hasOwnProperty('footer')) {
      updates.footer = validate(
        i18n.t('forms.footer', 'Footer'),
        keys.footer,
        [],
      );
    }

    if (keys.hasOwnProperty('interactionType')) {
      updates.interactionType = { value: keys.interactionType };
    }

    if (keys.hasOwnProperty('buttonText')) {
      updates.buttonText = validate(
        i18n.t('forms.list_button_text', 'Action button text'),
        keys.buttonText,
        [shouldRequireIf(submitting && !!this.state.whatsappFlow.value)],
      );
    }

    if (keys.hasOwnProperty('actionURL')) {
      updates.actionURL = validate(
        i18n.t('forms.list_button_url', 'Action button URL'),
        keys.actionURL,
        [],
      );
    }

    let ensureEmptyListItem = false;
    if (keys.hasOwnProperty('listItems')) {
      updates.listItems = { value: keys.listItems };

      if (this.hasRequiredListItems()) {
        const hasValidItem = this.hasRequiredListItem(keys.listItems);
        if (!hasValidItem) {
          updates.listItems.validationFailures = [
            {
              message: i18n.t(
                'whatsapp_msg.list_items_required',
                'At least one list option must be filled',
              ),
            },
          ];
        }
      }

      ensureEmptyListItem = true;
    }

    if (keys.hasOwnProperty('removeListItem')) {
      const items = this.state.listItems.value.filter(
        item => item.uuid !== keys.removeListItem.uuid,
      );
      updates.listItems = validate(
        i18n.t('forms.list_items', 'List items'),
        items,
        [shouldRequireIf(submitting && this.hasRequiredListItems())],
      ) as FormEntry<WhatsAppListItem[]>;
      ensureEmptyListItem = true;
    }

    let ensureEmptyReply = false;
    if (keys.hasOwnProperty('quickReplies')) {
      updates.quickReplies = { value: keys.quickReplies };

      if (this.hasRequiredReplies()) {
        const hasValidReply = this.hasValidReply(keys.quickReplies);
        if (!hasValidReply) {
          updates.quickReplies.validationFailures = [
            {
              message: i18n.t(
                'whatsapp_msg.replies_required',
                'At least one quick reply must be filled',
              ),
            },
          ];
        }
      }

      // check if we have duplicates
      const uniqueReplies = Array.from(new Set(keys.quickReplies));
      if (uniqueReplies.length < keys.quickReplies.length) {
        updates.quickReplies.validationFailures = [
          {
            message: i18n.t(
              'whatsapp_msg.replies_unique',
              'Quick replies must be unique',
            ),
          },
        ];
      }

      ensureEmptyReply = true;
    }

    if (keys.hasOwnProperty('whatsAppFlow')) {
      updates.whatsappFlow = validate(
        i18n.t('forms.whatsapp_flow', 'WhatsApp Flow'),
        keys.whatsAppFlow,
        [
          shouldRequireIf(
            submitting &&
              this.state.interactionType.value.value ===
                WhatsAppInteractionType.FLOW,
          ),
        ],
      );
    }

    if (keys.hasOwnProperty('flowScreen')) {
      updates.flowScreen = validate(
        i18n.t('forms.flow_screen', 'Flow Screen'),
        keys.flowScreen,
        [shouldRequireIf(submitting && !!this.state.whatsappFlow.value)],
      );
    }

    if (keys.hasOwnProperty('flowData')) {
      updates.flowData = { value: keys.flowData };
    }

    if (keys.hasOwnProperty('flowDataAttachmentNameMap')) {
      updates.flowDataAttachmentNameMap = keys.flowDataAttachmentNameMap;
    }

    if (keys.hasOwnProperty('orderDetails')) {
      updates.orderDetails = { value: keys.orderDetails };

      const validationFailures: ValidationFailure[] = [];
      if (submitting) {
        if (!keys.orderDetails.reference_id.trim()) {
          validationFailures.push({
            field: WhatsAppOrderDetailsFailures.REFERENCE_ID,
            message: i18n.t(
              'whatsapp_interactions.payments.order_details.reference_id_required',
              'Reference ID is required',
            ),
          });
        }

        if (!keys.orderDetails.item_list.trim()) {
          validationFailures.push({
            field: WhatsAppOrderDetailsFailures.ITEM_LIST,
            message: i18n.t(
              'whatsapp_interactions.payments.order_details.item_list_required',
              'Item list is required',
            ),
          });
        }

        // at least one payment button must be filled
        if (
          !keys.orderDetails.payment_settings.payment_link.trim() &&
          (keys.orderDetails.payment_settings.pix_config &&
            (!keys.orderDetails.payment_settings.pix_config.code.trim() ||
              !keys.orderDetails.payment_settings.pix_config.key.trim() ||
              !keys.orderDetails.payment_settings.pix_config.key_type.trim() ||
              !keys.orderDetails.payment_settings.pix_config.merchant_name.trim()))
        ) {
          validationFailures.push({
            field: WhatsAppOrderDetailsFailures.PAYMENT_BUTTONS,
            message: i18n.t(
              'whatsapp_interactions.payments.order_details.payment_button_required',
              'At least one payment button is required',
            ),
          });
        }
      }
      updates.orderDetails.validationFailures = validationFailures;
    }

    const updated = mergeForm(this.state, updates) as SendWhatsAppMsgFormState;

    this.setState(updated, () => {
      // if we no longer have an empty list item, add one
      if (ensureEmptyListItem) {
        if (
          !hasEmptyListItem(this.state.listItems.value) &&
          this.state.listItems.value.length < MAX_LIST_ITEMS_COUNT
        ) {
          const listItems = update(this.state.listItems.value, {
            $push: [createEmptyListItem()],
          }) as WhatsAppListItem[];
          this.handleUpdate({ listItems: listItems });
        }
      }

      // if we no longer have an empty reply, add one
      if (ensureEmptyReply) {
        if (
          !hasEmptyReply(this.state.quickReplies.value) &&
          this.state.quickReplies.value.length < MAX_REPLIES_COUNT
        ) {
          const quickReplies = update(this.state.quickReplies.value, {
            $push: [''],
          }) as string[];
          this.handleUpdate({ quickReplies: quickReplies });
        }
      }
    });
    return updated.valid;
  }

  public handleMessageTypeUpdate(
    event: UnnnicSelectOption<WhatsAppMessageType>[],
    submitting = false,
  ) {
    const messageType = event[0];

    if (messageType.value === this.state.messageType.value.value) {
      return false;
    }

    const toUpdate: Partial<UpdateKeys> = {
      messageType,
    };

    if (messageType.value === WhatsAppMessageType.SIMPLE) {
      toUpdate.interactionType = WHATSAPP_INTERACTION_TYPE_NONE;
      toUpdate.headerType = WHATSAPP_HEADER_TYPE_MEDIA;
      toUpdate.headerText = '';
      toUpdate.footer = '';
      toUpdate.listItems = [];
      toUpdate.quickReplies = [];
    } else if (messageType.value === WhatsAppMessageType.INTERACTIVE) {
      toUpdate.interactionType = WHATSAPP_INTERACTION_TYPE_REPLIES;
    }

    return this.handleUpdate(toUpdate, submitting);
  }

  public handleMessageUpdate(
    message: string,
    name: string,
    submitting = false,
  ): boolean {
    return this.handleUpdate({ message }, submitting);
  }

  public handleHeaderTypeChange(
    event: UnnnicSelectOption<WhatsAppHeaderType>[],
    submitting = false,
  ): boolean {
    const headerType = event[0];

    if (headerType.value === this.state.headerType.value.value) {
      return false;
    }

    return this.handleUpdate(
      { headerType: headerType, attachment: null, headerText: '' },
      submitting,
    );
  }

  public handleHeaderTextUpdate(
    headerText: string,
    name: string,
    submitting = false,
  ): boolean {
    // We add quick replies and list items to ensure theirs validation with the current header
    const validHeader = this.handleUpdate({ headerText }, submitting);
    const validInteractions = this.handleUpdate(
      {
        listItems: this.state.listItems.value,
        quickReplies: this.state.quickReplies.value,
      },
      submitting,
    );
    return validHeader && validInteractions;
  }

  public handleAttachmentUrlChange(
    value: string,
    name: string,
    submitting = false,
  ): boolean {
    const attachmentUrl = validate(
      i18n.t('whatsapp_msg.attachment_url', 'Attachment URL'),
      value,
      [
        shouldRequireIf(
          submitting &&
            this.state.headerType.value.value === WhatsAppHeaderType.MEDIA,
        ),
        ValidURL,
      ],
    );

    const match = attachmentUrl.value.toLowerCase().match(FILE_TYPE_REGEX);
    const fileType = match ? match[1] : null;
    const attachmentType = FILE_TYPE_MAP[fileType] || 'unknown';

    const attachment: Attachment = {
      type: attachmentType,
      url: attachmentUrl.value,
      uploaded: false,
    };

    return this.handleUpdate({ attachment }, submitting);
  }

  public handleAttachmentUploaded(response: AxiosResponse) {
    const attachment: Attachment = {
      type: response.data.type,
      url: response.data.url,
      uploaded: true,
    };
    return this.handleUpdate({ attachment }, false);
  }

  public handleAttachmentRemoved() {
    return this.handleUpdate({ attachment: null });
  }

  public handleFooterUpdate(
    footer: string,
    name: string,
    submitting = false,
  ): boolean {
    // We add quick replies and list items to ensure theirs validation with the current footer
    const validFooter = this.handleUpdate({ footer }, submitting);
    const validInteractions = this.handleUpdate(
      {
        listItems: this.state.listItems.value,
        quickReplies: this.state.quickReplies.value,
      },
      submitting,
    );
    return validFooter && validInteractions;
  }

  public handleInteractionTypeUpdate(
    event: UnnnicSelectOption<WhatsAppInteractionType>[],
    submitting = false,
  ) {
    const interactionType = event[0];

    if (interactionType.value === this.state.interactionType.value.value) {
      return false;
    }

    const toUpdate: UpdateKeys = {
      messageType: WHATSAPP_MESSAGE_TYPE_INTERACTIVE,
      interactionType,
      listItems: [],
      quickReplies: [],
      buttonText: '',
    };

    if (interactionType.value === WhatsAppInteractionType.LOCATION) {
      toUpdate.headerText = '';
      toUpdate.attachment = null;
      toUpdate.footer = '';
    } else if (
      interactionType.value === WhatsAppInteractionType.LIST ||
      interactionType.value === WhatsAppInteractionType.CTA ||
      interactionType.value === WhatsAppInteractionType.FLOW
    ) {
      toUpdate.attachment = null;
      toUpdate.headerType = WHATSAPP_HEADER_TYPE_TEXT;
    } else if (
      interactionType.value === WhatsAppInteractionType.ORDER_DETAILS
    ) {
      toUpdate.headerText = '';
      toUpdate.headerType = WHATSAPP_HEADER_TYPE_MEDIA;

      if (!this.state.orderDetails.value) {
        toUpdate.orderDetails = initializeEmptyOrderDetails();
      }
    }

    return this.handleUpdate(toUpdate);
  }

  public handleQuickRepliesUpdate(
    quickReplies: string[],
    submitting = false,
  ): boolean {
    return this.handleUpdate({ quickReplies }, submitting);
  }

  public handleListItemsUpdate(
    options: WhatsAppListItem[],
    submitting = false,
  ): boolean {
    return this.handleUpdate({ listItems: options }, submitting);
  }

  public handleListItemRemoval(item: WhatsAppListItem): boolean {
    return this.handleUpdate({ removeListItem: item });
  }

  public handleFlowDataUpdate(key: string, value: string): boolean {
    const flowData = { ...this.state.flowData.value };
    flowData[key] = value;

    const flowDataAttachmentNameMap = {
      ...this.state.flowDataAttachmentNameMap,
    };

    if (this.state.flowDataAttachmentNameMap[key] && !value) {
      delete flowDataAttachmentNameMap[key];
    }

    return this.handleUpdate({ flowData, flowDataAttachmentNameMap });
  }

  public handleFlowDataAttachmentNameUpdate(
    key: string,
    attachmentName: string,
  ): boolean {
    const flowDataAttachmentNameMap = {
      ...this.state.flowDataAttachmentNameMap,
    };
    flowDataAttachmentNameMap[key] = attachmentName;
    return this.handleUpdate({ flowDataAttachmentNameMap });
  }

  public handleButtonTextUpdate(buttonText: string): boolean {
    return this.handleUpdate({ buttonText });
  }
  public handleActionURLUpdate(actionURL: string): boolean {
    return this.handleUpdate({ actionURL });
  }

  public handleFlowScreenUpdate(flowScreen: string): boolean {
    return this.handleUpdate({ flowScreen });
  }

  public handleWhatsAppFlowUpdate(event: any[]) {
    const whatsAppFlow = event[0] as WhatsAppFlow;
    if (whatsAppFlow === this.state.whatsappFlow.value) {
      return false;
    }

    const newData = whatsAppFlow.assets.variables.reduce(
      (acc: FlowData, key: string) => {
        acc[key] = '';
        return acc;
      },
      {},
    );

    return this.handleUpdate({ whatsAppFlow, flowData: newData });
  }

  public handleOrderDetailsUpdate(orderDetails: WhatsAppOrderDetails): void {
    this.handleUpdate({ orderDetails });
  }

  public handleSave(): void {
    let valid = true;

    let currentCheck = this.handleMessageUpdate(
      this.state.message.value,
      null,
      true,
    );
    valid = valid && currentCheck;

    currentCheck = this.handleUpdate(
      { attachment: this.state.attachment.value },
      true,
    );
    valid = valid && currentCheck;

    currentCheck = this.handleListItemsUpdate(this.state.listItems.value, true);
    valid = valid && currentCheck;

    currentCheck = this.handleQuickRepliesUpdate(
      this.state.quickReplies.value,
      true,
    );
    valid = valid && currentCheck;

    if (
      this.state.interactionType.value.value === WhatsAppInteractionType.FLOW
    ) {
      currentCheck = this.handleUpdate(
        { whatsAppFlow: this.state.whatsappFlow.value },
        true,
      );
      valid = valid && currentCheck;

      currentCheck = this.handleUpdate(
        { flowScreen: this.state.flowScreen.value },
        true,
      );

      currentCheck = this.handleUpdate(
        { flowData: this.state.flowData.value },
        true,
      );
      valid = valid && currentCheck;

      currentCheck = this.handleUpdate(
        { buttonText: this.state.buttonText.value },
        true,
      );
      valid = valid && currentCheck;
    }

    if (
      this.state.interactionType.value.value ===
      WhatsAppInteractionType.ORDER_DETAILS
    ) {
      currentCheck = this.handleUpdate(
        { orderDetails: this.state.orderDetails.value },
        true,
      );
      valid = valid && currentCheck;
    }

    if (valid) {
      this.props.updateAction(
        stateToAction(this.props.nodeSettings, this.state),
      );
      this.props.onClose(false);
    }
  }

  public getButtons(): ButtonSet {
    return {
      primary: { name: i18n.t('buttons.confirm'), onClick: this.handleSave },
      tertiary: {
        name: i18n.t('buttons.cancel', 'Cancel'),
        onClick: () => this.props.onClose(true),
      },
    };
  }

  private canShowHeaderTypeSelect(
    interactionType: WhatsAppInteractionType,
  ): boolean {
    const allowedTypes: {
      [key in WhatsAppInteractionType]: boolean;
    } = {
      [WhatsAppInteractionType.LIST]: false,
      [WhatsAppInteractionType.REPLIES]: true,
      [WhatsAppInteractionType.LOCATION]: false,
      [WhatsAppInteractionType.CTA]: false,
      [WhatsAppInteractionType.FLOW]: false,
      [WhatsAppInteractionType.ORDER_DETAILS]: true,
    };
    return allowedTypes[interactionType];
  }

  private renderHeaderSection(): JSX.Element {
    const attachment = this.state.attachment.value;
    const headerType = this.state.headerType.value;
    const interactionType =
      this.state.interactionType.value &&
      this.state.interactionType.value.value;
    const hasUploadedAttachment =
      !!attachment && (attachment && attachment.uploaded);

    return renderIf(interactionType !== WhatsAppInteractionType.LOCATION)(
      <div className={styles.header}>
        {interactionType === WhatsAppInteractionType.FLOW ? (
          <div className={styles.disclaimer}>
            <UnnnicIcon icon="alert-circle-1-1" scheme="weni-600" />
            <span className={styles.disclaimer_text}>
              <Trans
                i18nKey="forms.disclaimer.title"
                values={{
                  highlight: i18n.t('forms.disclaimer.highlight'),
                }}
              >
                Now it is possible to &nbsp;<b>[[highlight]]</b>&nbsp; using
                WhatsApp Flows.
              </Trans>
            </span>
            <a
              className={styles.link}
              href="https://developers.facebook.com/docs/whatsapp/flows"
              target="_blank"
              rel="noreferrer"
            >
              {i18n.t('forms.disclaimer.link', 'Learn more.')}
            </a>
          </div>
        ) : null}

        {interactionType === WhatsAppInteractionType.FLOW && (
          <>
            <div>
              <span
                className={`u font secondary body-md color-neutral-cloudy mt-4`}
              >
                {i18n.t('forms.select_form.title', 'Select a Form')}
                <UnnnicTooltip
                  text={i18n.t(
                    'forms.flow_select_info',
                    `To edit and create existing forms, use Meta's native tool.`,
                  )}
                  side="top"
                  enabled={true}
                >
                  <UnnnicIcon icon="info" size="sm" filled={false} />
                </UnnnicTooltip>
              </span>
              <AssetSelector
                name={i18n.t('forms.form', 'form')}
                noOptionsMessage={i18n.t(
                  'forms.no_whatsapp_flow',
                  "You don't have any form",
                )}
                assets={this.props.assetStore.whatsapp_flows}
                entry={this.state.whatsappFlow}
                onChange={this.handleWhatsAppFlowUpdate}
                nameKey="name"
                valueKey="id"
                style={TembaSelectStyle.small}
                searchable
              />
            </div>
          </>
        )}

        <div className={styles.inputs}>
          {renderIf(this.canShowHeaderTypeSelect(interactionType))(
            <div className={styles.header_type}>
              <span className={`u font secondary body-md color-neutral-cloudy`}>
                {i18n.t('forms.header_optional', 'Header (optional)')}
              </span>
              <UnnnicSelectSmart
                v-model={[[headerType], this.handleHeaderTypeChange]}
                options={WHATSAPP_HEADER_TYPE_OPTIONS}
                size="sm"
                orderedByIndex={true}
                disabled={
                  interactionType === WhatsAppInteractionType.ORDER_DETAILS
                }
              />
            </div>,
          )}

          {renderIf(headerType.value === WhatsAppHeaderType.TEXT)(
            <div className={styles.header_text}>
              <TextInputElement
                name={
                  interactionType === WhatsAppInteractionType.REPLIES
                    ? i18n.t('forms.header_text', 'Header text')
                    : i18n.t('forms.header_optional', 'Header (optional)')
                }
                showLabel={true}
                entry={this.state.headerText}
                onChange={this.handleHeaderTextUpdate}
                placeholder={i18n.t('forms.header_text', 'Header text')}
                size={TextInputSizes.sm}
                autocomplete={true}
                maxLength={60}
              />
            </div>,
          )}

          {renderIf(headerType.value === WhatsAppHeaderType.MEDIA)(
            <>
              <div className={styles.attachment_url}>
                <TextInputElement
                  placeholder={i18n.t(
                    'forms.attachment_placeholder',
                    'Paste an URL or send a file',
                  )}
                  name={i18n.t('forms.attachment_optional', 'Media (optional)')}
                  size={TextInputSizes.sm}
                  onChange={this.handleAttachmentUrlChange}
                  entry={{
                    value:
                      attachment && !attachment.uploaded ? attachment.url : '',
                  }}
                  error={
                    this.state.attachment.validationFailures.length > 0
                      ? this.state.attachment.validationFailures[0].message
                      : null
                  }
                  autocomplete={true}
                  showLabel={true}
                  disabled={hasUploadedAttachment}
                />
              </div>

              {renderUploadButton(
                this.context.config.endpoints.attachments,
                this.handleAttachmentUploaded,
                hasUploadedAttachment,
              )}
            </>,
          )}
        </div>
        {attachment && attachment.uploaded && (
          <div className={styles.attachment}>
            {attachment.url.substring(attachment.url.lastIndexOf('/') + 1)}

            <div className={styles.remove}>
              <UnnnicIcon
                icon="close"
                size="sm"
                scheme="neutral-cloudy"
                clickable
                onClick={() => this.handleAttachmentRemoved()}
              />
            </div>
          </div>
        )}
      </div>,
    );
  }

  private renderInteractions(): JSX.Element {
    const interactionType =
      this.state.interactionType.value &&
      this.state.interactionType.value.value;
    const messageType = this.state.messageType.value.value;

    return (
      <div className={styles.interactions_tab}>
        {renderIf(
          messageType !== WhatsAppMessageType.SIMPLE &&
            interactionType !== WhatsAppInteractionType.LOCATION,
        )(
          <TextInputElement
            placeholder={i18n.t('forms.ex_footer', 'Ex: Footer')}
            name={i18n.t('forms.footer', 'Footer (optional)')}
            size={TextInputSizes.sm}
            onChange={this.handleFooterUpdate}
            entry={this.state.footer}
            autocomplete={true}
            showLabel={true}
          />,
        )}

        {interactionType === WhatsAppInteractionType.LIST && (
          <OptionsList
            options={this.state.listItems}
            onOptionsUpdated={this.handleListItemsUpdate}
            onOptionRemoval={this.handleListItemRemoval}
          />
        )}

        <div className={styles.buttons}>
          {(interactionType === WhatsAppInteractionType.LIST ||
            interactionType === WhatsAppInteractionType.FLOW) && (
            <div className={styles.action_button_text}>
              <span className={`u font secondary body-md color-neutral-cloudy`}>
                {interactionType === WhatsAppInteractionType.LIST ? (
                  i18n.t(
                    'forms.list_button_text_optional',
                    'Action Button Text (optional)',
                  )
                ) : (
                  <>
                    {i18n.t('forms.list_button_text', 'Action Button Text')}
                    <UnnnicTooltip
                      text={i18n.t(
                        'forms.list_button_text_tooltip',
                        `The flow will start from the interaction with this button.`,
                      )}
                      side="top"
                      enabled={true}
                    >
                      <UnnnicIcon icon="info" size="sm" filled={false} />
                    </UnnnicTooltip>
                  </>
                )}
              </span>
              <TextInputElement
                placeholder={i18n.t('forms.ex_menu', 'Ex: Menu')}
                name={i18n.t(
                  'forms.list_button_text_optional',
                  'Action Button Text (optional)',
                )}
                size={TextInputSizes.sm}
                onChange={this.handleButtonTextUpdate}
                entry={this.state.buttonText}
                autocomplete={true}
                maxLength={20}
              />
            </div>
          )}

          {interactionType === WhatsAppInteractionType.FLOW && (
            <div className={styles.screen}>
              <TextInputElement
                placeholder={i18n.t('forms.ex_register', 'Ex: REGISTER')}
                name={i18n.t(
                  'forms.start_screen',
                  'Start Flow from the screen:',
                )}
                size={TextInputSizes.sm}
                onChange={this.handleFlowScreenUpdate}
                entry={this.state.flowScreen}
                autocomplete={true}
                showLabel={true}
                maxLength={20}
              />
            </div>
          )}
        </div>

        {interactionType === WhatsAppInteractionType.REPLIES && (
          <QuickRepliesList
            quickReplies={this.state.quickReplies}
            onQuickRepliesUpdated={this.handleQuickRepliesUpdate}
          />
        )}
        {interactionType === WhatsAppInteractionType.CTA && (
          <div className={styles.cta_inputs}>
            <div className={styles.action_button_text}>
              <TextInputElement
                placeholder={i18n.t('forms.ex_menu', 'Ex: Menu')}
                name={i18n.t('forms.action_button_text')}
                size={TextInputSizes.sm}
                onChange={this.handleButtonTextUpdate}
                entry={this.state.buttonText}
                autocomplete={true}
                showLabel={true}
                maxLength={24}
              />
            </div>
            <div>
              <TextInputElement
                placeholder={i18n.t('forms.action_button_url_placeholder')}
                name={i18n.t('forms.action_button_url')}
                size={TextInputSizes.sm}
                onChange={this.handleActionURLUpdate}
                entry={this.state.actionURL}
                autocomplete={true}
                showLabel={true}
              />
            </div>
          </div>
        )}
        {interactionType === WhatsAppInteractionType.FLOW && (
          <>
            {renderIf(
              this.state.whatsappFlow.value &&
                this.state.whatsappFlow.value.assets.variables.length > 0,
            )(
              <WhatsAppFlowData
                attachmentsEndpoint={this.context.config.endpoints.attachments}
                data={this.state.flowData}
                attachmentNameMap={this.state.flowDataAttachmentNameMap}
                onValueUpdated={this.handleFlowDataUpdate}
                onAttachmentNameUpdated={
                  this.handleFlowDataAttachmentNameUpdate
                }
              />,
            )}
          </>
        )}

        {renderIf(interactionType === WhatsAppInteractionType.ORDER_DETAILS)(
          <OrderDetailsSection
            orderDetails={this.state.orderDetails}
            onUpdateOrderDetails={this.handleOrderDetailsUpdate}
          />,
        )}
      </div>
    );
  }

  public render(): JSX.Element {
    const typeConfig = this.props.typeConfig;

    return (
      <Dialog
        title={typeConfig.name}
        headerClass={typeConfig.type}
        buttons={this.getButtons()}
        new={typeConfig.new}
      >
        <TypeList
          nodeSettings={this.props.nodeSettings}
          __className=""
          initialType={typeConfig}
          onChange={this.props.onTypeChange}
        />
        <section className={styles.content}>
          <header className={styles.header}>
            {i18n.t(
              'whatsapp_msg.configure_your_message',
              'Configure your message',
            )}
          </header>
          <div className={styles.selectors}>
            <div>
              <span className={styles.label}>
                {i18n.t('forms.message_type', 'Message type')}
              </span>
              <UnnnicSelectSmart
                v-model={[
                  [this.state.messageType.value],
                  this.handleMessageTypeUpdate,
                ]}
                options={WHATSAPP_MESSAGE_TYPE_OPTIONS}
                size="sm"
                orderedByIndex={true}
              />
            </div>

            <div>
              <span className={styles.label}>
                {i18n.t('forms.interactions', 'Interactions')}
              </span>
              <UnnnicSelectSmart
                v-model={[
                  [this.state.interactionType.value],
                  this.handleInteractionTypeUpdate,
                ]}
                options={WHATSAPP_INTERACTION_TYPE_OPTIONS}
                size="sm"
                orderedByIndex={true}
                disabled={
                  this.state.messageType.value.value ===
                  WhatsAppMessageType.SIMPLE
                }
              />
            </div>
          </div>
          {this.renderHeaderSection()}
          <TextEditorElement
            name={i18n.t('forms.message', 'Message')}
            showLabel={true}
            onChange={this.handleMessageUpdate}
            entry={this.state.message}
            autocomplete={true}
            placeholder={i18n.t('forms.type_here', 'Type here...')}
            maxLength={
              this.state.messageType.value === WHATSAPP_MESSAGE_TYPE_SIMPLE
                ? 4096
                : 1024
            }
          />
          {renderIf(
            this.state.messageType.value.value ===
              WhatsAppMessageType.INTERACTIVE,
          )(this.renderInteractions())}
        </section>
      </Dialog>
    );
  }
}
