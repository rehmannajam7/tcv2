import { fakePropType } from 'config/ConfigProvider';
import * as React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { RenderNode, Search } from 'store/flowContext';
import { createEmptyNode } from 'store/helpers';
import AppState from 'store/state';
import {
  DispatchWithState,
  OnOpenNodeEditor,
  onOpenNodeEditor,
  mergeEditorState,
  MergeEditorState,
  handleSearchChange,
  HandleSearchChange,
} from 'store/thunks';

import i18n from 'config/i18n';
import { applyVueInReact } from 'veaury';
// @ts-ignore
import styles from './Sidebar.module.scss';
// @ts-ignore
import Unnnic from '@weni/unnnic-system';
import GuidingSteps from 'components/guidingsteps/GuidingSteps';
import { MouseState } from 'store/editor';

const UnnnicTooltip = applyVueInReact(Unnnic.unnnicToolTip);
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

export interface SidebarStoreProps {
  onCopyClick: () => void;
  onCreateNode: (node: RenderNode) => void;
  onMouseStateChange: (mouseState: MouseState) => void;
  selectionActive: boolean;
  nodes: { [uuid: string]: RenderNode };
  onOpenNodeEditor: OnOpenNodeEditor;
  guidingStep: number;
  currentGuide: string;
  mergeEditorState: MergeEditorState;
  mouseState: MouseState;
  handleSearchChange: HandleSearchChange;
  search: Search;
}

export class Sidebar extends React.Component<SidebarStoreProps> {
  public static contextTypes = {
    config: fakePropType,
  };

  public handleSearchChanged(): void {
    const { isSearchOpen, value } = this.props.search;
    const change = {
      isSearchOpen: !isSearchOpen,
      value: value,
      nodes: [{}],
      selected: 0,
    };
    this.props.handleSearchChange(change);
  }

  private createSendMessageNode(): void {
    console.log('🔵 Sidebar: createSendMessageNode called');

    /* istanbul ignore if -- @preserve */
    if (this.props.guidingStep === 0 && this.props.currentGuide === 'v2') {
      this.props.mergeEditorState({ guidingStep: 1 });
    }

    const emptyNode = createEmptyNode(
      null,
      null,
      1,
      this.context.config.flowType,
    );

    console.log('🔵 Sidebar: Created empty node:', emptyNode);
    console.log('🔵 Sidebar: Calling onCreateNode with node');

    this.props.onCreateNode(emptyNode);
  }

  private getCopyTooltip(): string {
    if (!this.props.selectionActive) {
      return i18n.t('disabled_copy_tooltip');
    }

    return i18n.t('copy_tooltip');
  }

  private getCopyIconScheme(): string {
    if (!this.props.selectionActive) {
      return styles.disabled;
    }

    return styles.enabled;
  }

  private handleCopyClick(): void {
    if (!this.props.selectionActive) {
      return;
    }

    this.props.onCopyClick();
  }

  private toggleMouseState(): void {
    const mouseState =
      this.props.mouseState === MouseState.SELECT
        ? MouseState.DRAG
        : MouseState.SELECT;

    this.props.onMouseStateChange(mouseState);
  }

  /* istanbul ignore next -- @preserve */
  private detectOS() {
    const userAgent = window.navigator.userAgent;
    // Check for macOS
    if (userAgent.indexOf('Macintosh') !== -1) {
      return 'Cmd';
    }
    return 'Ctrl';
  }

  public render(): JSX.Element {
    return (
      <div className={styles.sidebar}>
        <GuidingSteps
          guide="control_tools"
          step={0}
          title={i18n.t('guiding.control_tools.0.title', 'Select and drag')}
          description={i18n.t(
            'guiding.control_tools.0.description',
            `Click here, use the “V” shortcut or hold down the space bar to use the “little hand” tool, with it you will be able to navigate through your entire flow just by clicking and dragging on the screen`,
          )}
          buttonText={i18n.t('guiding.v2.0.button', 'Got it 1/3')}
        >
          <UnnnicTooltip
            enabled={this.props.guidingStep !== 0}
            side="right"
            text={
              this.props.mouseState === MouseState.SELECT
                ? i18n.t('select', 'Select')
                : i18n.t('drag', 'Drag')
            }
            shortcutText={'V'}
          >
            <div
              data-testid="mouse-state"
              className={styles.option}
              onClick={() => this.toggleMouseState()}
            >
              {this.props.mouseState === MouseState.SELECT ? (
                <UnnnicIcon icon="near_me" size="md" />
              ) : (
                <UnnnicIcon icon="back_hand" size="md" />
              )}
            </div>
          </UnnnicTooltip>
        </GuidingSteps>

        <GuidingSteps
          guide="v2"
          step={0}
          title={i18n.t('guiding.v2.0.title', 'New block')}
          description={i18n.t(
            'guiding.v2.0.description',
            `Now just click on this button to create a new block.`,
          )}
          buttonText={i18n.t('guiding.v2.0.button', 'Got it 1/3')}
        >
          <UnnnicTooltip
            text={i18n.t('create_block')}
            enabled={this.props.guidingStep !== 0}
            side="right"
          >
            <div
              data-testid="create-node"
              className={styles.option}
              onClick={() =>
                this.context.config.mutable && this.createSendMessageNode()
              }
            >
              <UnnnicIcon icon="add_circle" size="md" />
            </div>
          </UnnnicTooltip>
        </GuidingSteps>

        <GuidingSteps
          guide="v2"
          step={1}
          title={i18n.t('guiding.v2.1.title', 'Copy and paste')}
          description={i18n.t(
            'guiding.v2.1.description',
            `Finally, you can copy and paste the blocks wherever you want, including in\nanother flow. Click the button or use the shortcut Ctrl C + Ctrl V.`,
          )}
          buttonText={i18n.t('guiding.v2.1.button', 'Got it 2/3')}
        >
          <UnnnicTooltip
            className={styles.left_aligned}
            text={this.getCopyTooltip()}
            enabled={this.props.guidingStep !== 1}
            side="right"
            shortcutText={
              this.props.selectionActive ? `${this.detectOS()} + C` : null
            }
          >
            <div
              data-testid="copy-button"
              className={`${styles.option} ${
                !this.props.selectionActive ? styles.disabled : ''
              }`}
              onClick={() => this.handleCopyClick()}
            >
              <UnnnicIcon
                className={this.getCopyIconScheme()}
                icon="content_copy"
                size="md"
              />
            </div>
          </UnnnicTooltip>
        </GuidingSteps>

        {/* search button */}
        <UnnnicTooltip
          className={styles.left_aligned}
          text={i18n.t('search_in_nodes')}
          side="right"
          shortcutText={`${this.detectOS()} + F`}
          enabled={true}
        >
          <div
            data-testid="search-button"
            className={styles.option}
            onClick={() => this.handleSearchChanged()}
          >
            <UnnnicIcon icon="search" size="md" />
          </div>
        </UnnnicTooltip>

        {/* settings button - REMOVED: Inbox Associations functionality moved to flow creation modal */}
        {/* keywords button - REMOVED: Keywords functionality moved to flow creation modal */}
      </div>
    );
  }
}

/* istanbul ignore next -- @preserve */
const mapStateToProps = ({
  flowContext: { nodes, search },
  editorState: { selectionActive, guidingStep, currentGuide },
}: AppState) => {
  return {
    nodes,
    selectionActive,
    guidingStep,
    currentGuide,
    search,
  };
};

/* istanbul ignore next -- @preserve */
const mapDispatchToProps = (dispatch: DispatchWithState) =>
  bindActionCreators(
    { onOpenNodeEditor, mergeEditorState, handleSearchChange },
    dispatch,
  );

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(Sidebar);
