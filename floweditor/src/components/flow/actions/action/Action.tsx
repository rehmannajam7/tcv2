import { react as bindCallbacks } from 'auto-bind';
import classNames from 'classnames/bind';
import shared from 'components/shared.module.scss';
import TitleBar from 'components/titlebar/TitleBar';
import { fakePropType } from 'config/ConfigProvider';
import { Types } from 'config/interfaces';
import { getTypeConfig } from 'config/typeConfigs';
import {
  Action,
  AnyAction,
  Endpoints,
  LocalizationMap,
  FlowIssue,
} from 'flowTypes';
import * as React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { Asset, RenderNode } from 'store/flowContext';
import AppState from 'store/state';
import {
  ActionAC,
  DispatchWithState,
  moveActionUp,
  OnOpenNodeEditor,
  onOpenNodeEditor,
  removeAction,
} from 'store/thunks';
import { createClickHandler, getLocalization } from 'utils';

import styles from './Action.module.scss';
import { hasIssues } from 'components/flow/helpers';
import MountScroll from 'components/mountscroll/MountScroll';
import { MouseState } from 'store/editor';

export interface ActionWrapperPassedProps {
  first: boolean;
  action: AnyAction;
  localization: LocalizationMap;
  selected: boolean;
  issues: FlowIssue[];
  render: (action: AnyAction, endpoints: Endpoints) => React.ReactNode;
}

export interface ActionWrapperStoreProps {
  renderNode: RenderNode;
  language: Asset;
  translating: boolean;
  onOpenNodeEditor: OnOpenNodeEditor;
  removeAction: ActionAC;
  moveActionUp: ActionAC;
  scrollToAction: string;
  mouseState: MouseState;
}

export type ActionWrapperProps = ActionWrapperPassedProps &
  ActionWrapperStoreProps;

export const actionContainerSpecId = 'action-container';
export const actionOverlaySpecId = 'action-overlay';
export const actionInteractiveDivSpecId = 'interactive-div';
export const actionBodySpecId = 'action-body';

const cx: any = classNames.bind({ ...shared, ...styles });

// Note: this needs to be a ComponentClass in order to work w/ react-flip-move
export class ActionWrapper extends React.Component<ActionWrapperProps> {
  public static contextTypes = {
    config: fakePropType,
  };

  constructor(props: ActionWrapperProps) {
    super(props);

    bindCallbacks(this, {
      include: [/^on/, /^handle/],
    });
  }

  public handleActionClicked(event: React.MouseEvent<HTMLElement>): void {
    if (this.props.mouseState !== MouseState.DRAGGING) {
      const target = event.target as any;

      const showAdvanced =
        target &&
        target.attributes &&
        target.getAttribute('data-advanced') === 'true';

      this.props.onOpenNodeEditor({
        originalNode: this.props.renderNode,
        originalAction: this.props.action,
        showAdvanced,
      });
    }
  }

  public handleRemoval(): void {
    this.props.removeAction(this.props.renderNode.node.uuid, this.props.action);
  }

  public handleMoveUp(event: React.MouseEvent<HTMLDivElement>): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.props.moveActionUp(this.props.renderNode.node.uuid, this.props.action);
  }

  public getAction(): Action {
    // if we are translating, us our localized version
    if (this.props.translating) {
      const localization = getLocalization(
        this.props.action,
        this.props.localization,
        this.props.language,
      );
      return localization.getObject() as AnyAction;
    }

    return this.props.action;
  }

  private getClasses(): string {
    const localizedKeys = [];
    let missingLocalization = false;
    if (this.props.translating) {
      const actionType = this.props.action.type;
      if (
        actionType === Types.send_msg ||
        actionType === Types.send_broadcast ||
        actionType === Types.say_msg ||
        actionType === Types.send_whatsapp_msg ||
        actionType === Types.send_msg_catalog
      ) {
        localizedKeys.push('text');
      }

      if (actionType === Types.send_whatsapp_msg) {
        localizedKeys.push('quick_replies');
      }

      if (actionType === Types.send_email) {
        localizedKeys.push('subject');
      }

      if (actionType === Types.call_wenigpt) {
        localizedKeys.push('input');
      }

      if (localizedKeys.length !== 0) {
        const localization = getLocalization(
          this.props.action,
          this.props.localization,
          this.props.language,
        );

        if (localization.isLocalized()) {
          for (const key of localizedKeys) {
            if (!(key in localization.localizedKeys)) {
              missingLocalization = true;
              break;
            }
          }
        } else {
          missingLocalization = true;
        }
      }
    }

    const notLocalizable = this.props.translating && localizedKeys.length === 0;

    return cx({
      [styles.action]: true,
      [styles.has_router]:
        this.props.renderNode.node.hasOwnProperty('router') &&
        this.props.renderNode.node.router !== null,
      [styles.translating]: this.props.translating,
      [styles.not_localizable]: notLocalizable,
      [styles.missing_localization]: missingLocalization,
      [styles.localized]: !notLocalizable && !missingLocalization,
    });
  }

  public render(): JSX.Element {
    const { name, new: newType } = getTypeConfig(this.props.action.type);

    const classes = this.getClasses();
    const actionToInject = this.getAction();

    let titleBarClass =
      (shared as any)[this.props.action.type] || shared.missing;
    let actionClass = (styles as any)[this.props.action.type] || styles.missing;
    const showRemoval = !this.props.translating;
    const showMove = !this.props.first && !this.props.translating;
    const selectedClass = this.props.selected ? styles.selected : '';
    const issues = hasIssues(
      this.props.issues,
      this.props.translating,
      this.props.language,
    );

    if (
      hasIssues(this.props.issues, this.props.translating, this.props.language)
    ) {
      titleBarClass = shared.missing;
      actionClass = styles.missing;
    }

    const events = this.context.config.mutable
      ? createClickHandler(this.handleActionClicked, () => this.props.selected)
      : {};

    const body = (
      <>
        <TitleBar
          __className={titleBarClass}
          title={name}
          onRemoval={this.handleRemoval}
          showRemoval={showRemoval}
          showMove={showMove}
          onMoveUp={this.handleMoveUp}
          shouldCancelClick={() => this.props.selected}
          selected={this.props.selected}
          hasIssues={issues}
          new={newType}
        />
        <div
          className={styles.body + ' ' + actionClass + ' ' + selectedClass}
          data-spec={actionBodySpecId}
        >
          {this.props.render(actionToInject, this.context.config.endpoints)}
        </div>
      </>
    );
    return (
      <div
        id={`action-${this.props.action.uuid}`}
        className={`${classes} ${styles[this.props.action.type]}`}
        data-spec={actionContainerSpecId}
      >
        <div className={styles.overlay} data-spec={actionOverlaySpecId} />
        <div {...events} data-spec={actionInteractiveDivSpecId}>
          {this.props.scrollToAction &&
          this.props.scrollToAction === this.props.action.uuid ? (
            <MountScroll pulseAfterScroll={true}>{body}</MountScroll>
          ) : (
            body
          )}
        </div>
      </div>
    );
  }
}

/* istanbul ignore next -- @preserve */
const mapStateToProps = ({
  flowContext: {
    definition: { localization },
  },
  editorState: { language, translating, scrollToAction, mouseState },
}: AppState) => ({
  scrollToAction,
  language,
  translating,
  localization,
  mouseState,
});

/* istanbul ignore next -- @preserve */
const mapDispatchToProps = (dispatch: DispatchWithState) =>
  bindActionCreators(
    {
      onOpenNodeEditor,
      removeAction,
      moveActionUp,
    },
    dispatch,
  );

const ConnectedActionWrapper = connect(
  mapStateToProps,
  mapDispatchToProps,
  null,
  { forwardRef: true },
)(ActionWrapper);

export default ConnectedActionWrapper;
