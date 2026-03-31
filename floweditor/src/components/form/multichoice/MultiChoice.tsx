import { react as bindCallbacks } from 'auto-bind';
import * as React from 'react';
import { StringArrayEntry, StringEntry } from 'store/nodeEditor';
import TembaSelect from 'temba/TembaSelect';

import styles from './MultiChoice.module.scss';

export interface MultiChoiceInputProps {
  name: string;
  items: StringArrayEntry;
  entry?: StringEntry;
  onChange?: (values: string[]) => void;
  helpText?: JSX.Element;
}

interface MultiChoiceInputState {
  currentInput: StringEntry;
}

export default class MultiChoiceInput extends React.Component<
  MultiChoiceInputProps,
  MultiChoiceInputState
> {
  constructor(props: MultiChoiceInputProps) {
    super(props);

    if (this.props.entry) {
      this.state = {
        currentInput: this.props.entry,
      };
    } else {
      this.state = {
        currentInput: { value: '' },
      };
    }

    bindCallbacks(this, {
      include: [/^handle/],
    });
  }

  private handleChange(options: { name: string; value: string }[]): void {
    this.props.onChange(options.map(option => option.value));
  }

  private getErrors() {
    if (!this.props.items || !this.props.items.validationFailures) {
      return [];
    }

    return this.props.items.validationFailures.map(error => {
      return error.message;
    });
  }

  public render(): JSX.Element {
    const values = this.props.items.value.map((value: string) => {
      return { name: value, value };
    });
    return (
      <>
        {this.props.helpText ? (
          <div
            className={`${styles.label} u font secondary body-md color-neutral-cloudy`}
          >
            {this.props.helpText}
          </div>
        ) : (
          <div />
        )}
        <TembaSelect
          name={this.props.name}
          placeholder={this.props.name}
          onChange={this.handleChange}
          value={values}
          multi={true}
          tags={true}
          searchable={true}
          expressions={true}
          errors={this.getErrors()}
        />
      </>
    );
  }
}
