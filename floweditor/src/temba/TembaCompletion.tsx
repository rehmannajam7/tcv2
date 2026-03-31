import { react as bindCallbacks } from 'auto-bind';
import * as React from 'react';
import styles from './TembaCompletion.module.scss';
import {
  updateInputElementWithCompletion,
  executeCompletionQuery,
  CompletionSchema,
  CompletionOption,
} from '../utils/completion/helper';

import AppState from '../store/state';

import { connect } from 'react-redux';
import { applyVueInReact } from 'veaury';

// @ts-ignore
import Unnnic from '@weni/unnnic-system';
import { TembaStore } from '../temba-components';
import SelectOptions from './SelectOptions';
const UnnnicTextArea = applyVueInReact(Unnnic.unnnicTextArea);
const UnnnicInput = applyVueInReact(Unnnic.unnnicInput);

interface ValuedCompletionOption extends CompletionOption {
  value: string;
}

export interface TembaCompletionProps {
  name: string;
  label?: string;
  placeholder?: string;
  size?: any;
  session?: boolean;
  value: string;
  onInput?: (value: string) => void;
  type: string;
  errors?: string[];
  maxLength?: number;
  disabled?: boolean;
  expressionsData: {
    functions: CompletionOption[];
    context: CompletionSchema;
  };
}

interface TembaCompletionState {
  query: string;
  options: ValuedCompletionOption[];
  showCompletionsMenu: boolean;
  completionTopOffset?: number;
  optionIndex: number;
}

export class TembaCompletion extends React.Component<
  TembaCompletionProps,
  TembaCompletionState
> {
  private tembaCompletionRef: HTMLElement;
  private refInput: HTMLInputElement;
  private refTextArea: HTMLInputElement;
  private completionsRef: React.RefObject<HTMLDivElement>;
  private mounted = false;
  private showMenuTimeoutId?: number;

  public static defaultProps = {
    type: 'input',
  };

  constructor(props: TembaCompletionProps) {
    super(props);

    this.state = {
      query: '',
      options: [],
      showCompletionsMenu: true,
      optionIndex: 0,
    };

    this.completionsRef = React.createRef();
    this.handleClickOutside = this.handleClickOutside.bind(this);
    this.hideExpressionsMenu = this.hideExpressionsMenu.bind(this);

    bindCallbacks(this, {
      include: [/^handle/],
    });
  }

  public async componentDidMount(): Promise<void> {
    this.mounted = true;
    this.setState({ showCompletionsMenu: false });

    if (this.props.value && this.props.type === 'input') {
      const inputEl = this.refInput.querySelector('input');
      inputEl.value = this.props.value;
      inputEl.dispatchEvent(new Event('input'));
      this.showMenuTimeoutId = window.setTimeout(() => {
        if (!this.mounted) return;
        this.setState({ showCompletionsMenu: true });
      }, 100);
    }
  }

  public componentWillUnmount(): void {
    this.mounted = false;
    if (this.showMenuTimeoutId) {
      window.clearTimeout(this.showMenuTimeoutId);
      this.showMenuTimeoutId = undefined;
    }
  }

  private handleClickOutside(event: any) {
    if (
      this.completionsRef &&
      this.completionsRef.current &&
      !this.completionsRef.current.contains(event.target)
    ) {
      this.hideExpressionsMenu();
    }
  }

  private hideExpressionsMenu() {
    if (!this.mounted) return;
    if (this.state.showCompletionsMenu) {
      this.setState({ showCompletionsMenu: false, optionIndex: 0 });
    }
  }

  private executeQuery(ele: HTMLInputElement | HTMLTextAreaElement) {
    const store: TembaStore = document.querySelector('temba-store');
    const expr = this.props.expressionsData as any;
    const ctx = Array.isArray(expr) ? expr[0]?.context : expr?.context;
    const fns = Array.isArray(expr) ? expr[0]?.functions : expr?.functions;
    const safeCtx = ctx || ({} as any);
    const safeFns = fns || [];
    const result = executeCompletionQuery(
      ele,
      store,
      this.props.session,
      safeFns,
      safeCtx,
    );

      const expressions = result.options.map(
        (option: CompletionOption): ValuedCompletionOption => {
          if (option.signature) {
            return {
              ...option,
              name: `ƒ ${option.signature}`,
              value: option.signature,
            };
          }

          return { ...option, value: option.name };
        },
      );

      if (
        expressions.length === 1 &&
        result.query === expressions[0].value
      ) {
        this.setState({
          query: null,
          options: [],
        });
        return;
      }

    this.setState({
      query: result.query,
      options: expressions,
      showCompletionsMenu: expressions.length > 0,
    });
  }

  private handleInput(
    event: ValuedCompletionOption,
    ref: HTMLElement,
    selector: string,
  ) {
    if (!this.mounted) return;
    if (!event) {
      return;
    }

    const inputEl = ref.querySelector(selector) as HTMLInputElement;

    if (event.value === this.state.query) {
      this.hideExpressionsMenu();
      inputEl.focus();
    } else {
      updateInputElementWithCompletion(this.state.query, inputEl, event);
      this.setState({ optionIndex: 0 });
    }

    if (this.props.onInput) {
      this.props.onInput(inputEl.value);
    }
  }

  private handleInputChange(input: string) {
    if (!this.mounted) return;
    if (input === this.props.value) return;

    this.setState({ showCompletionsMenu: true });
    const inputEl = this.refInput.querySelector('input');
    
    // Use setTimeout to ensure the DOM is updated before executing the query
    setTimeout(() => {
      if (this.mounted) {
        this.executeQuery(inputEl);
      }
    }, 0);

    if (this.props.onInput) {
      this.props.onInput(input);
    }
  }

  private handleTextAreaInput(event: any) {
    if (!this.mounted) return;
    this.setState({ showCompletionsMenu: true });

    const textAreaEl = this.refTextArea.querySelector('textarea');

    // Use setTimeout to ensure the DOM is updated before executing the query
    setTimeout(() => {
      if (this.mounted) {
        this.executeQuery(textAreaEl);
      }
    }, 0);
    
    if (this.props.onInput) {
      this.props.onInput(textAreaEl.value);
    }
  }

  private getRefAndSelector() {
    const ref =
      this.props.type === 'textarea' ? this.refTextArea : this.refInput;
    const selector = this.props.type === 'textarea' ? 'textarea' : 'input';

    return { ref, selector };
  }

  private getRefFromVueInputRef(inputRef: any, selector: string) {
    return inputRef.querySelector(selector) as HTMLInputElement;
  }

  public render(): JSX.Element {
    const { ref, selector } = this.getRefAndSelector();

    const hasErrors = this.props.errors && this.props.errors.length > 0;
    return (
      <div
        ref={(ele: any) => {
          this.tembaCompletionRef = ele;
        }}
      >
        {this.props.label && (
          <span className={styles.label}>{this.props.label}</span>
        )}
        <div
          className={styles.completion_wrapper}
          ref={(ele: any) => {
            this.refTextArea = ele;
          }}
        >
          {this.props.type === 'textarea' ? (
            <UnnnicTextArea
              data-testid={this.props.name}
              className={styles.textarea}
              v-model={[this.props.value, this.handleTextAreaInput]}
              placeholder={this.props.placeholder}
              size={this.props.size}
              type={hasErrors ? 'error' : 'normal'}
              errors={this.props.errors || []}
              maxLength={this.props.maxLength}
              disabled={this.props.disabled}
            />
          ) : (
            <div
              data-testid={this.props.name}
              ref={(ele: any) => {
                this.refInput = ele;
              }}
            >
              <UnnnicInput
                v-model={[this.props.value, this.handleInputChange]}
                placeholder={this.props.placeholder}
                size={this.props.size}
                type={hasErrors ? 'error' : 'normal'}
                message={this.props.errors && this.props.errors[0]}
                maxLength={this.props.maxLength}
                disabled={this.props.disabled}
              />
            </div>
          )}
          {this.tembaCompletionRef && ref ? (
            <SelectOptions
              testId={`temba_completion_options_${this.props.name}`}
              options={this.state.options}
              onBlur={this.hideExpressionsMenu}
              onSelect={option => this.handleInput(option, ref, selector)}
              active={this.state.showCompletionsMenu}
              anchorRef={this.tembaCompletionRef}
              inputRef={this.getRefFromVueInputRef(ref, selector)}
              expressions={true}
            />
          ) : null}
        </div>
      </div>
    );
  }
}

/* istanbul ignore next -- @preserve */
const mapStateToProps = ({ flowContext: { assetStore } }: AppState) => ({
  expressionsData: assetStore?.completion?.items as any,
});

export default connect(
  mapStateToProps,
  null,
)(TembaCompletion);
