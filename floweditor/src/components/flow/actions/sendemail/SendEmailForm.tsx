import { react as bindCallbacks } from 'auto-bind';
import Dialog, { ButtonSet } from 'components/dialog/Dialog';
import { ActionFormProps } from 'components/flow/props';
import TextInputElement from 'components/form/textinput/TextInputElement';
import TypeList from 'components/nodeeditor/TypeList';
import * as React from 'react';
import {
  FormState,
  mergeForm,
  StringArrayEntry,
  StringEntry,
} from 'store/nodeEditor';
import { shouldRequireIf, validate } from 'store/validators';

import { initializeForm, stateToAction } from './helpers';
import styles from './SendEmailForm.module.scss';
import i18n from 'config/i18n';
import { renderIssues } from '../helpers';

// @ts-ignore
import Unnnic from '@weni/unnnic-system';
import { applyVueInReact } from 'veaury';

const EMAIL_PATTERN = /\S+@\S+\.\S+/;

export interface SendEmailFormState extends FormState {
  recipient: StringEntry;
  recipientError: string;
  recipients: StringArrayEntry;
  subject: StringEntry;
  body: StringEntry;
}

const UnnnicIcon = applyVueInReact(Unnnic.unnnicIcon);

export default class SendEmailForm extends React.Component<
  ActionFormProps,
  SendEmailFormState
> {
  constructor(props: ActionFormProps) {
    super(props);

    this.state = initializeForm(this.props.nodeSettings);

    bindCallbacks(this, {
      include: [/^on/, /^handle/],
    });
  }

  public onAddRecipient(): void {
    if (!this.handleCheckValid(this.state.recipient.value)) {
      this.setState({
        recipientError: i18n.t(
          'forms.email_recipient_prompt',
          'Enter email address',
        ),
      });
      return;
    }

    if (
      this.state.recipients.value.find(
        email => email === this.state.recipient.value,
      )
    ) {
      return;
    }

    this.setState({
      recipient: { value: '' },
      recipients: {
        value: [...this.state.recipients.value, this.state.recipient.value],
      },
    });
  }

  public onRemoveRecipient(indexToRemove: number): void {
    this.setState({
      recipients: {
        value: this.state.recipients.value.filter(
          (recipient, index) => index !== indexToRemove,
        ),
      },
    });
  }

  public handleRecipientsChanged(recipients: string[]): boolean {
    return this.handleUpdate({ recipients });
  }

  public handleSubjectChanged(subject: string): boolean {
    return this.handleUpdate({ subject });
  }

  public handleBodyChanged(body: string): boolean {
    return this.handleUpdate({ body });
  }

  private handleUpdate(
    keys: { recipients?: string[]; subject?: string; body?: string },
    submitting = false,
  ): boolean {
    const updates: Partial<SendEmailFormState> = {};

    if (keys.hasOwnProperty('recipients')) {
      updates.recipients = validate(
        i18n.t('forms.recipients', 'Recipients'),
        keys.recipients!,
        [shouldRequireIf(submitting)],
      );

      if (updates.recipients.validationFailures.length > 0) {
        this.setState({
          recipientError: updates.recipients.validationFailures[0].message,
        });
      }
    }

    if (keys.hasOwnProperty('subject')) {
      updates.subject = validate(
        i18n.t('forms.subject', 'Subject'),
        keys.subject!,
        [shouldRequireIf(submitting)],
      );
    }

    if (keys.hasOwnProperty('body')) {
      updates.body = validate(i18n.t('forms.body', 'Body'), keys.body!, [
        shouldRequireIf(submitting),
      ]);
    }

    const updated = mergeForm(this.state, updates);
    this.setState(updated);
    return updated.valid;
  }

  public handleSave(): void {
    const staged = (this.state.recipient.value || '').trim();
    const hasStaged = staged.length > 0 && this.handleCheckValid(staged);
    const isDuplicate = this.state.recipients.value.includes(staged);
    const nextRecipients =
      hasStaged && !isDuplicate
        ? [...this.state.recipients.value, staged]
        : this.state.recipients.value;

    const valid = this.handleUpdate(
      {
        recipients: nextRecipients,
        subject: this.state.subject.value,
        body: this.state.body.value,
      },
      true,
    );

    if (valid) {
      this.setState(
        {
          recipients: { value: nextRecipients },
          recipient: { value: '' },
        },
        () => {
          this.props.updateAction(
            stateToAction(this.props.nodeSettings, this.state),
          );
          this.props.onClose(false);
        },
      );
    }
  }

  public getButtons(): ButtonSet {
    return {
      primary: { name: i18n.t('buttons.confirm'), onClick: this.handleSave },
      secondary: {
        name: i18n.t('buttons.cancel', 'Cancel'),
        onClick: () => this.props.onClose(true),
      },
    };
  }

  public handleCheckValid(value: string): boolean {
    const v = (value || '').trim();
    return EMAIL_PATTERN.test(v) || v.startsWith('@');
  }

  public render(): JSX.Element {
    const typeConfig = this.props.typeConfig;
    return (
      <Dialog
        title={typeConfig.name}
        headerClass={typeConfig.type}
        buttons={this.getButtons()}
      >
        <TypeList
          __className=""
          initialType={typeConfig}
          onChange={this.props.onTypeChange}
          nodeSettings={this.props.nodeSettings}
        />
        <div className={styles.ele}>
          <TextInputElement
            __className={styles.subject}
            name={i18n.t('forms.email_recipient_name', 'Recipient')}
            placeholder={i18n.t(
              'forms.email_recipient_placeholder',
              'Add Email and press Enter',
            )}
            onChange={value => this.setState({ recipient: { value } })}
            iconRight="keyboard-return-1"
            entry={this.state.recipient}
            showLabel
            onKeyDown={() =>
              this.setState({
                recipientError: undefined,
              })
            }
            onKeyPressEnter={this.onAddRecipient}
            error={this.state.recipientError}
          />

          {this.state.recipients.value.length ? (
            <div className={styles.pills}>
              {this.state.recipients.value.map((recipient, index) => (
                <div
                  key={index}
                  className={`${styles.pill} u font secondary body-md color-neutral-darkest`}
                >
                  {recipient}
                  <UnnnicIcon
                    data-testid={`remove-recipient-${index}`}
                    icon="close-1"
                    size="xs"
                    scheme="neutral-darkest"
                    clickable
                    onClick={() => this.onRemoveRecipient(index)}
                  />
                </div>
              ))}
            </div>
          ) : null}

          <div>
            <TextInputElement
              name={i18n.t('forms.subject', 'Subject')}
              placeholder={i18n.t('forms.subject_placeholder')}
              onChange={this.handleSubjectChanged}
              entry={this.state.subject}
              autocomplete={true}
              showLabel
            />
          </div>
          <div>
            <TextInputElement
              name={i18n.t('forms.email_message', 'E-mail text')}
              placeholder={i18n.t('forms.type_here', 'Type Here...')}
              showLabel={true}
              onChange={this.handleBodyChanged}
              entry={this.state.body}
              autocomplete={true}
              textarea={true}
            />
          </div>
        </div>
        {renderIssues(this.props)}
      </Dialog>
    );
  }
}
