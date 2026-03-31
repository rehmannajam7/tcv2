import * as React from 'react';
import { applyVueInReact } from 'veaury';
import styles from './ContentCollapse.module.scss';

// @ts-ignore
import Unnnic from '@weni/unnnic-system';
import i18n from 'config/i18n';

const UnnnicIcon = applyVueInReact(Unnnic.unnnicIcon, {
  vue: {
    componentWrap: 'div',
    slotWrap: 'div',
    componentWrapAttrs: {
      style: {
        all: '',
        display: 'flex',
      },
    },
  },
});

interface ContentCollapseProps {
  title: string;
  subtitle?: string;
  opacity?: boolean;
  description?: string;
  children: React.ReactNode;
  hasError?: boolean;
  wrapper_class?: string;
  open?: boolean;
  titleIcon?: string;
  titleIconScheme?: string;
  whiteBackground?: boolean;
  optional?: boolean;
}

interface ContentCollapseState {
  isOpen: boolean;
}

export default class ContentCollapse extends React.Component<
  ContentCollapseProps,
  ContentCollapseState
> {
  constructor(props: ContentCollapseProps) {
    super(props);

    this.state = {
      isOpen: this.props.open,
    };
  }

  private toggleCollapse(): void {
    this.setState({ isOpen: !this.state.isOpen });
  }

  public render(): JSX.Element {
    return (
      <div
        className={
          styles.collapse +
          ' ' +
          (this.props.hasError ? styles.error : '') +
          ' ' +
          (this.props.whiteBackground ? styles.white_background : '')
        }
      >
        <div className={styles.collapse_title_wrapper}>
          <div
            data-testid={this.props.title}
            className={styles.collapse_header}
            onClick={() => this.toggleCollapse()}
          >
            {this.props.titleIcon && (
              <UnnnicIcon
                icon={this.props.titleIcon}
                scheme={this.props.titleIconScheme}
                filled={true}
              />
            )}
            <span className={this.props.opacity ? styles.opacity : ''}>
              {this.props.title}
            </span>
            {this.props.optional && (
              <span className={styles.optional}>
                {i18n.t('forms.optional', '(Optional)')}
              </span>
            )}
            <div className={styles.collapse_icon}>
              {this.props.subtitle && (
                <div className={styles.subtitle}>{this.props.subtitle}</div>
              )}
              <UnnnicIcon
                icon={this.state.isOpen ? 'expand_less' : 'expand_more'}
              />
            </div>
          </div>

          {this.props.description && (
            <div className={styles.collapse_description}>
              {this.props.description}
            </div>
          )}
        </div>

        {this.state.isOpen && (
          <>
            {this.props.description && (
              <div className={styles.collapse_divider}></div>
            )}
            <div className={this.props.wrapper_class}>
              {this.props.children}
            </div>
          </>
        )}
      </div>
    );
  }
}
