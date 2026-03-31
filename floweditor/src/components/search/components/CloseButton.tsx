import { react as bindCallbacks } from 'auto-bind';
import * as React from 'react';
import { applyVueInReact } from 'veaury';
import styles from './CloseButton.module.scss';

// @ts-ignore
import Unnnic from '@weni/unnnic-system';
import { CloseIcon } from 'pureIcons/CloseIcon';

export enum ButtonTypes {
  primary = 'primary',
  secondary = 'secondary',
  tertiary = 'tertiary',
}
export interface ButtonProps {
  name: string;
  onClick: any;
  disabled?: boolean;
  size?: string;
  onRef?: (ele: any) => void;
}

const UnnnicButton = applyVueInReact(Unnnic.unnnicButton, {
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

export default class CloseButton extends React.Component<ButtonProps> {
  constructor(props: ButtonProps) {
    super(props);

    bindCallbacks(this, {
      include: [/^handle/],
    });
  }

  public render(): JSX.Element {
    const { onRef, name, onClick, disabled } = this.props;

    return (
      <div className={styles.closeButton}>
        <UnnnicButton
          data-testid={this.props.name}
          ref={onRef}
          onClick={onClick}
          type={'tertiary'}
          disabled={disabled}
          size={this.props.size || 'small'}
        >
          <div className={styles.closeIcon}>
            <CloseIcon />
          </div>
        </UnnnicButton>
      </div>
    );
  }
}
