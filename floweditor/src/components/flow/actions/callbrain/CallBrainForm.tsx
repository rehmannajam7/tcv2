import Dialog, { ButtonSet } from 'components/dialog/Dialog';
import { react as bindCallbacks } from 'auto-bind';
import { ActionFormProps } from 'components/flow/props';
import { connect } from 'react-redux';

import TypeList from 'components/nodeeditor/TypeList';
import * as React from 'react';

import styles from './CallBrainForm.module.scss';
import i18n from 'config/i18n';
import AppState from 'store/state';
import { updateBrainAction, initializeForm } from './helpers';
import { BrainInfo } from '../../../../store/flowContext';

import { applyVueInReact } from 'veaury';
// @ts-ignore
import Unnnic from '@weni/unnnic-system';
import TextInputElement, {
  TextInputSizes,
} from 'components/form/textinput/TextInputElement';
import { StringEntry } from 'store/nodeEditor';
const UnnnicIcon = applyVueInReact(Unnnic.unnnicIcon);

export interface CallBrainFormProps extends ActionFormProps {
  brainInfo: BrainInfo;
}

export interface CallBrainFormState {
  entry: StringEntry;
}

export interface CallBrainFormData
  extends CallBrainFormProps,
    CallBrainFormState {}

export class BrainForm extends React.Component<
  CallBrainFormProps,
  CallBrainFormState
> {
  constructor(props: CallBrainFormProps) {
    super(props);
    this.state = initializeForm(this.props.nodeSettings);
    bindCallbacks(this, {
      include: [/^handle/, /^on/],
    });
  }
  private handleSave(): void {
    const brainData: CallBrainFormData = {
      ...this.props,
      entry: this.state.entry,
    };
    this.props.updateAction(
      updateBrainAction(this.props.nodeSettings, brainData),
    );
    this.props.onClose(false);
  }

  private getButtons(): ButtonSet {
    return {
      primary: {
        name: i18n.t('buttons.save'),
        onClick: () => this.handleSave(),
      },
      secondary: {
        name: i18n.t('buttons.cancel', 'Cancel'),
        onClick: () => this.props.onClose(true),
      },
    };
  }

  private handleEntryChange(value: string) {
    this.setState({ entry: { value } });
  }

  private renderEdit(): JSX.Element {
    const typeConfig = this.props.typeConfig;
    const isDisabled = !this.props.brainInfo.enabled;

    return (
      <Dialog
        title={typeConfig.name}
        headerClass={typeConfig.type}
        buttons={this.getButtons()}
        className={styles.dialog}
      >
        <TypeList
          __className=""
          initialType={typeConfig}
          onChange={this.props.onTypeChange}
          nodeSettings={this.props.nodeSettings}
        />
        {isDisabled && (
          <div className={styles.warning}>
            <UnnnicIcon
              icon="alert-circle-1"
              size="sm"
              scheme={'feedback-yellow'}
              className={styles.warning_icon}
            />
            <span className={styles.warning_text}>
              Brain functionality is temporarily disabled. This action will not
              execute until the Brain API is restored.
            </span>
          </div>
        )}
        <div
          className={`${styles.content} ${isDisabled ? styles.disabled : ''}`}
        >
          <UnnnicIcon
            icon="hub"
            size="sm"
            scheme={isDisabled ? 'neutral-soft' : 'neutral-cloudy'}
            className={styles.icon}
          />
          <span className={styles.text}>
            {this.props.brainInfo.enabled
              ? `${this.props.brainInfo.name} - ${this.props.brainInfo.occupation}`
              : `${this.props.brainInfo.name} (${this.props.brainInfo.occupation})`}
          </span>
        </div>
        <div className={styles.entry}>
          <span>
            {i18n.t(
              'forms.brain.entry',
              `Enter an expression to use as input in the Brain. To use the contact's last response, use @input.text.`,
            )}
          </span>
          <TextInputElement
            name={'entry'}
            onChange={this.handleEntryChange}
            entry={this.state.entry}
            size={TextInputSizes.sm}
            autocomplete
            disabled={isDisabled}
            expressionsData={this.props.assetStore?.completion?.items as any}
          />
        </div>
      </Dialog>
    );
  }

  public render(): JSX.Element {
    return this.renderEdit();
  }
}

/* istanbul ignore next -- @preserve */
const mapStateToProps = ({ flowContext: { brainInfo }, flowContext: { assetStore } }: AppState) => {
  return {
    brainInfo,
    assetStore,
  };
};

export default connect(mapStateToProps)(BrainForm);
