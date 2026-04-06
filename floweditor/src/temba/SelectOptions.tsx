import { react as bindCallbacks } from 'auto-bind';
import React, { createRef } from 'react';

import styles from './SelectOptions.module.scss';

import getCaretCoordinates from './TextareaCaretPosition';
import { CompletionOption } from '../store/flowContext';

import { applyVueInReact } from 'veaury';

// @ts-ignore
import Unnnic from '@weni/unnnic-system';
import { debounce } from '../utils';

const UnnnicCheckbox = applyVueInReact(Unnnic.unnnicCheckbox);

export interface SelectOptionsProps {
  options: any[];
  selected?: any[];
  onSelect: (option: any) => void;
  onBlur: () => void;
  active: boolean;
  anchorRef: HTMLElement;
  inputRef: HTMLInputElement;
  expressions?: boolean;
  getName?: (option: any) => string;
  getValue?: (option: any) => string;
  multi?: boolean;
  createPrefix?: string;
  testId: string;
  id?: string;
}

export interface SelectOptionsState {
  optionCursor: number;
  topOffset: number;
}

export default class SelectOptions extends React.Component<
  SelectOptionsProps,
  SelectOptionsState
> {
  private optionsRef = createRef<HTMLDivElement>();

  constructor(props: SelectOptionsProps) {
    super(props);

    this.state = {
      optionCursor: 0,
      topOffset: 0,
    };

    this.optionsRef = React.createRef();
    this.handleClickOutside = this.handleClickOutside.bind(this);

    bindCallbacks(this, {
      include: [/^handle/],
    });
  }

  public componentDidMount() {
    if (this.props.inputRef) {
      if (this.props.inputRef instanceof HTMLTextAreaElement) {
        this.props.inputRef.addEventListener('scroll', () => this.hide());
        this.props.inputRef.addEventListener('scrollend', () =>
          this.recalculatePosition(),
        );
      } else {
        const scrollableParent = this.findScrollableParent(
          this.props.anchorRef,
        );
        scrollableParent.addEventListener('scroll', () => this.hide());
        scrollableParent.addEventListener('scrollend', () =>
          this.recalculatePosition(),
        );
      }
      document.addEventListener('mousedown', this.handleClickOutside);
      this.props.anchorRef.addEventListener(
        'keydown',
        this.handleCompletionsKeyDown,
      );
      this.calculateOptionsOffset(this.props.inputRef);
    }
  }

  public componentWillUnmount() {
    if (this.props.inputRef) {
      if (this.props.inputRef instanceof HTMLTextAreaElement) {
        this.props.inputRef.removeEventListener('scroll', () => this.hide());
        this.props.inputRef.removeEventListener('scrollend', () =>
          this.recalculatePosition(),
        );
      } else {
        const scrollableParent = this.findScrollableParent(
          this.props.anchorRef,
        );
        scrollableParent.removeEventListener('scroll', () => this.hide());
        scrollableParent.removeEventListener('scrollend', () =>
          this.recalculatePosition(),
        );
      }
      document.removeEventListener('mousedown', this.handleClickOutside);
      this.props.anchorRef.removeEventListener(
        'keydown',
        this.handleCompletionsKeyDown,
      );
    }
  }

  public componentDidUpdate(
    prevProps: Readonly<SelectOptionsProps>,
    prevState: Readonly<SelectOptionsState>,
  ): void {
    if (prevState.optionCursor !== this.state.optionCursor) {
      const completionList = this.optionsRef.current;
      const activeCompletion = completionList.querySelector(
        `.${styles.active}`,
      );
      if (activeCompletion) {
        activeCompletion.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'start',
        });
      }
    }

    if (prevProps.active !== this.props.active) {
      this.setState({ optionCursor: 0 });
      this.calculateOptionsOffset(this.props.inputRef);
    }
  }

  private handleMouseMove(event: any) {
    if (Math.abs(event.movementX) + Math.abs(event.movementY) > 0) {
      const index = (event.currentTarget as HTMLElement).getAttribute(
        'data-option-index',
      );
      if (parseInt(index) !== this.state.optionCursor) {
        this.setState({ optionCursor: parseInt(index) });
      }
    }
  }

  private handleClickOutside(event: any) {
    if (
      this.optionsRef &&
      this.optionsRef.current &&
      !this.optionsRef.current.contains(event.target)
    ) {
      this.props.onBlur();
    }
  }

  private getCurrentOption(): any {
    return this.props.options[this.state.optionCursor];
  }

  private triggerOption() {
    const option = this.getCurrentOption();
    if (option) {
      this.props.onSelect(option);

      if (this.props.createPrefix && option.arbitrary) {
        this.props.onBlur();
      }
    }
  }

  private handleCompletionsKeyDown(event: any) {
    if (this.props.options.length !== 0 && this.props.active) {
      if (event.key === 'Escape') {
        this.props.onBlur();
      } else if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault();
        event.stopPropagation();
        this.triggerOption();
      } else if (event.key === 'ArrowDown') {
        this.moveFocusedOption(1);
        event.preventDefault();
        event.stopPropagation();
      } else if (event.key === 'ArrowUp') {
        this.moveFocusedOption(-1);
        event.preventDefault();
        event.stopPropagation();
      }
    }
  }

  private handleOptionClick(option: any) {
    if (option) {
      this.props.onSelect(option);

      if (this.props.createPrefix && option.arbitrary) {
        this.props.onBlur();
      }
    }
  }

  private moveFocusedOption(direction: number) {
    const newIndex = Math.max(
      Math.min(
        this.state.optionCursor + direction,
        this.props.options.length - 1,
      ),
      0,
    );
    this.setState({
      optionCursor: newIndex,
    });
  }

  private getOptionWidth() {
    if (this.optionsRef.current) {
      const width = this.optionsRef.current.parentElement.offsetWidth - 24;
      return width;
    }

    return 0;
  }

  private hide() {
    if (this.props.active) {
      this.props.onBlur();
    }
  }

  private recalculatePosition() {
    debounce(this.calculateOptionsOffset, 1000, () => {
      this.calculateOptionsOffset(this.props.inputRef);
    });
  }

  private findScrollableParent = (element: HTMLElement) => {
    if (!element) {
      return undefined;
    }

    let parent = element.parentElement;
    while (parent) {
      const { overflow } = window.getComputedStyle(parent);
      if (overflow.split(' ').every(o => o === 'auto' || o === 'scroll')) {
        return parent;
      }
      parent = parent.parentElement;
    }

    return document.documentElement;
  };

  private calculateOptionsOffset(element: HTMLInputElement) {
    if (
      this.props.inputRef instanceof HTMLTextAreaElement &&
      element.tagName === 'TEXTAREA'
    ) {
      const caret = getCaretCoordinates(element, element.selectionEnd);
      const topOffset =
        caret.top +
        (caret.height || 0) -
        element.scrollTop -
        element.offsetHeight;
      this.setState({
        topOffset,
      });
    } else {
      const firstScrollableParent = this.findScrollableParent(element);

      let windowOffset = 0;
      if (firstScrollableParent === document.documentElement) {
        windowOffset = window.scrollY;
      }

      const topOffset = -firstScrollableParent.scrollTop + windowOffset;

      if (topOffset !== this.state.topOffset) {
        this.setState({
          topOffset,
        });
      }
    }
  }

  private renderCompletionOption(option: CompletionOption) {
    return (
      <>
        <span className={styles.name}>{option.name}</span>
        {option.summary && (
          <span className={styles.summary}>{option.summary}</span>
        )}
      </>
    );
  }

  private renderOption(option: any, selected: boolean) {
    let optionName = option.name;
    if (this.props.getName) {
      optionName = this.props.getName(option);
    }

    let optionText = optionName;

    if (option.arbitrary) {
      optionText = this.props.createPrefix + optionName;
    }

    if (!this.props.multi) {
      return <span className={styles.name}>{optionText}</span>;
    } else {
      return (
        <div className={styles.multi_wrapper}>
          <UnnnicCheckbox className={styles.checkbox} modelValue={!!selected} />
          <span className={styles.name}>{optionText}</span>
        </div>
      );
    }
  }

  private isSelected(option: any) {
    if (this.props.selected) {
      return this.props.selected.find((op: any) => {
        return this.props.getValue
          ? this.props.getValue(op) === this.props.getValue(option)
          : false;
      });
    }

    return false;
  }

  public render() {
    return (
      <div
        data-testid={this.props.testId}
        id={this.props.id || ''}
        ref={this.optionsRef}
        className={styles.options_wrapper}
        style={{
          marginTop: this.state.topOffset,
          width: this.getOptionWidth(),
          display:
            this.props.active && this.props.options.length !== 0
              ? 'flex'
              : 'none',
        }}
      >
        {this.props.options.map((option: any, index: number) => {
          const selected = this.isSelected(option);
          return (
            <div
              data-option-index={index}
              className={
                (this.props.expressions ? styles.completion : styles.option) +
                ' ' +
                (index === this.state.optionCursor ? styles.active : '') +
                ' ' +
                (selected ? styles.selected : '')
              }
              key={index}
              onClick={() => this.handleOptionClick(option)}
              onMouseMove={this.handleMouseMove}
            >
              {this.props.expressions
                ? this.renderCompletionOption(option as CompletionOption)
                : this.renderOption(option, selected)}
            </div>
          );
        })}
      </div>
    );
  }
}
