import { react as bindCallbacks } from 'auto-bind';
import { FormElementProps } from 'components/form/FormElement';
import * as React from 'react';
import { StringEntry } from 'store/nodeEditor';
import { applyVueInReact } from 'veaury';

// @ts-ignore
import Unnnic from '@weni/unnnic-system';

import styles from './TextEditorElement.module.scss';
import TembaCompletion from '../../../temba/TembaCompletion';
import TextEditorActions from './TextEditorActions';

const UnnnicTextArea = applyVueInReact(Unnnic.unnnicTextArea);

export enum TextEditorSizes {
  sm = 'sm',
  md = 'md',
}

export interface TextEditorProps extends FormElementProps {
  entry?: StringEntry;
  __className?: string;
  placeholder?: string;
  autocomplete?: boolean;
  maxLength?: number;
  disabled?: boolean;
  size?: TextEditorSizes;
  onChange?: (value: string, name?: string) => void;
}

export default class TextEditorElement extends React.Component<
  TextEditorProps
> {
  private refTextEditor: HTMLElement;

  constructor(props: TextEditorProps) {
    super(props);

    bindCallbacks(this, {
      include: [/^handle/],
    });
  }

  public handleChange(value: string): void {
    if (this.props.onChange) {
      this.props.onChange(value, this.props.name);
    }
  }

  private getTextAreaElement(): HTMLTextAreaElement {
    return this.refTextEditor.getElementsByTagName('textarea')[0];
  }

  private addEmoji(emoji: any): void {
    const { value } = this.props.entry;
    const text = `${value}${emoji}`;

    this.handleChange(text);
    this.getTextAreaElement().focus();
  }

  private formatSelection(character: string): void {
    if (this.props.disabled) {
      return;
    }

    const textarea = this.getTextAreaElement();
    const { selectionStart, selectionEnd } = textarea;
    const { value } = this.props.entry;

    const before = value.substring(0, selectionStart);
    const selected = value.substring(selectionStart, selectionEnd);
    const after = value.substring(selectionEnd);

    const text = `${before}${character}${selected}${character}${after}`;

    this.handleChange(text);
    this.getTextAreaElement().focus();
  }

  public render(): JSX.Element {
    const hasError =
      this.props.entry.validationFailures &&
      this.props.entry.validationFailures.length > 0;
    let errors: string[] = [];
    if (hasError) {
      errors = this.props.entry.validationFailures.map(
        (error: any) => error.message,
      );
    }

    return (
      <div
        ref={(ref: HTMLElement) => (this.refTextEditor = ref)}
        className={styles.texteditor}
      >
        {this.props.autocomplete ? (
          <TembaCompletion
            name={this.props.name}
            value={this.props.entry.value}
            onInput={(value: string) => this.handleChange(value)}
            label={this.props.showLabel ? this.props.name : null}
            placeholder={this.props.placeholder}
            size={this.props.size || TextEditorSizes.sm}
            type="textarea"
            session={true}
            errors={errors}
            maxLength={this.props.maxLength}
            disabled={this.props.disabled}
            expressionsData={(this.props as any).expressionsData}
          />
        ) : (
          <UnnnicTextArea
            data-testid={this.props.name}
            v-model={[this.props.entry.value, this.handleChange]}
            label={this.props.showLabel ? this.props.name : null}
            placeholder={this.props.placeholder}
            size={this.props.size || TextEditorSizes.sm}
            type={hasError ? 'error' : 'normal'}
            errors={errors || []}
            maxLength={this.props.maxLength}
            disabled={this.props.disabled}
          />
        )}

        <TextEditorActions
          entry={this.props.entry}
          maxLength={this.props.maxLength}
          onAddEmoji={(e: any) => this.addEmoji(e)}
          onFormat={(c: string) => this.formatSelection(c)}
        />
      </div>
    );
  }
}
