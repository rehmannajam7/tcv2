import ReactDOM from 'react-dom';
import { react as bindCallbacks } from 'auto-bind';
import { Canvas } from 'components/canvas/Canvas';
import { CanvasDraggableProps } from 'components/canvas/CanvasDraggable';
import Node from 'components/flow/node/Node';
import { getDraggedFrom } from 'components/helpers';
import NodeEditor from 'components/nodeeditor/NodeEditor';
import Simulator from 'components/simulator/Simulator';
import Sidebar from 'components/sidebar/Sidebar';
import Sticky, { STICKY_BODY, STICKY_TITLE } from 'components/sticky/Sticky';
import { ConfigProviderContext, fakePropType } from 'config/ConfigProvider';
import { FlowPosition, StickyNote } from 'flowTypes';
import * as React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import Plumber from 'services/Plumber';
import { DragSelection, DebugState, MouseState } from 'store/editor';
import { RenderNode } from 'store/flowContext';
import { detectLoops, getOrderedNodes } from 'store/helpers';
import { NodeEditorSettings } from 'store/nodeEditor';
import AppState from 'store/state';
import {
  ConnectionEvent,
  DispatchWithState,
  mergeEditorState,
  MergeEditorState,
  NoParamsAC,
  onConnectionDrag,
  OnConnectionDrag,
  OnOpenNodeEditor,
  onOpenNodeEditor,
  onAddToNode,
  OnAddToNode,
  onRemoveNodes,
  OnRemoveNodes,
  OnUpdateCanvasPositions,
  onUpdateCanvasPositions,
  resetNodeEditingState,
  UpdateConnection,
  updateConnection,
  UpdateNodesEditor,
  updateNodesEditor,
  updateSticky,
  UpdateSticky,
  handleSearchChange,
  HandleSearchChange,
} from 'store/thunks';
import {
  createUUID,
  isRealValue,
  NODE_PADDING,
  renderIf,
  timeEnd,
  timeStart,
} from 'utils';
import Debug from 'utils/debug';

import { PopTabType } from 'config/interfaces';

// @ts-ignore
import styles from './Flow.module.scss';
import { applyVueInReact } from 'veaury';
// @ts-ignore
import Unnnic from '@weni/unnnic-system';
import { WeniLoveIcon } from './WeniLoveIcon';
import i18n from '../../config/i18n';
import SearchBar from 'components/search/SearchBar';

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

declare global {
  interface Window {
    fe: any;
  }
}
export interface FlowStoreProps {
  ghostNode: RenderNode;
  debug: DebugState;
  translating: boolean;
  popped: string;
  dragActive: boolean;
  mouseState: MouseState;
  isSearchOpen: boolean;

  mergeEditorState: MergeEditorState;

  stickyMap: { [key: string]: StickyNote };
  nodes: { [uuid: string]: RenderNode };
  nodeEditorSettings: NodeEditorSettings;

  updateConnection: UpdateConnection;
  onOpenNodeEditor: OnOpenNodeEditor;
  onAddToNode: OnAddToNode;
  onUpdateCanvasPositions: OnUpdateCanvasPositions;
  onRemoveNodes: OnRemoveNodes;
  resetNodeEditingState: NoParamsAC;
  onConnectionDrag: OnConnectionDrag;
  updateSticky: UpdateSticky;

  updateNodesEditor?: UpdateNodesEditor;
  handleSearchChange: HandleSearchChange;
}

export interface Translations {
  [uuid: string]: any;
}

export interface FlowState {
  // REMOVED: Modal state - functionality moved to flow creation modal
  // showInboxAssociationsModal: boolean;
  // showKeywordsModal: boolean;
}

export const DRAG_THRESHOLD = 3;
export const REPAINT_TIMEOUT = 500;
export const GHOST_POSITION_INITIAL = { left: -1000, top: -1000 };

export const nodeSpecId = 'node';
export const nodesContainerSpecId = 'node-container';
export const ghostNodeSpecId = 'ghost-node';
export const dragSelectSpecId = 'drag-select';

export const isDraggingBack = (event: ConnectionEvent) => {
  return event.suspendedElementId === event.targetId && event.source !== null;
};

export const getDragStyle = (drag: DragSelection) => {
  const left = Math.min(drag.startX, drag.currentX);
  const top = Math.min(drag.startY, drag.currentY);
  const width = Math.max(drag.startX, drag.currentX) - left;
  const height = Math.max(drag.startY, drag.currentY) - top;
  return {
    left,
    top,
    width,
    height,
  };
};

export class Flow extends React.PureComponent<FlowStoreProps, FlowState> {
  private Plumber: Plumber;
  private nodeContainerUUID: string;
  private canvas: React.RefObject<Canvas>;

  // Refs
  private ghost: any;

  public static contextTypes = {
    config: fakePropType,
  };

  constructor(props: FlowStoreProps, context: ConfigProviderContext) {
    super(props, context);

    this.state = {
      // REMOVED: Modal state initialization - functionality moved to flow creation modal
    };

    this.canvas = React.createRef();

    this.nodeContainerUUID = createUUID();

    this.Plumber = new Plumber();

    /* istanbul ignore next -- @preserve */
    if (context.config.debug) {
      window.fe = new Debug(props, this.props.debug);
    }

    bindCallbacks(this, {
      include: [/Ref$/, /^on/, /^is/, /^get/, /^handle/],
    });

    timeStart('Loaded Flow');
  }

  private ghostRef(ref: any): any {
    return (this.ghost = ref);
  }

  public componentDidMount(): void {
    console.log(
      '🔴 Flow componentDidMount: nodeEditorSettings:',
      this.props.nodeEditorSettings,
    );
    this.Plumber.bind('connection', (event: ConnectionEvent) => {
      this.props.updateConnection(event.sourceId, event.targetId);
    });

    this.Plumber.bind('beforeDrag', (event: ConnectionEvent) => {
      this.beforeConnectionDrag(event);
    });

    this.Plumber.bind('connectionDrag', (event: ConnectionEvent) => {
      this.props.onConnectionDrag(event, this.context.config.flowType);
    });

    this.Plumber.bind('connectionDragStop', (event: ConnectionEvent) =>
      this.onConnectorDrop(event),
    );
    this.Plumber.bind(
      'beforeStartDetach',
      (event: ConnectionEvent) =>
        !this.props.translating && this.context.config.mutable,
    );
    this.Plumber.bind('beforeDetach', (event: ConnectionEvent) => true);
    this.Plumber.bind('beforeDrop', (event: ConnectionEvent) =>
      this.onBeforeConnectorDrop(event),
    );
    this.Plumber.triggerLoaded(this.context.config.onLoad);

    this.checkToShowNewUpdates();

    // Start the guiding tour if configured
    this.startGuiding();

    timeEnd('Loaded Flow');
  }

  public componentDidUpdate(prevProps: FlowStoreProps): void {
    console.log(
      '🔴 Flow componentDidUpdate: nodeEditorSettings changed from',
      prevProps.nodeEditorSettings,
      'to',
      this.props.nodeEditorSettings,
    );

    if (prevProps.nodeEditorSettings !== this.props.nodeEditorSettings) {
      console.log('🔴 Flow: nodeEditorSettings prop has changed!');
    }
  }

  public componentWillUnmount(): void {
    this.Plumber.reset();
  }

  /**
   * Called right before a connector is dropped onto a new node
   */
  private onBeforeConnectorDrop(event: ConnectionEvent): boolean {
    this.props.resetNodeEditingState();
    const fromNodeUUID = event.sourceId.split(':')[0];
    try {
      detectLoops(this.props.nodes, fromNodeUUID, event.targetId);
    } catch {
      return false;
    }
    return true;
  }

  /**
   * Called the moment a connector is done dragging, whether it is dropped on an
   * existing node or on to empty space.
   */
  private onConnectorDrop(event: ConnectionEvent): boolean {
    const ghostNode = this.props.ghostNode;
    // Don't show the node editor if we a dragging back to where we were
    if (isRealValue(ghostNode) && !isDraggingBack(event)) {
      // Wire up the drag from to our ghost node
      this.Plumber.recalculate(ghostNode.node.uuid);

      const dragPoint = getDraggedFrom(ghostNode);

      this.Plumber.connect(
        dragPoint.nodeUUID + ':' + dragPoint.exitUUID,
        ghostNode.node.uuid,
      );

      // Save our position for later
      const { left, top } = (this.ghost && {
        left: this.ghost.ele.offsetLeft,
        top: this.ghost.ele.offsetTop,
      }) || { left: 0, top: 0 };

      this.props.ghostNode.ui.position = { left, top };

      let originalAction = null;
      if (ghostNode.node.actions && ghostNode.node.actions.length === 1) {
        originalAction = ghostNode.node.actions[0];
      }

      // Bring up the node editor
      this.props.onOpenNodeEditor({
        originalNode: ghostNode,
        originalAction,
      });
    }

    if (isDraggingBack(event)) {
      this.props.mergeEditorState({ ghostNode: null });
    }

    /* istanbul ignore next -- @preserve */
    document.removeEventListener('mousemove', (window as any).ghostListener);

    return true;
  }

  private beforeConnectionDrag(event: ConnectionEvent): boolean {
    if (event.source) {
      event.source.dispatchEvent(new Event('disconnect'));
    }
    return !this.props.translating;
  }

  private handleStickyCreation(props: CanvasDraggableProps) {
    const stickyMap = this.props.stickyMap || {};
    const uuid = props.uuid;
    return (
      <Sticky
        key={uuid}
        uuid={uuid}
        sticky={stickyMap[uuid]}
        selected={props.selected}
      />
    );
  }

  private handleNodeCreation(props: CanvasDraggableProps) {
    const onlyNode = Object.keys(this.props.nodes).length === 1;
    return (
      <Node
        onlyNode={onlyNode}
        startingNode={props.idx === 0}
        selected={props.selected}
        key={props.uuid}
        data-spec={nodeSpecId}
        nodeUUID={props.uuid}
        plumberMakeTarget={this.Plumber.makeTarget}
        plumberRemove={this.Plumber.remove}
        plumberRecalculate={this.Plumber.recalculate}
        plumberMakeSource={this.Plumber.makeSource}
        plumberConnectExit={this.Plumber.connectExit}
        plumberUpdateClass={this.Plumber.updateClass}
      />
    );
  }

  private getNodes(): CanvasDraggableProps[] {
    return getOrderedNodes(this.props.nodes).map(
      (renderNode: RenderNode, idx: number) => {
        return {
          uuid: renderNode.node.uuid,
          position: renderNode.ui.position,
          elementCreator: this.handleNodeCreation,
          config: renderNode,
          idx,
        };
      },
    );
  }

  private getStickies(): CanvasDraggableProps[] {
    const stickyMap = this.props.stickyMap || {};
    return Object.keys(stickyMap).map((uuid: string, idx: number) => {
      return {
        uuid,
        elementCreator: this.handleStickyCreation,
        position: stickyMap[uuid].position,
        idx,
      };
    });
  }

  private getDragNode(): JSX.Element {
    return isRealValue(this.props.ghostNode) ? (
      <div
        data-spec={ghostNodeSpecId}
        key={this.props.ghostNode.node.uuid}
        style={{ position: 'absolute', display: 'block', visibility: 'hidden' }}
      >
        <Node
          onlyNode={false}
          selected={false}
          startingNode={false}
          ref={this.ghostRef}
          ghost={true}
          nodeUUID={this.props.ghostNode.node.uuid}
          plumberMakeTarget={this.Plumber.makeTarget}
          plumberRemove={this.Plumber.remove}
          plumberRecalculate={this.Plumber.recalculate}
          plumberMakeSource={this.Plumber.makeSource}
          plumberConnectExit={this.Plumber.connectExit}
          plumberUpdateClass={this.Plumber.updateClass}
        />
      </div>
    ) : null;
  }

  private getSimulator(): JSX.Element {
    return renderIf(
      this.context.config.endpoints &&
        this.context.config.endpoints.simulateStart &&
        this.context.config.mutable,
    )(
      <Simulator
        key="simulator"
        popped={this.props.popped}
        mergeEditorState={this.props.mergeEditorState}
        onToggled={(visible: boolean, tab: PopTabType) => {
          this.props.mergeEditorState({
            popped: visible ? tab : null,
          });
        }}
      />,
    );
  }

  private getNodeEditor(): JSX.Element {
    console.log(
      '🔴 Flow.getNodeEditor: nodeEditorSettings:',
      this.props.nodeEditorSettings,
    );
    console.log(
      '🔴 Flow.getNodeEditor: should render NodeEditor:',
      this.props.nodeEditorSettings !== null,
    );

    return renderIf(this.props.nodeEditorSettings !== null)(
      <NodeEditor
        key="node-editor"
        helpArticles={this.context.config.help}
        plumberConnectExit={this.Plumber.connectExit}
      />,
    );
  }

  // TODO: this should be a callback from the canvas
  private handleDoubleClick(position: FlowPosition): void {
    const { left, top } = position;
    this.props.updateSticky(createUUID(), {
      position: { left: left - 90 + NODE_PADDING, top: top - 40 },
      title: STICKY_TITLE,
      body: STICKY_BODY,
    });
  }

  public handleDragging(uuids: string[]): void {
    uuids.forEach((uuid: string) => {
      try {
        const ele = document.getElementById(uuid);
        const exits = ele.querySelectorAll('.jtk-connected');
        this.Plumber.revalidate([ele, ...exits]);
      } catch (error) {}
    });
  }

  public handleCanvasLoaded(): void {
    this.Plumber.setContainer('panzoom');
  }

  private callCanvasCopy(): void {
    this.canvas.current.manuallyCopy();
  }

  private callCanvasCreateNode(node: RenderNode): void {
    console.log('🟢 Flow: callCanvasCreateNode called with node:', node);

    this.canvas.current.manuallyCreateNode(node, (newNode: RenderNode) => {
      console.log('🟢 Flow: manuallyCreateNode callback - newNode:', newNode);
      console.log('🟢 Flow: Calling onOpenNodeEditor with settings:', {
        originalNode: newNode,
        originalAction: newNode.node.actions[0],
      });

      this.props.onOpenNodeEditor({
        originalNode: newNode,
        originalAction: newNode.node.actions[0],
      });
    });
  }

  private handleZoom(scale: number) {
    this.Plumber.setZoom(scale);
  }

  private handleMouseStateChange(mouseState: MouseState): void {
    this.props.mergeEditorState({ mouseState });
  }

  private startGuiding() {
    const initialGuide = this.context.config.initialGuide;
    if (initialGuide) {
      this.props.mergeEditorState({
        currentGuide: initialGuide,
        guidingStep: 0,
      });
    }
  }

  private showNewUpdatesModal(): void {
    let newUpdatesModalEl: HTMLDivElement = document.querySelector(
      '#new-updates-modal',
    );

    if (!newUpdatesModalEl) {
      newUpdatesModalEl = document.createElement('div');
      newUpdatesModalEl.setAttribute('id', 'new-updates-modal');
      document.body.appendChild(newUpdatesModalEl);
    }

    if (newUpdatesModalEl.hasChildNodes()) {
      return;
    }

    ReactDOM.render(
      <UnnnicModal className={styles.new_updates} closeIcon={false}>
        <div className={styles.content}>
          <WeniLoveIcon />
          <span className={styles.title}>
            {i18n.t('new_updates.title', 'News in the area!')}
          </span>
          {/* <span className={styles.description}>
            {i18n.t('new_updates.description', 'Whats new?')}
          </span> */}

          <div className={styles.news_list}>
            <span>
              •&nbsp;{' '}
              {i18n.t(
                'new_updates.news.first',
                'Now you can use your “little hand” to navigate in your flow',
              )}
            </span>
            <span>
              •&nbsp; {i18n.t('new_updates.news.second', 'Zoom tool')}
            </span>
            <span>
              •&nbsp;{' '}
              {i18n.t(
                'new_updates.news.third',
                "It's easier to know where your flow is going with the new colors on the arrows that connect the blocks",
              )}
            </span>
            <span>
              •&nbsp;{' '}
              {i18n.t(
                'new_updates.news.fourth',
                'The feedback modal is different and takes up less space on your screen',
              )}
            </span>
            <span>
              •&nbsp;{' '}
              {i18n.t(
                'new_updates.news.fifth',
                "Now it's easier to find the start of your flow",
              )}
            </span>
          </div>

          <div className={styles.footer}>
            <span>
              {i18n.t(
                'new_updates.footer',
                'Feel free to send feedbacks about your experience',
              )}
            </span>
          </div>
        </div>

        <div className={styles.buttons}>
          <UnnnicButton
            type="tertiary"
            text={i18n.t('new_updates.buttons.first', 'Close')}
            onClick={() => {
              ReactDOM.unmountComponentAtNode(newUpdatesModalEl);
            }}
          />
          <UnnnicButton
            className={styles.primary}
            type="primary"
            text={i18n.t('new_updates.buttons.second', 'Show me everything')}
            onClick={() => {
              this.startGuiding();
              ReactDOM.unmountComponentAtNode(newUpdatesModalEl);
            }}
          />
        </div>
      </UnnnicModal>,
      newUpdatesModalEl,
    );
  }

  private checkToShowNewUpdates() {
    if (this.context.config.showNewUpdates) {
      this.showNewUpdatesModal();
    }
  }

  // REMOVED: Modal handlers for sidebar - functionality moved to flow creation modal
  // private handleOpenInboxAssociationsModal = (): void => {
  //   this.setState({ showInboxAssociationsModal: true });
  // };

  // private handleCloseInboxAssociationsModal = (): void => {
  //   this.setState({ showInboxAssociationsModal: false });
  // };

  // private handleOpenKeywordsModal = (): void => {
  //   this.setState({ showKeywordsModal: true });
  // };

  // private handleCloseKeywordsModal = (): void => {
  //   this.setState({ showKeywordsModal: false });
  // };

  public render(): JSX.Element {
    const nodes = this.getNodes();

    const draggables = this.getStickies().concat(nodes);

    return (
      <>
        {this.getSimulator()}
        {this.getNodeEditor()}

        <Sidebar
          mouseState={this.props.mouseState}
          onCopyClick={() => this.callCanvasCopy()}
          onCreateNode={(node: RenderNode) => this.callCanvasCreateNode(node)}
          onMouseStateChange={(mouseState: MouseState) =>
            this.handleMouseStateChange(mouseState)
          }
        />

        {this.props.isSearchOpen && <SearchBar />}

        <Canvas
          ref={this.canvas}
          mutable={this.context.config.mutable}
          draggingNew={!!this.props.ghostNode && !this.props.nodeEditorSettings}
          newDragElement={this.getDragNode()}
          onDragging={this.handleDragging}
          uuid={this.nodeContainerUUID}
          dragActive={this.props.dragActive}
          mergeEditorState={this.props.mergeEditorState}
          onRemoveNodes={this.props.onRemoveNodes}
          draggables={draggables}
          onDoubleClick={this.handleDoubleClick}
          onUpdatePositions={this.props.onUpdateCanvasPositions}
          onLoaded={this.handleCanvasLoaded}
          nodes={this.props.nodes}
          updateNodesEditor={this.props.updateNodesEditor}
          onZoom={this.handleZoom}
          mouseState={this.props.mouseState}
          onMouseStateChange={(mouseState: MouseState) =>
            this.handleMouseStateChange(mouseState)
          }
          handleSearchChange={value => this.props.handleSearchChange(value)}
        ></Canvas>
        <div id="activity_recent_messages"></div>

        {/* REMOVED: Modal rendering - functionality moved to flow creation modal */}
      </>
    );
  }
}

/* istanbul ignore next -- @preserve */
const mapStateToProps = ({
  flowContext: { definition, nodes, search },
  editorState: {
    ghostNode,
    debug,
    translating,
    popped,
    dragActive,
    mouseState,
  },
  nodeEditor: { settings },
}: AppState) => {
  console.log('🔴 Flow mapStateToProps: nodeEditor.settings =', settings);
  return {
    nodeEditorSettings: settings,
    stickyMap: definition._ui.stickies,
    nodes,
    ghostNode,
    debug,
    translating,
    popped,
    dragActive,
    mouseState,
    isSearchOpen: search.isSearchOpen,
  };
};

/* istanbul ignore next -- @preserve */
const mapDispatchToProps = (dispatch: DispatchWithState) =>
  bindActionCreators(
    {
      mergeEditorState,
      resetNodeEditingState,
      onConnectionDrag,
      onOpenNodeEditor,
      onAddToNode,
      onUpdateCanvasPositions,
      onRemoveNodes,
      updateConnection,
      updateSticky,
      updateNodesEditor,
      handleSearchChange,
    },
    dispatch,
  );

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(Flow);
