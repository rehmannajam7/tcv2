import { react as bindCallbacks } from 'auto-bind';
import TextInputElement from 'components/form/textinput/TextInputElement';
import * as React from 'react';
import { FormState, StringEntry } from 'store/nodeEditor';
import { applyVueInReact } from 'veaury';

// @ts-ignore
import Unnnic from '@weni/unnnic-system';

import styles from './OptionalTextInput.module.scss';
import i18n from '../../../config/i18n';

const UnnnicIcon = applyVueInReact(Unnnic.unnnicIcon);

export interface OptionalTextInputProps {
  name: string;
  value: StringEntry;
  toggleText: string;
  onChange(value: string): void;
  helpText?: string | JSX.Element;
  maxLength?: number;
}

export interface OptionalTextInputState extends FormState {
  editing: boolean;
  showToggle: boolean;
}

/**
 * OptionalText is a hideable text box
 */
export default class OptionalTextInput extends React.Component<
  OptionalTextInputProps,
  OptionalTextInputState
> {
  constructor(props: OptionalTextInputProps) {
    super(props);
    bindCallbacks(this, {
      include: [/^handle/],
    });

    this.state = {
      showToggle: !(this.props.value.value.trim().length > 0),
      editing: this.props.value.value.trim().length > 0,
      valid: true,
    };
  }

  private handleTextChanged(text: string): void {
    this.props.onChange(text);
  }

  private handleEditingChanged(): void {
    this.setState({ editing: !this.state.editing });
  }

  public render(): JSX.Element {
    return (
      <div
        className={`${styles.optional_text_input} ${
          this.state.showToggle ? styles.toggle : ''
        }`}
      >
        {this.state.showToggle ? (
          <span
            data-testid="toggle-link"
            data-spec="toggle-link"
            className={`${styles.toggle_link} ${
              this.state.editing ? styles.expanded : ''
            }`}
            onClick={this.handleEditingChanged}
          >
            {this.props.toggleText}
            <UnnnicIcon
              icon={
                this.state.editing
                  ? 'arrow-button-down-1'
                  : 'arrow-button-right-1'
              }
              size="xs"
              scheme="neutral-cleanest"
            />
          </span>
        ) : null}

        {this.state.editing ? (
          <TextInputElement
            data-testid="optional-field"
            data-spec="optional-field"
            name={this.props.name}
            showLabel={true}
            entry={this.props.value}
            onChange={this.handleTextChanged}
            helpText={this.props.helpText}
            maxLength={this.props.maxLength}
            placeholder={i18n.t('form.result', 'Result')}
          />
        ) : null}
      </div>
    );
  }
}
