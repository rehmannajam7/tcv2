/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { react as bindCallbacks } from 'auto-bind';
import Dialog, { ButtonSet } from 'components/dialog/Dialog';
import styles from 'components/flow/actions/action/Action.module.scss';
import { determineTypeConfig } from 'components/flow/helpers';
import { LocalizationFormProps } from 'components/flow/props';
import TextInputElement from 'components/form/textinput/TextInputElement';
import { fakePropType } from 'config/ConfigProvider';
import * as React from 'react';
import { FormState, mergeForm, StringEntry } from 'store/nodeEditor';
import { validate } from 'store/validators';

import { initializeWeniGPTLocalizedForm } from '../localization/helpers';
import i18n from 'config/i18n';
import { renderIssues } from '../helpers';
import { CallWeniGPT } from '../../../../flowTypes';

export interface WeniGPTLocalizationFormState extends FormState {
  expression: StringEntry;
}

export default class WeniGPTLocalizationForm extends React.Component<
  LocalizationFormProps,
  WeniGPTLocalizationFormState
> {
  constructor(props: LocalizationFormProps) {
    super(props);
    this.state = initializeWeniGPTLocalizedForm(this.props.nodeSettings);
    bindCallbacks(this, {
      include: [/^handle/, /^on/],
    });
  }

  public static contextTypes = {
    config: fakePropType,
  };

  private getAction(): CallWeniGPT {
    const nodeActions = this.props.nodeSettings.originalNode.node.actions;
    return nodeActions[nodeActions.length - 1] as CallWeniGPT;
  }

  public handleExpressionUpdate(input: string): boolean {
    return this.handleUpdate({ input });
  }

  private handleUpdate(keys: { input?: string }): boolean {
    const updates: Partial<WeniGPTLocalizationFormState> = {};

    if (keys.hasOwnProperty('input')) {
      updates.expression = validate(
        i18n.t('forms.message', 'Expression'),
        keys.input,
        [],
      );
    }

    const updated = mergeForm(this.state, updates);
    this.setState(updated);

    return updated.valid;
  }

  private handleSave(): void {
    const { expression: input } = this.state;

    const translations: any = {};
    if (input.value) {
      translations.input = input.value;
    }

    const localizations = [
      {
        uuid: this.getAction().uuid,
        translations,
      },
    ];

    this.props.updateLocalizations(this.props.language.id, localizations);

    this.props.onClose(false);
  }

  private getButtons(): ButtonSet {
    return {
      primary: { name: i18n.t('buttons.ok', 'Ok'), onClick: this.handleSave },
      secondary: {
        name: i18n.t('buttons.cancel', 'Cancel'),
        onClick: () => this.props.onClose(true),
      },
    };
  }

  public render(): JSX.Element {
    const typeConfig = determineTypeConfig(this.props.nodeSettings);
    const translation = i18n.t('forms.translation', 'Translation');
    const action = this.getAction();

    return (
      <Dialog
        title={typeConfig.name}
        headerClass={typeConfig.type}
        buttons={this.getButtons()}
      >
        <div data-spec="translation-container">
          <div data-spec="text-to-translate" className={styles.translate_from}>
            {action.input}
          </div>
        </div>

        <TextInputElement
          name={i18n.t('forms.message', 'Message')}
          showLabel={false}
          onChange={this.handleExpressionUpdate}
          entry={this.state.expression}
          placeholder={`${this.props.language.name} ${translation}`}
          autocomplete={true}
          focus={true}
          textarea={true}
        />

        {renderIssues(this.props)}
      </Dialog>
    );
  }
}
