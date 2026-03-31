import classNames from 'classnames/bind';
import { FormElementProps } from 'components/form/FormElement';
import * as React from 'react';
import { isRealValue, renderIf } from 'utils';

import styles from './CheckboxElement.module.scss';
import { applyVueInReact } from 'veaury';

// @ts-ignore
import Unnnic from '@weni/unnnic-system';

const UnnnicIcon = applyVueInReact(Unnnic.unnnicIcon, {
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

export interface CheckboxElementProps extends FormElementProps {
  checked: boolean;
  title?: string;
  description?: string;
  labelClassName?: string;
  checkboxClassName?: string;
  onChange?(checked: boolean): void;
}

interface CheckboxState {
  checked: boolean;
}

export const boxIco = 'check_box_outline_blank';
export const checkedBoxIco = 'check_box';

export const checkboxSpecId = 'checkbox';
export const titleSpecId = 'title';
export const descSpecId = 'description';

const cx: any = classNames.bind(styles);

export default class CheckboxElement extends React.Component<
  CheckboxElementProps,
  CheckboxState
> {
  constructor(props: any) {
    super(props);

    this.state = {
      checked: this.props.checked,
    };

    this.handleChange = this.handleChange.bind(this);
  }

  private handleChange(event: React.MouseEvent): void {
    // this null check only for testing, remove after switching to RTL
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    this.setState({ checked: !this.state.checked }, () => {
      if (this.props.onChange) {
        this.props.onChange(this.state.checked);
      }
    });
  }

  /* istanbul ignore next -- @preserve */
  public validate(): boolean {
    return true;
  }

  public render(): JSX.Element {
    const checkboxIcon = this.state.checked ? checkedBoxIco : boxIco;
    return (
      <label
        className={cx(styles.label, this.props.labelClassName)}
        onClick={this.handleChange}
      >
        <UnnnicIcon
          data-spec={checkboxSpecId}
          className={`${styles.checkbox_icon} ${this.props.checkboxClassName}`}
          icon={checkboxIcon}
          size="sm"
          scheme="neutral-snow"
        />
        {renderIf(isRealValue(this.props.title))(
          <div data-spec={titleSpecId} className={styles.title}>
            {this.props.title}
          </div>,
        )}
        {renderIf(isRealValue(this.props.description))(
          <div
            data-spec={descSpecId}
            className={
              this.props.title ? styles.description : styles.description_solo
            }
          >
            {this.props.description}
          </div>,
        )}
      </label>
    );
  }
}
