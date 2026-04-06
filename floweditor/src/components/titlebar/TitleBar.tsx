import * as React from 'react';
import ReactDOM from 'react-dom';
import { createClickHandler } from 'utils';

import shared from 'components/shared.module.scss';
import styles from './TitleBar.module.scss';
import { fakePropType } from 'config/ConfigProvider';
import i18n from 'config/i18n';
import { applyVueInReact } from 'veaury';

// @ts-ignore
import Unnnic from '@weni/unnnic-system';

export interface TitleBarProps {
  title: string;
  onRemoval(): any;
  __className?: string;
  showRemoval?: boolean;
  showMove?: boolean;
  onMoveUp?(event: React.MouseEvent<HTMLElement>): any;
  shouldCancelClick?: () => boolean;
  selected?: boolean;
  hasIssues?: boolean;
  new?: boolean;
}

export const titlebarContainerSpecId = 'titlebar-container';
export const titlebarSpecId = 'titlebar';
export const moveIconSpecId = 'move-icon';
export const moveSpecId = 'move';
export const removeIconSpecId = 'remove-icon';
export const confirmationSpecId = 'confirmation';
export const confirmRemovalSpecId = 'confirm-removal';

/**
 * Simple title bar with confirmation removal
 */

const UnnnicIcon = applyVueInReact(Unnnic.unnnicIcon);
const UnnnicModal = applyVueInReact(Unnnic.unnnicModal, {
  vue: {
    componentWrap: 'div',
    slotWrap: 'div',
    componentWrapAttrs: {
      style: {
        all: '',
        position: 'relative',
        zIndex: 10e2,
      },
    },
  },
  react: {
    componentWrap: 'div',
    slotWrap: 'div',
    componentWrapAttrs: {
      __use_react_component_wrap: '',
      style: {
        all: '',
      },
    },
  },
});

const UnnnicButton = applyVueInReact(Unnnic.unnnicButton, {
  vue: {
    componentWrap: 'div',
    slotWrap: 'div',
    componentWrapAttrs: {
      style: {
        display: 'flex',
        flex: 1,
      },
    },
  },
});

export default class TitleBar extends React.Component<TitleBarProps> {
  public static contextTypes = {
    config: fakePropType,
  };

  constructor(props: TitleBarProps) {
    super(props);

    this.handleConfirmRemoval = this.handleConfirmRemoval.bind(this);
  }

  public handleMouseUpCapture(event: React.MouseEvent<HTMLElement>): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  public handleConfirmRemoval(event: React.MouseEvent<HTMLElement>): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    const div = document.createElement('div');
    document.body.appendChild(div);

    const { onRemoval } = this.props;

    ReactDOM.render(
      <UnnnicModal
        className={styles.removal_modal}
        data-testid={confirmRemovalSpecId}
        modalIcon="alert-circle-1"
        scheme="feedback-yellow"
        text={i18n.t('removal_confirmation', 'Do you want to delete the card?')}
        v-slots={{
          message: (
            <>
              {i18n.t(
                'removal_confirmation_description',
                'Are you sure you want to delete the card?',
              )}
              <br />
              <b>
                {i18n.t(
                  'action_cannot_be_reversed',
                  'This action cannot be reversed.',
                )}
              </b>
              <br />
              <br />
              {i18n.t(
                'you_can_also_delete_cards_pressing_the_keys',
                'You can also delete cards by pressing',
              )}{' '}
              <b>delete</b> {i18n.t('or', 'or')} <b>backspace</b>.
            </>
          ),
          options: (
            <div className={styles.removal_buttons}>
              <UnnnicButton
                text={i18n.t('buttons.cancel', 'Cancel')}
                type="tertiary"
                onClick={() => ReactDOM.unmountComponentAtNode(div)}
              />
              <UnnnicButton
                text={i18n.t('buttons.confirm', 'Confirm')}
                type="attention"
                onClick={() => {
                  onRemoval();
                  ReactDOM.unmountComponentAtNode(div);
                }}
              />
            </div>
          ),
        }}
        onClose={() => ReactDOM.unmountComponentAtNode(div)}
      />,
      div,
    );
  }

  private getMoveArrow(): JSX.Element {
    let moveArrow: JSX.Element = null;

    if (this.props.showMove && this.context.config.mutable) {
      moveArrow = (
        <div
          className={styles.up_button}
          {...createClickHandler(
            this.props.onMoveUp,
            this.props.shouldCancelClick,
            this.handleMouseUpCapture,
          )}
          data-testid={moveIconSpecId}
        >
          <UnnnicIcon
            className={styles.up_button}
            data-spec={moveSpecId}
            icon="arrow-button-up-1"
            size="xs"
            scheme={this.props.selected ? 'neutral-darkest' : 'neutral-snow'}
          />
        </div>
      );
    } else {
      moveArrow = <div className={styles.up_button} data-spec={moveSpecId} />;
    }

    return moveArrow;
  }

  private getRemove(): JSX.Element {
    const remove: JSX.Element = (
      <div
        className={styles.remove_button}
        {...createClickHandler(
          this.context.config.mutable ? this.handleConfirmRemoval : () => {},
          this.props.shouldCancelClick,
          this.handleMouseUpCapture,
        )}
        data-testid={removeIconSpecId}
      >
        <UnnnicIcon
          icon="close-1"
          size="xs"
          scheme={this.props.selected ? 'neutral-darkest' : 'neutral-snow'}
        />
      </div>
    );

    return remove;
  }

  public render(): JSX.Element {
    const moveArrow: JSX.Element = this.getMoveArrow();
    const remove: JSX.Element = this.getRemove();
    return (
      <div
        className={`${styles.titlebar} ${
          this.props.hasIssues ? shared.missing : null
        }`}
        data-spec={titlebarContainerSpecId}
      >
        <div
          className={`${styles.normal} ${this.props.__className} ${
            this.props.selected ? styles['selected'] : null
          }`}
          data-spec={titlebarSpecId}
        >
          {moveArrow}
          <div className={`${styles.titletext} u font secondary body-md bold`}>
            {this.props.title}

            {this.props.new && (
              <span className={styles.new}>{i18n.t('new', 'New')}!</span>
            )}
          </div>
          {remove}
        </div>
      </div>
    );
  }
}
