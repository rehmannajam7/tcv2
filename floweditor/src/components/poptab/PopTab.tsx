import { react as bindCallbacks } from 'auto-bind';
import * as React from 'react';
import { applyVueInReact } from 'veaury';

import styles from './PopTab.module.scss';

// @ts-ignore
import Unnnic from '@weni/unnnic-system';

export interface PopTabProps {
  type?: string;
  color: string;
  bgColor?: string;
  icon: string;
  label: string;
  header: string;
  top: string;
  visible: boolean;
  onShow: () => void;
  onHide: () => void;
}

export interface PopTabState {
  width: number;
}

const UnnnicIcon = applyVueInReact(Unnnic.unnnicIcon);

export class PopTab extends React.Component<PopTabProps, PopTabState> {
  private poppedEle: HTMLDivElement;

  constructor(props: PopTabProps) {
    super(props);
    this.state = { width: 250 };

    bindCallbacks(this, {
      include: [/^handle/],
    });
  }

  public componentDidUpdate(): void {
    if (this.state.width !== this.poppedEle.offsetWidth) {
      this.setState({ width: this.poppedEle.offsetWidth });
    }
  }

  private handlePoppedRef(ref: HTMLDivElement): HTMLDivElement {
    return (this.poppedEle = ref);
  }

  private handleTabClick(): void {
    this.props.onShow();
  }

  private handleClose(): void {
    this.props.onHide();
  }
  public render(): JSX.Element {
    return (
      <div
        className={
          'pop_wrapper ' +
          styles.pop_wrapper +
          ' ' +
          (this.props.visible ? styles.visible : '')
        }
        style={{
          right: -this.state.width,
          top: this.props.top,
        }}
      >
        <div className={styles.tab_wrapper}>
          <div
            className={styles.tab}
            style={{ background: this.props.color }}
            onClick={this.handleTabClick}
          >
            <div className={styles.icon}>
              <UnnnicIcon
                icon={this.props.icon}
                size="lg"
                scheme="neutral-snow"
              />
            </div>
            <div className={styles.label}>{this.props.label}</div>
          </div>
        </div>
        <div
          ref={this.handlePoppedRef}
          className={`${styles.popped} ${styles[this.props.type]}`}
          style={{
            borderColor: this.props.type !== 'revisions' && this.props.color,
            right: this.props.visible ? 15 + this.state.width : 0,
            top: -100,
          }}
        >
          <div
            className={styles.header}
            style={{ background: this.props.color }}
          >
            <div className={styles.close} onClick={this.handleClose}>
              <UnnnicIcon icon={'close'} size="md" scheme="neutral-snow" />
            </div>
          </div>
          <div
            className={styles.body}
            style={{ background: this.props.bgColor || this.props.color }}
          >
            {this.props.children}
          </div>
          {this.props.type === 'revisions' && (
            <div
              className={styles.footer}
              style={{ background: this.props.color }}
            />
          )}
        </div>
      </div>
    );
  }
}
