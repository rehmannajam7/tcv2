/* eslint-disable @typescript-eslint/explicit-member-accessibility */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { react as bindCallbacks } from 'auto-bind';
import { AxiosResponse } from 'axios';
import Dialog, { ButtonSet, Tab } from 'components/dialog/Dialog';
import { hasErrors, renderIssues } from 'components/flow/actions/helpers';
import {
  initializeForm as stateToForm,
  stateToAction,
  TOPIC_OPTIONS,
  INSTAGRAM_RESPONSE_TYPES,
  TAG_OPTIONS,
} from 'components/flow/actions/sendmsg/helpers';
import { ActionFormProps } from 'components/flow/props';
import AssetSelector from 'components/form/assetselector/AssetSelector';
import { hasUseableTranslation } from 'components/form/assetselector/helpers';
import SwitchElement, {
  SwitchSizes,
} from 'components/form/switch/SwitchElement';
import MultiChoiceInput from 'components/form/multichoice/MultiChoice';
import SelectElement, {
  SelectOption,
} from 'components/form/select/SelectElement';
import TextInputElement from 'components/form/textinput/TextInputElement';
import TypeList from 'components/nodeeditor/TypeList';
import { fakePropType } from 'config/ConfigProvider';
import { fetchAsset } from 'external';
import { Template, TemplateTranslation } from 'flowTypes';
import mutate from 'immutability-helper';
import * as React from 'react';
import { connect } from 'react-redux';
import { AppState } from 'store';
import { Asset } from 'store/flowContext';
import {
  FormState,
  mergeForm,
  StringArrayEntry,
  StringEntry,
  SelectOptionEntry,
  FormEntry,
} from 'store/nodeEditor';
import {
  MaxOfTenItems,
  Required,
  shouldRequireIf,
  validate,
} from 'store/validators';
import { range } from 'utils';

import styles from './SendMsgForm.module.scss';
import { hasFeature } from 'config/typeConfigs';
import { FeatureFilter } from 'config/interfaces';

import i18n from 'config/i18n';
import { Trans } from 'react-i18next';
import { Attachment, renderAttachments } from './attachments';

import { applyPureVueInReact } from 'veaury';
// @ts-ignore
import Unnnic from '@weni/unnnic-system';

const UnnnicIcon = applyPureVueInReact(Unnnic.unnnicIcon);

export interface SendMsgFormState extends FormState {
  message: StringEntry;
  quickReplies: StringArrayEntry;
  quickReplyEntry: StringEntry;
  sendAll: boolean;
  attachments: Attachment[];
  template: FormEntry;
  topic: SelectOptionEntry;
  templateVariables: StringEntry[];
  templateTranslation?: TemplateTranslation;
  instagramResponseType: SelectOptionEntry;
  commentId: StringEntry;
  tag: SelectOptionEntry;
}

export default class SendMsgForm extends React.Component<
  ActionFormProps,
  SendMsgFormState
> {
  private filePicker: any;

  constructor(props: ActionFormProps) {
    super(props);
    this.state = stateToForm(this.props.nodeSettings, this.props.assetStore);

    bindCallbacks(this, {
      include: [/^handle/, /^on/],
    });

    // initialize our templates if we have them
    if (this.state.template.value !== null) {
      fetchAsset(
        this.props.assetStore.templates,
        this.state.template.value.uuid,
      ).then((asset: Asset) => {
        if (asset !== null) {
          this.handleTemplateChanged([
            { ...this.state.template.value, ...asset.content },
          ]);
        }
      });
    }
  }

  public static contextTypes = {
    config: fakePropType,
  };

  private handleUpdate(
    keys: {
      text?: string;
      sendAll?: boolean;
      quickReplies?: string[];
    },
    submitting = false,
  ): boolean {
    const updates: Partial<SendMsgFormState> = {};
    if (keys.hasOwnProperty('text')) {
      updates.message = validate(
        i18n.t('forms.message', 'Message'),
        keys.text,
        [shouldRequireIf(submitting)],
      );
    }

    if (keys.hasOwnProperty('sendAll')) {
      updates.sendAll = keys.sendAll;
    }

    if (keys.hasOwnProperty('quickReplies')) {
      updates.quickReplies = validate(
        i18n.t('forms.quick_replies', 'Quick Replies'),
        keys.quickReplies,
        [MaxOfTenItems],
      );
    }

    const updated = mergeForm(this.state, updates) as SendMsgFormState;

    this.setState(updated);
    return updated.valid;
  }

  public handleMessageInput(event: React.KeyboardEvent) {
    return this.handleUpdate({ text: (event.target as any).value }, false);
  }

  public handleMessageUpdate(
    message: string,
    name: string,
    submitting = false,
  ): boolean {
    return this.handleUpdate({ text: message }, submitting);
  }

  public handleQuickRepliesUpdate(quickReplies: string[]): boolean {
    return this.handleUpdate({ quickReplies });
  }

  public handleSendAllUpdate(sendAll: boolean): boolean {
    return this.handleUpdate({ sendAll });
  }

  private handleSave(): void {
    // don't continue if our message already has errors
    if (hasErrors(this.state.message)) {
      return;
    }

    // make sure we validate untouched text fields and contact fields
    let valid = this.handleMessageUpdate(this.state.message.value, null, true);

    let templateVariables = this.state.templateVariables;
    // make sure we don't have untouched template variables
    this.state.templateVariables.forEach(
      (variable: StringEntry, num: number) => {
        const updated = validate(`Variable ${num + 1}`, variable.value, [
          Required,
        ]);
        templateVariables = mutate(templateVariables, {
          [num]: { $merge: updated },
        }) as StringEntry[];
        valid = valid && !hasErrors(updated);
      },
    );

    valid = valid && !hasErrors(this.state.quickReplyEntry);

    // Validate Instagram-specific fields based on response type
    if (this.state.instagramResponseType.value) {
      const responseType = this.state.instagramResponseType.value.value;

      // Map response types to their validation configuration
      const validationConfig: {
        [key: string]: {
          field: string;
          label: string;
          stateKey: keyof SendMsgFormState;
          value: any;
        };
      } = {
        tag: {
          field: 'tag',
          label: i18n.t('forms.tags', 'Tags'),
          stateKey: 'tag',
          value: this.state.tag.value,
        },
        dm_comment: {
          field: 'comment_id',
          label: i18n.t('forms.comment_id', 'Comment ID'),
          stateKey: 'commentId',
          value: this.state.commentId.value,
        },
        comment: {
          field: 'comment_id',
          label: i18n.t('forms.comment_id', 'Comment ID'),
          stateKey: 'commentId',
          value: this.state.commentId.value,
        },
      };

      // Only validate if we have a config for this response type
      if (responseType !== 'none' && validationConfig[responseType]) {
        const config = validationConfig[responseType];
        const validatedEntry = validate(config.label, config.value, [Required]);

        // Update state for the validated field
        const stateUpdate = {} as any;
        stateUpdate[config.stateKey] = validatedEntry;
        this.setState(stateUpdate);

        // Check if validation passed
        valid = valid && !hasErrors(validatedEntry);
      }
    }

    if (valid) {
      this.props.updateAction(
        stateToAction(this.props.nodeSettings, this.state),
      );
      // notify our modal we are done
      this.props.onClose(false);
    } else {
      this.setState({ templateVariables, valid });
    }
  }

  private getButtons(): ButtonSet {
    return {
      primary: { name: i18n.t('buttons.confirm'), onClick: this.handleSave },
      tertiary: {
        name: i18n.t('buttons.cancel', 'Cancel'),
        onClick: () => this.props.onClose(true),
      },
    };
  }

  private handleTemplateChanged(selected: any[]): void {
    const template = selected ? selected[0] : null;

    if (!template) {
      this.setState({
        template: { value: null },
        templateTranslation: null,
        templateVariables: [],
      });
    } else {
      const templateTranslation = template.translations[0];

      const templateVariables =
        this.state.templateVariables.length === 0 ||
        (this.state.template.value &&
          this.state.template.value.uuid !== template.uuid)
          ? range(0, templateTranslation.variable_count).map(() => {
              return {
                value: '',
              };
            })
          : this.state.templateVariables;

      this.setState({
        template: { value: template },
        templateTranslation,
        templateVariables,
      });
    }
  }

  private handleTemplateVariableChanged(
    updatedText: string,
    num: number,
  ): void {
    const entry = validate(`Variable ${num + 1}`, updatedText, [Required]);
    const templateVariables = mutate(this.state.templateVariables, {
      $merge: { [num]: entry },
    }) as StringEntry[];
    this.setState({ templateVariables });
  }

  private handleShouldExcludeTemplate(template: any): boolean {
    return !hasUseableTranslation(template as Template);
  }

  private renderTopicConfig(): JSX.Element {
    return (
      <>
        <p>
          {i18n.t(
            'forms.send_msg_facebook_warning',
            'Sending bulk messages over a Facebook channel requires that a topic be specified if the user has not sent a message in the last 24 hours. Setting a topic to use over Facebook is especially important for the first message in your flow.',
          )}
        </p>
        <SelectElement
          key={'fb_method_select'}
          name={i18n.t('forms.method', 'Method')}
          entry={this.state.topic}
          onChange={this.handleTopicUpdate}
          options={TOPIC_OPTIONS}
          placeholder={i18n.t(
            'forms.send_msg_facebook_topic_placeholder',
            'Select a topic to use over Facebook',
          )}
          clearable={true}
        />
      </>
    );
  }

  private handleTopicUpdate(topic: SelectOption) {
    this.setState({ topic: { value: topic } });
  }

  private handleInstagramResponseTypeChanged(selected: SelectOption): void {
    // If "None" is selected, clear all Instagram-related values
    if (selected && selected.value === 'none') {
      this.setState({
        instagramResponseType: { value: null },
        commentId: { value: '' },
        tag: { value: null },
      });
      return;
    }

    this.setState({
      instagramResponseType: { value: selected },
    });
  }

  private handleCommentIdChanged(value: string): void {
    const entry = validate(i18n.t('forms.comment_id', 'Comment ID'), value, [
      Required,
    ]);
    this.setState({ commentId: entry });
  }

  private handleTagSelectionChanged(selected: SelectOption): void {
    const entry = validate(i18n.t('forms.tags', 'Tags'), selected, [Required]);

    this.setState({
      tag: entry,
    });
  }

  private renderResponseTypeContent(responseType: string): JSX.Element {
    // Define a type for the configuration
    type ConfigItem = {
      description: string;
      fieldLabel: string;
      inputType: string;
      placeholder?: string;
    };

    type ConfigMap = {
      [key: string]: ConfigItem;
    };

    // Common configuration for each response type
    const config: ConfigMap = {
      tag: {
        description: i18n.t(
          'forms.instagram.descriptions.tag',
          'The allows you to send a message after the 24 hours window',
        ),
        fieldLabel: i18n.t('forms.select_tags', 'Select the tags'),
        inputType: 'select',
      },
      dm_comment: {
        description: i18n.t(
          'forms.instagram.descriptions.dm_comment',
          'When a comment is made on a post, this action allows replying in a direct message (DM) to the user who made the comment, keeping the interaction private.',
        ),
        fieldLabel: i18n.t('forms.comment_id', 'Comment ID'),
        inputType: 'text',
        placeholder: 'E.g., 17948912345678901',
      },
      comment: {
        description: i18n.t(
          'forms.instagram.descriptions.comment',
          "When a comment is made on a post, this action allows replying directly within the post's comment section, keeping the interaction public.",
        ),
        fieldLabel: i18n.t('forms.comment_id', 'Comment ID'),
        inputType: 'text',
        placeholder: 'E.g., 17948912345678901',
      },
    };

    // If response type doesn't match any known type, return null
    if (!responseType || !config[responseType]) {
      return null;
    }

    const instagramTypeConfig = config[responseType];

    return (
      <>
        <div className={styles.disclaimer}>
          <UnnnicIcon icon="alert-circle-1-1" scheme="feedback-blue" />
          <p className={styles.disclaimer_text}>
            {instagramTypeConfig.description}
          </p>
        </div>

        {instagramTypeConfig.inputType === 'select' ? (
          <SelectElement
            name={i18n.t('forms.tags', 'Tags')}
            entry={this.state.tag}
            onChange={this.handleTagSelectionChanged}
            options={TAG_OPTIONS}
            placeholder={i18n.t('forms.select_tag', 'Select a tag')}
            clearable={false}
            showLabel={true}
          />
        ) : (
          <TextInputElement
            name={instagramTypeConfig.fieldLabel}
            showLabel={true}
            onChange={this.handleCommentIdChanged}
            entry={this.state.commentId}
            placeholder={instagramTypeConfig.placeholder}
          />
        )}
      </>
    );
  }

  private renderInstagramConfig(): JSX.Element {
    const responseType = this.state.instagramResponseType.value
      ? this.state.instagramResponseType.value.value
      : null;

    return (
      <>
        <SelectElement
          key="instagram_response_type"
          name={i18n.t('forms.response_type', 'Choose a response Type')}
          entry={this.state.instagramResponseType}
          onChange={this.handleInstagramResponseTypeChanged}
          options={INSTAGRAM_RESPONSE_TYPES}
          placeholder={i18n.t(
            'forms.select_response_type',
            'Select a response type',
          )}
          showLabel={true}
        />

        {responseType &&
          responseType !== 'none' &&
          this.renderResponseTypeContent(responseType)}
      </>
    );
  }

  private renderTemplateConfig(): JSX.Element {
    return (
      <>
        <p>
          {i18n.t(
            'forms.whatsapp_warning',
            'Sending messages over a WhatsApp channel requires that a template be used if you have not received a message from a contact in the last 24 hours. Setting a template to use over WhatsApp is especially important for the first message in your flow.',
          )}
        </p>
        <AssetSelector
          name={i18n.t('forms.template', 'template')}
          noOptionsMessage="No templates found"
          assets={this.props.assetStore.templates}
          entry={this.state.template}
          onChange={this.handleTemplateChanged}
          shouldExclude={this.handleShouldExcludeTemplate}
          searchable={true}
          formClearable={true}
        />
        {this.state.templateTranslation ? (
          <>
            <div className={styles.template_text}>
              {this.state.templateTranslation.content}
            </div>
            {range(0, this.state.templateTranslation.variable_count).map(
              (num: number) => {
                return (
                  <div className={styles.variable} key={'tr_arg_' + num}>
                    <TextInputElement
                      name={`${i18n.t('forms.variable', 'Variable')} ${num +
                        1}`}
                      showLabel={false}
                      placeholder={`${i18n.t(
                        'forms.variable',
                        'Variable',
                      )} ${num + 1}`}
                      onChange={(updatedText: string) => {
                        this.handleTemplateVariableChanged(updatedText, num);
                      }}
                      entry={this.state.templateVariables[num]}
                      autocomplete={true}
                      expressionsData={this.props.assetStore?.completion?.items as any}
                    />
                  </div>
                );
              },
            )}
          </>
        ) : null}
      </>
    );
  }

  private handleAttachmentUploaded(response: AxiosResponse) {
    const attachments: any = mutate(this.state.attachments, {
      $push: [
        { type: response.data.type, url: response.data.url, uploaded: true },
      ],
    });
    this.setState({ attachments });
  }

  private handleAttachmentChanged(index: number, type: string, url: string) {
    let attachments: any = this.state.attachments;
    if (index === -1) {
      attachments = mutate(attachments, {
        $push: [{ type, url }],
      });
    } else {
      attachments = mutate(attachments, {
        [index]: {
          $set: { type, url },
        },
      });
    }

    this.setState({ attachments });
  }

  private handleAttachmentRemoved(index: number) {
    const attachments: any = mutate(this.state.attachments, {
      $splice: [[index, 1]],
    });
    this.setState({ attachments });
  }

  private instagramErrors(): boolean {
    if (!this.state.instagramResponseType.value) {
      return false;
    }

    const responseType = this.state.instagramResponseType.value.value;

    // Map response types to their state fields to check for errors
    const validationMap: { [key: string]: keyof SendMsgFormState } = {
      tag: 'tag',
      dm_comment: 'commentId',
      comment: 'commentId',
    };

    if (responseType !== 'none' && validationMap[responseType]) {
      const fieldToCheck = validationMap[responseType];
      return hasErrors(this.state[fieldToCheck] as any);
    }

    return false;
  }

  public render(): JSX.Element {
    const typeConfig = this.props.typeConfig;

    const quickReplies: Tab = {
      name: i18n.t('forms.quick_replies'),
      body: (
        <>
          <div
            className={`${styles.quick_reply_summary} u font secondary body-md color-neutral-cloudy`}
          >
            {i18n.t(
              'forms.quick_replies_summary',
              'Quick Replies are made into buttons for supported channels. For example, when asking a question, you might add a Quick Reply for "Yes" and one for "No".',
            )}
            <br />
            <br />
            {i18n.t(
              'forms.quick_replies_limit',
              'You can add up to 10 Quick Replies.',
            )}
          </div>

          <MultiChoiceInput
            name={i18n.t(
              'forms.add_quick_reply',
              'Add a new Quick Reply and press enter',
            )}
            helpText={<Trans i18nKey="forms.quick_replies" />}
            items={this.state.quickReplies}
            entry={this.state.quickReplyEntry}
            onChange={this.handleQuickRepliesUpdate}
          />
        </>
      ),
      checked: this.state.quickReplies.value.length > 0,
      hasErrors: hasErrors(this.state.quickReplyEntry),
    };

    const attachments: Tab = {
      name: i18n.t('forms.attachments', 'Attachments'),
      body: renderAttachments(
        this.context.config.endpoints.attachments,
        this.state.attachments,
        this.handleAttachmentUploaded,
        this.handleAttachmentChanged,
        this.handleAttachmentRemoved,
      ),
      checked: this.state.attachments.length > 0,
    };

    const advanced: Tab = {
      name: i18n.t('forms.advanced', 'Advanced'),
      body: (
        <>
          <div
            className={`u font secondary body-md color-neutral-cloudy ${styles.title}`}
          >
            {i18n.t(
              'forms.all_destinations_title',
              'Send a message to all destinations known for this contact.',
            )}
          </div>

          <SwitchElement
            name={i18n.t(
              'forms.all_destinations',
              'Send a message to all destinations',
            )}
            title={i18n.t(
              'forms.all_destinations',
              'Send a message to all destinations',
            )}
            checked={this.state.sendAll}
            description={i18n.t(
              'forms.all_destinations_description',
              "If you aren't sure what this means, leave it unchecked.",
            )}
            onChange={this.handleSendAllUpdate}
            size={SwitchSizes.small}
          />
        </>
      ),
      checked: this.state.sendAll,
    };

    const tabs = [quickReplies, attachments, advanced];

    if (hasFeature(this.context.config, FeatureFilter.HAS_INSTAGRAM)) {
      const templates: Tab = {
        name: 'Instagram',
        body: this.renderInstagramConfig(),
        checked: this.state.instagramResponseType.value !== null,
        hasErrors: this.instagramErrors(),
      };
      tabs.splice(0, 0, templates);
    }

    if (hasFeature(this.context.config, FeatureFilter.HAS_WHATSAPP)) {
      const templates: Tab = {
        name: 'WhatsApp',
        body: this.renderTemplateConfig(),
        checked: this.state.template.value != null,
        hasErrors: !!this.state.templateVariables.find((entry: StringEntry) =>
          hasErrors(entry),
        ),
      };
      tabs.splice(0, 0, templates);
    }

    if (hasFeature(this.context.config, FeatureFilter.HAS_FACEBOOK)) {
      const templates: Tab = {
        name: 'Facebook',
        body: this.renderTopicConfig(),
        checked: this.state.topic.value != null,
      };
      tabs.splice(0, 0, templates);
    }

    return (
      <Dialog
        title={typeConfig.name}
        headerClass={typeConfig.type}
        buttons={this.getButtons()}
        tabs={tabs}
      >
        <TypeList
          __className=""
          initialType={typeConfig}
          onChange={this.props.onTypeChange}
          nodeSettings={this.props.nodeSettings}
        />
        <TextInputElement
          name={i18n.t('forms.message', 'Message')}
          showLabel={true}
          counter="sms"
          onChange={this.handleMessageUpdate}
          entry={this.state.message}
          autocomplete={true}
          focus={true}
          textarea={true}
          placeholder={i18n.t('forms.type_here', 'Type here...')}
          expressionsData={this.props.assetStore?.completion?.items as any}
        />
        {renderIssues(this.props)}
      </Dialog>
    );
  }
}
