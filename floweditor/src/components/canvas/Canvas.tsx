import { react as bindCallbacks } from 'auto-bind';
import panzoom, { PanZoom } from 'panzoom';
import {
  CanvasDraggable,
  CanvasDraggableProps,
} from 'components/canvas/CanvasDraggable';
import GuidingSteps from 'components/guidingsteps/GuidingSteps';
import { getDraggablesInBox, reflow } from 'components/canvas/helpers';
import { DRAG_THRESHOLD } from 'components/flow/Flow';
import { Dimensions, Exit, FlowNode, FlowPosition } from 'flowTypes';
import mutate from 'immutability-helper';
import React from 'react';
import i18n from 'config/i18n';
import { CanvasPositions, DragSelection, MouseState } from 'store/editor';
import { addPosition } from 'store/helpers';
import { HandleSearchChange, MergeEditorState } from 'store/thunks';
import { COLLISION_FUDGE, getOS, throttle } from 'utils';

import styles from './Canvas.module.scss';
import nodesCopy from '../../components/copyAndPasteNodes';
import { RenderNode } from '../../store/flowContext';

import { applyVueInReact, applyPureVueInReact } from 'veaury';
// @ts-ignore
import Unnnic from '@weni/unnnic-system';
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
const UnnnicTooltip = applyPureVueInReact(Unnnic.unnnicToolTip, {
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

export const CANVAS_PADDING = 300;
export const REFLOW_QUIET = 200;
const TRANSFORM_START_X = 160;
const TRANSFORM_START_Y = 100;

export interface CanvasProps {
  uuid: string;
  dragActive: boolean;
  draggingNew: boolean;
  newDragElement: JSX.Element;
  draggables: CanvasDraggableProps[];
  mutable: boolean;
  mouseState: MouseState;
  onLoaded: () => void;
  onDragging: (draggedUUIDs: string[]) => void;
  onUpdatePositions: (positions: CanvasPositions) => void;
  onRemoveNodes: (nodeUUIDs: string[]) => void;
  onDoubleClick: (position: FlowPosition) => void;
  onZoom: (scale: number) => void;
  onMouseStateChange(mouseState: MouseState): void;
  mergeEditorState: MergeEditorState;
  nodes: any;
  updateNodesEditor: any;
  handleSearchChange?: HandleSearchChange;
}

interface CanvasState {
  dragDownPosition: FlowPosition | null;
  dragUUID: string | null;
  dragGroup: boolean;
  dragSelection: DragSelection | null;
  uuid: string;
  positions: CanvasPositions;
  selected: CanvasPositions;
  currentZoom: number;
  panzoomInstance: PanZoom;
}

export class Canvas extends React.PureComponent<CanvasProps, CanvasState> {
  private ele!: HTMLDivElement;
  private canvasBg!: HTMLDivElement;
  private isScrollingY: any;
  private isScrollingX: any;

  private reflowTimeout: any;

  // when auto scrolling we need to move dragged elements
  private lastX!: number | null;
  private lastY!: number | null;

  private lastCanvasX!: number | null;
  private lastCanvasY!: number | null;

  private mouseX: number;
  private mouseY: number;

  // did we just select something
  private justSelected = false;

  private onDragThrottled: (uuids: string[]) => void = throttle(
    this.props.onDragging,
    15,
  );
  private onMouseThrottled: (event: any) => void = throttle(
    this.handleMouseMove.bind(this),
    15,
  );
  private onMouseCanvasThrottled: (event: any) => void = throttle(
    this.handleMouseMoveCanvas.bind(this),
    30,
  );
  private updatePositionsThrottled: (
    pageX: number,
    pageY: number,
    clientY: number,
  ) => void = throttle(this.updatePositions.bind(this), 15);

  constructor(props: CanvasProps) {
    super(props);

    const positions: { [uuid: string]: FlowPosition } = {};
    this.props.draggables.forEach((draggable: CanvasDraggableProps) => {
      positions[draggable.uuid] = draggable.position;
    });

    this.state = {
      dragDownPosition: null,
      dragUUID: null,
      dragGroup: false,
      dragSelection: null,
      uuid: this.props.uuid,
      selected: {},
      positions,
      currentZoom: 100,
      panzoomInstance: null,
    };

    bindCallbacks(this, {
      include: [/^handle/, /^render/, /^mark/, /^do/, /^ensure/],
    });
  }

  public manuallyCopy() {
    document.execCommand('copy');
  }

  public manuallyCreateNode(node: RenderNode, callback: Function) {
    node.ui.position = this.getNewNodePosition();
    callback(node);
  }

  private getNewNodePosition(): FlowPosition {
    const {
      transformOffsetX,
      transformOffsetY,
      transformScale,
    } = this.getTransformOffsets();

    const left = (-transformOffsetX + TRANSFORM_START_X) * (1 / transformScale);
    const top = (-transformOffsetY + TRANSFORM_START_Y) * (1 / transformScale);

    return { left, top };
  }

  public componentDidMount(): void {
    /* istanbul ignore next -- @preserve */
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('keydown', this.handleWindowKeyDown);
    this.ele.addEventListener('keydown', this.handleCanvasKeyDown);
    this.ele.addEventListener('wheel', this.handleMouseWheel, {
      passive: true,
    });

    window.document.addEventListener('copy', event => {
      if (Object.keys(this.state.selected).length === 0) {
        return;
      }

      const instance = new nodesCopy();

      const edgeCorner: any = {
        left: null,
        top: null,
      };

      const selectedNodes = this.props.draggables.filter(({ uuid }) =>
        Object.keys(this.state.selected).includes(uuid),
      );

      const staticUuids = instance.getStaticUuids(selectedNodes);

      let nodes = instance.replaceUuidsToUpdate(
        selectedNodes
          .map(({ config }) => ({
            node: config.node,
            ui: config.ui,
            inboundConnections: config.inboundConnections,
          }))
          .map(node => JSON.parse(JSON.stringify(node))),
        staticUuids,
      );

      nodes.forEach((node: any) => {
        if (!node.ui) {
          return;
        }

        if (
          edgeCorner.left === null ||
          node.ui.position.left < edgeCorner.left
        ) {
          edgeCorner.left = node.ui.position.left;
        }

        if (edgeCorner.top === null || node.ui.position.top < edgeCorner.top) {
          edgeCorner.top = node.ui.position.top;
        }
      });

      nodes = nodes.map((node: any) => ({
        ...node,
        ui: {
          ...node.ui,
          position: {
            left: node.ui.position.left - edgeCorner.left,
            top: node.ui.position.top - edgeCorner.top,
          },
        },
      }));

      event.clipboardData.setData('application/json', JSON.stringify(nodes));
      event.preventDefault();

      Unnnic.unnnicCallAlert({
        props: {
          text:
            nodes.length > 1 ? i18n.t('copy.multiple') : i18n.t('copy.single'),
          title: i18n.t('forms.Success'),
          icon: 'check-circle-1-1-1',
          scheme: 'feedback-green',
          position: 'bottom-right',
          closeText: i18n.t('buttons.close'),
        },
        seconds: 6,
      });
    });

    window.document.addEventListener('paste', event => {
      if (event.clipboardData.getData('application/json')) {
        const nodes = JSON.parse(
          event.clipboardData.getData('application/json'),
        );

        const instance = new nodesCopy();

        const nodesPasted = instance.createNewUuids(nodes);

        const transform = this.state.panzoomInstance.getTransform();
        const scaleInverse = parseFloat((1 / transform.scale).toPrecision(16));

        nodesPasted.forEach((item: RenderNode) => {
          const filteredInboundConnections = this.filterExistingInbounds(
            nodesPasted,
            item,
          );
          const filteredExits = this.filterExistingExits(
            nodesPasted,
            item.node,
          );
          this.props.nodes[item.node.uuid] = {
            ...item,
            node: {
              ...item.node,
              exits: filteredExits,
            },
            inboundConnections: filteredInboundConnections,
            ui: {
              ...item.ui,
              position: {
                left:
                  item.ui.position.left +
                  (this.mouseX - transform.x) * scaleInverse,
                top:
                  item.ui.position.top +
                  (this.mouseY - transform.y) * scaleInverse,
              },
            },
          };
        });

        this.props.updateNodesEditor(this.props.nodes);

        const nodesPositions: CanvasPositions = {};
        Object.keys(this.props.nodes).forEach((uuid: string) => {
          const node = this.props.nodes[uuid];
          if (node.ui && node.ui.position) {
            nodesPositions[uuid] = node.ui.position;
          }
        });
        this.props.onUpdatePositions(nodesPositions);
      }
    });

    this.loadPanZoom();

    this.props.onLoaded();
  }

  private loadPanZoom() {
    const canvas = document.getElementById('panzoom');

    const canvasComponent = this;

    const panzoomInstance = panzoom(canvas, {
      maxZoom: 1,
      minZoom: 0.15,
      beforeMouseDown: () => {
        const shouldIgnore = this.isInSelectState();
        return shouldIgnore;
      },
      onDoubleClick: function() {
        return false;
      },
      beforeWheel: function(e) {
        let shouldIgnore = !e.ctrlKey;

        if (getOS() === 'Macintosh') {
          shouldIgnore = !e.metaKey;
        }

        return shouldIgnore;
      },
      filterKey: function(...args: any) {
        const event = args[0];
        if (event.target !== canvasComponent.ele) {
          return true;
        }
        return false;
      },
      zoomDoubleClickSpeed: 1,
    });

    panzoomInstance.on('zoom', (e: PanZoom) => {
      const transform = e.getTransform();
      this.props.onZoom(transform.scale);
      this.canvasBg.style.backgroundSize = `${transform.scale *
        40}px ${transform.scale * 40}px`;
      this.setState({ currentZoom: Math.round(transform.scale * 100) });
    });

    panzoomInstance.on('panstart', (e: PanZoom) => {
      this.props.onMouseStateChange(MouseState.DRAGGING);
    });

    panzoomInstance.on('pan', (e: PanZoom) => {
      const transform = e.getTransform();
      this.canvasBg.style.backgroundPosition = `${transform.x}px ${transform.y}px`;
    });

    panzoomInstance.on('panend', (e: PanZoom) => {
      this.props.onMouseStateChange(MouseState.DRAG);
    });

    const startingNode = this.getStartingNode();
    if (startingNode.position) {
      const viewportWidth = document.documentElement.clientWidth;
      panzoomInstance.moveTo(
        viewportWidth / 2 - startingNode.position.left,
        TRANSFORM_START_Y - startingNode.position.top,
      );
    }

    this.setState({ panzoomInstance });
  }

  private isInSelectState() {
    return this.props.mouseState === MouseState.SELECT;
  }

  private filterExistingExits(nodeList: RenderNode[], node: FlowNode): Exit[] {
    const exits: Exit[] = node.exits || [];
    const filteredExits: Exit[] = [];

    for (const exit of exits) {
      if (exit.destination_uuid) {
        let hasDestination = false;
        for (const n of nodeList) {
          if (n.node.uuid === exit.destination_uuid) {
            hasDestination = true;
            break;
          }
        }

        if (hasDestination) {
          filteredExits.push(exit);
        } else {
          filteredExits.push({ ...exit, destination_uuid: undefined });
        }
      } else {
        filteredExits.push(exit);
      }
    }

    return filteredExits;
  }

  private filterExistingInbounds(
    nodeList: RenderNode[],
    node: RenderNode,
  ): { [nodeUUID: string]: string } {
    const inboundConnections: { [nodeUUID: string]: string } =
      node.inboundConnections || {};
    const filteredInboundConnections: { [nodeUUID: string]: string } = {};

    for (const key of Object.keys(inboundConnections)) {
      const inboundConnection = inboundConnections[key];
      for (const n of nodeList) {
        if (n.node.exits.find(exit => exit.uuid === key)) {
          filteredInboundConnections[key] = inboundConnection;
          break;
        }
      }
    }

    return filteredInboundConnections;
  }

  private handleMouseWheel(event: any) {
    if (getOS() === 'Macintosh') {
      if (event.metaKey) return;
    } else {
      if (event.ctrlKey) return;
    }
    const transforms = this.state.panzoomInstance.getTransform();

    if (event.shiftKey) {
      this.state.panzoomInstance.moveTo(
        transforms.x - event.deltaY,
        transforms.y - event.deltaX,
      );
    } else {
      this.state.panzoomInstance.moveTo(
        transforms.x - event.deltaX,
        transforms.y - event.deltaY,
      );
    }
  }

  private handleKeyDown(event: any): void {
    if (
      this.state.selected &&
      (event.key === 'Backspace' || event.key === 'Delete')
    ) {
      const nodeUUIDs = Object.keys(this.state.selected);
      if (nodeUUIDs.length > 0) {
        this.props.onRemoveNodes(Object.keys(this.state.selected));
      }
    }
  }

  private handleCanvasKeyDown(event: any) {
    if (event.key === 'v' && !(event.ctrlKey || event.metaKey)) {
      if (this.props.mouseState === MouseState.SELECT) {
        this.props.onMouseStateChange(MouseState.DRAG);
      } else {
        this.props.onMouseStateChange(MouseState.SELECT);
      }
    }

    if (event.key === ' ' || event.key === 'Space') {
      if (event.target === document.body) {
        event.preventDefault();
      }
      if (this.props.mouseState === MouseState.SELECT) {
        this.props.onMouseStateChange(MouseState.DRAG);
      }
    }

    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      event.stopPropagation();
      this.moveToStart();
    }

    if (event.key.toLowerCase() === 'f' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      this.props.handleSearchChange({
        isSearchOpen: true,
        nodes: [],
        value: '',
        selected: 0,
      });

      const searchInputElement = document.getElementById(
        'searchBarInputElementDiv',
      );
      if (searchInputElement) {
        const input = (searchInputElement.getElementsByClassName(
          'input-itself',
        )[0] as unknown) as HTMLTextAreaElement;
        input.focus();
      }
    }
  }

  private handleKeyUp(event: any): void {
    if (event.key === ' ' || event.key === 'Space') {
      this.props.onMouseStateChange(MouseState.SELECT);
    }
  }

  private handleWindowKeyDown(event: any): void {
    if (event.key === ' ' || event.key === 'Space') {
      if (event.target === this.ele) {
        event.preventDefault();
      }
    }
  }

  public componentWillUnmount(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('keydown', this.handleWindowKeyDown);
    this.ele.removeEventListener('keydown', this.handleCanvasKeyDown);
    this.ele.removeEventListener('wheel', this.handleMouseWheel);
  }

  public componentDidUpdate(
    prevProps: CanvasProps,
    prevState: CanvasState,
  ): void {
    // traceUpdate(this, prevProps, prevState);

    let updated = false;
    let updatedPositions = { ...this.state.positions };

    // are we being given something new
    this.props.draggables.forEach((draggable: CanvasDraggableProps) => {
      if (!this.state.positions[draggable.uuid]) {
        updatedPositions = mutate(updatedPositions, {
          $merge: { [draggable.uuid]: draggable.position },
        });
        updated = true;
      }
    });

    // have we removed something
    Object.keys(updatedPositions).forEach((uuid: string) => {
      if (
        !this.props.draggables.find(
          (draggable: CanvasDraggableProps) => draggable.uuid === uuid,
        )
      ) {
        updatedPositions = mutate(updatedPositions, {
          $unset: [[uuid]],
        } as any);
        updated = true;
      }
    });

    if (updated) {
      this.setState({ positions: updatedPositions });
    }

    let selectionActive = false;
    if (this.state.selected && Object.keys(this.state.selected).length > 0) {
      selectionActive = true;
    }

    this.props.mergeEditorState({
      selectionActive,
    });
  }

  public renderSelectionBox(): JSX.Element | null {
    const drag = this.state.dragSelection;

    if (drag && drag.startX && drag.startY && drag.currentX && drag.currentY) {
      const left = Math.min(drag.startX, drag.currentX);
      const top = Math.min(drag.startY, drag.currentY);
      const width = Math.max(drag.startX, drag.currentX) - left;
      const height = Math.max(drag.startY, drag.currentY) - top;

      if (this.state.dragSelection && this.state.dragSelection.startX) {
        return (
          <div
            className={styles.drag_selection}
            style={{ left, top, width, height }}
          />
        );
      }
    }

    return null;
  }

  private isClickOnCanvas(event: React.MouseEvent<HTMLDivElement>): boolean {
    // ignore right clicks
    if (event.nativeEvent.which === 3) {
      return false;
    }
    return (event.target as any).id === 'canvas';
  }

  private getTransformOffsets() {
    const transformOffsetX = this.state.panzoomInstance.getTransform().x;
    const transformOffsetY = this.state.panzoomInstance.getTransform().y;
    const transformScale = this.state.panzoomInstance.getTransform().scale;
    return { transformOffsetX, transformOffsetY, transformScale };
  }

  private handleMouseDown(event: React.MouseEvent<HTMLDivElement>): void {
    // ignore right clicks
    if (event.nativeEvent.which === 3) {
      return;
    }

    if (!this.props.mutable) {
      return;
    }

    if (this.isInSelectState()) {
      const offset = this.ele.getBoundingClientRect();

      this.justSelected = false;
      if (this.isClickOnCanvas(event)) {
        const {
          transformOffsetX,
          transformOffsetY,
          transformScale,
        } = this.getTransformOffsets();

        const startX =
          (event.pageX - offset.left - transformOffsetX) * (1 / transformScale);
        const startY =
          (event.pageY - offset.top - window.scrollY - transformOffsetY) *
          (1 / transformScale);

        this.setState({
          dragSelection: { startX, startY, currentX: startX, currentY: startY },
        });
      }
    }
  }

  private handleMouseMoveCanvas(event: React.MouseEvent<HTMLDivElement>): void {
    this.mouseX = event.pageX;
    this.mouseY = event.pageY;
  }

  private handleMouseMove(event: React.MouseEvent<HTMLDivElement>): void {
    if (!this.props.mutable) {
      return;
    }

    if (this.props.draggingNew) {
      this.lastX = event.pageX;
      this.lastY = event.pageY;
      this.updateStateWithScroll(event.clientX, event.clientY);
      if (this.state.dragUUID) {
        this.updatePositions(
          event.pageX,
          event.pageY,
          event.clientX,
          event.clientY,
        );
      }
      return;
    }

    if (this.isInSelectState()) {
      if (this.state.dragSelection && this.state.dragSelection.startX) {
        const drag = this.state.dragSelection;

        if (
          drag &&
          drag.startX &&
          drag.startY &&
          drag.currentX &&
          drag.currentY
        ) {
          const left = Math.min(drag.startX, drag.currentX);
          const top = Math.min(drag.startY, drag.currentY);
          const right = Math.max(drag.startX, drag.currentX);
          const bottom = Math.max(drag.startY, drag.currentY);

          const selected = getDraggablesInBox(this.state.positions, {
            left,
            top,
            right,
            bottom,
          });

          const offset = this.ele.getBoundingClientRect();
          const {
            transformOffsetX,
            transformOffsetY,
            transformScale,
          } = this.getTransformOffsets();

          this.setState({
            dragSelection: {
              startX: drag.startX,
              startY: drag.startY,
              currentX:
                (event.pageX - offset.left - transformOffsetX) *
                (1 / transformScale),
              currentY:
                (event.pageY - offset.top - window.scrollY - transformOffsetY) *
                (1 / transformScale),
            },
          });

          this.setState({ selected });

          if (Object.keys(selected).length > 0) {
            this.justSelected = true;
          }
        }
      }

      if (this.state.dragUUID) {
        this.updatePositions(
          event.pageX,
          event.pageY,
          event.clientX,
          event.clientY,
        );
      }
    }
  }

  private scrollCanvasY(amount: number): void {
    if (!this.isScrollingY) {
      this.isScrollingY = true;

      this.isScrollingY = window.setInterval(() => {
        if (this.lastX && this.lastY) {
          // as we scroll we need to move our dragged items along with us
          this.state.panzoomInstance.moveBy(0, amount, false);
          this.updatePositions(this.lastX, this.lastY, 0, 0);
        }
      }, 30);
    }
  }

  private scrollCanvasX(amount: number): void {
    if (!this.isScrollingX) {
      this.isScrollingX = true;

      this.isScrollingX = window.setInterval(() => {
        if (this.lastX && this.lastY) {
          // as we scroll we need to move our dragged items along with us
          this.state.panzoomInstance.moveBy(amount, 0, false);
          this.updatePositions(this.lastX, this.lastY, 0, 0);
        }
      }, 30);
    }
  }

  private handleMouseUpCapture(event: React.MouseEvent<HTMLDivElement>): void {
    if (!this.props.mutable) {
      return;
    }

    // ignore right clicks
    if (event.nativeEvent.which === 3) {
      return;
    }

    this.lastX = null;
    this.lastY = null;
    if (this.state.dragUUID) {
      this.setState({
        dragDownPosition: null,
        dragSelection: null,
        dragUUID: null,
      });
    }

    if (!this.justSelected) {
      this.props.mergeEditorState({
        dragActive: false,
      });

      this.setState({ selected: {} });
    }

    if (this.state.dragSelection && this.state.dragSelection.startX) {
      this.setState({
        dragSelection: {
          startX: undefined,
          startY: undefined,
          currentX: undefined,
          currentY: undefined,
        },
      });
    }

    this.justSelected = false;
  }

  public handleUpdateDimensions(uuid: string, dimensions: Dimensions): void {
    if (dimensions.width && dimensions.height) {
      let pos = this.state.positions[uuid];
      if (!pos) {
        pos = this.props.draggables.find(
          (item: CanvasDraggableProps) => item.uuid === uuid,
        )!.position;
      }

      const newPosition = {
        left: pos.left,
        top: pos.top,
        right: pos.left + dimensions.width,
        bottom: pos.top + dimensions.height,
      };

      if (
        newPosition.bottom !== pos.bottom ||
        newPosition.right !== pos.right
      ) {
        this.setState((prevState: CanvasState) => {
          const newPositions = mutate(prevState.positions, {
            $merge: {
              [uuid]: newPosition,
            },
          });

          return {
            positions: newPositions,
          };
        }, this.markReflow);
      }
    }
  }

  // Get the node with the lowest top position
  public getStartingNode() {
    let startingNodeUuid: string = null;
    let startingNode: FlowPosition | null = null;

    if (this.props.nodes) {
      Object.keys(this.props.nodes).forEach(uuid => {
        const position = this.state.positions[uuid];
        if (position && (!startingNode || position.top < startingNode.top)) {
          startingNode = position;
          startingNodeUuid = uuid;
        }
      });
    }

    return { position: startingNode, uuid: startingNodeUuid };
  }

  public doReflow(): void {
    const reflowPositions = { ...this.state.positions };
    delete reflowPositions[this.state.dragUUID];

    const { uuid: startingNodeUuid } = this.getStartingNode();
    const { positions, changed } = reflow(
      reflowPositions,
      COLLISION_FUDGE,
      startingNodeUuid,
    );

    if (changed) {
      this.setState({ positions });

      if (changed) {
        this.props.onUpdatePositions(
          changed.reduce((results: CanvasPositions, uuid: string) => {
            results[uuid] = positions[uuid];
            return results;
          }, {}),
        );
      }
    }

    this.props.onDragging(changed);
  }

  private markReflow(): void {
    if (this.reflowTimeout) {
      clearTimeout(this.reflowTimeout);
    }

    this.reflowTimeout = setTimeout(() => {
      // only reflow if we aren't dragging
      if (!this.state.dragUUID) {
        this.doReflow();
      }
    }, REFLOW_QUIET);
  }

  /**
   * Updates the state of the canvas, expanding and scrolling as needed
   * @param windowX the mouse position in the viewport
   * @param windowY the mouse position in the viewport
   * @param otherState optional state to set
   */
  private updateStateWithScroll(
    windowX: number,
    windowY: number,
    otherState: Partial<CanvasState> = {},
  ): void {
    const viewportHeight = document.documentElement.clientHeight;
    const viewportWidth = document.documentElement.clientWidth;
    const MARGIN = 100;

    this.setState(
      {
        ...(otherState as CanvasState),
      },
      () => {
        // check if we need to scroll our canvas

        if (!this.isScrollingY && windowY !== 0) {
          if (windowY + MARGIN > viewportHeight) {
            this.scrollCanvasY(-15);
          } else if (windowY < MARGIN) {
            this.scrollCanvasY(+15);
          }
        }
        // if we are scrolling but given a clientY then user is mousing
        else if (
          windowY !== 0 &&
          (windowY > MARGIN && windowY + MARGIN < viewportHeight)
        ) {
          window.clearInterval(this.isScrollingY);
          this.isScrollingY = null;
        }

        if (!this.isScrollingX && windowX !== 0) {
          if (windowX + MARGIN > viewportWidth) {
            this.scrollCanvasX(-15);
          } else if (windowX < MARGIN) {
            this.scrollCanvasX(+15);
          }
        }
        // if we are scrolling but given a clientX then user is mousing
        else if (
          windowX !== 0 &&
          (windowX > MARGIN && windowX + MARGIN < viewportWidth)
        ) {
          window.clearInterval(this.isScrollingX);
          this.isScrollingX = null;
        }
      },
    );
  }

  private updatePositions(
    pageX: number,
    pageY: number,
    clientX: number,
    clientY: number,
  ): void {
    if (this.state.dragUUID) {
      const { dragUUID } = this.state;

      // save off the last update, if we scroll on the user's behalf we'll need this
      this.lastX = pageX;
      this.lastY = pageY;

      const startPosition = this.props.dragActive
        ? this.state.selected[dragUUID]
        : this.state.positions[dragUUID];

      const offset = this.ele.getBoundingClientRect();
      const {
        transformOffsetX,
        transformOffsetY,
        transformScale,
      } = this.getTransformOffsets();
      const [canvasDiffX, canvasDiffY] = [
        this.lastCanvasX - transformOffsetX,
        this.lastCanvasY - transformOffsetY,
      ];

      if (this.state.dragDownPosition) {
        const xd =
          (pageX -
            offset.left -
            this.state.dragDownPosition.left -
            startPosition.left +
            canvasDiffX) *
          (1 / transformScale);

        const yd =
          (pageY -
            offset.top -
            this.state.dragDownPosition.top -
            startPosition.top -
            window.scrollY +
            canvasDiffY) *
          (1 / transformScale);

        let lowestNode: number | undefined = 0;
        if (this.props.dragActive) {
          const delta = { left: xd, top: yd };
          const prevState = this.state;
          const uuids = Object.keys(prevState.selected);
          let newPositions: { [uuid: string]: FlowPosition } = {};

          uuids.forEach((uuid: string) => {
            const newPosition = addPosition(prevState.selected[uuid], delta);

            if (newPosition && newPosition.bottom! > lowestNode!) {
              lowestNode = newPosition.bottom;
            }
            newPositions[uuid] = newPosition;
          });

          newPositions = mutate(prevState.positions, {
            $merge: newPositions,
          });

          this.updateStateWithScroll(clientX, clientY, {
            positions: newPositions,
          });

          if (uuids.length <= 5) {
            this.props.onDragging(uuids);
          } else {
            this.onDragThrottled(uuids);
          }
        } else {
          if (Math.abs(xd) + Math.abs(yd) > DRAG_THRESHOLD) {
            let selected = this.state.selected;
            if (!(this.state.dragUUID in selected)) {
              selected = { [dragUUID]: this.state.positions[dragUUID] };
            }

            this.props.mergeEditorState({
              dragActive: true,
            });

            this.setState({ selected });
          }
        }
      }
    }
  }

  private handleDragStart(uuid: string, position: FlowPosition): void {
    const offset = this.ele.getBoundingClientRect();

    this.setState({
      dragUUID: uuid,
      dragDownPosition: {
        left: position.left - offset.left,
        top: position.top - offset.top - window.scrollY,
      },
    });

    const { transformOffsetX, transformOffsetY } = this.getTransformOffsets();
    this.lastCanvasX = transformOffsetX;
    this.lastCanvasY = transformOffsetY;
  }

  /** Gets all the positions for nodes that were dragged */
  private getSelectedPositions(): CanvasPositions {
    return Object.keys(this.state.selected).reduce(
      (result: CanvasPositions, uuid: string) => {
        result[uuid] = this.state.positions[uuid];
        return result;
      },
      {},
    );
  }

  private handleDragStop(): void {
    if (this.state.dragUUID) {
      this.updatePositions(this.lastX!, this.lastY!, 0, 0);

      this.lastCanvasX = null;
      this.lastCanvasY = null;
    }

    this.props.onUpdatePositions(this.getSelectedPositions());
    this.setState({
      dragUUID: null,
      dragDownPosition: null,
      dragSelection: null,
    });

    this.markReflow();

    this.props.mergeEditorState({
      dragActive: false,
    });
  }

  private handleAnimated(uuid: string): void {
    this.props.onDragging([uuid]);
  }

  private handleDoubleClick(event: React.MouseEvent<HTMLDivElement>): void {
    if (this.isClickOnCanvas(event)) {
      const offset = this.ele.getBoundingClientRect();
      const {
        transformOffsetX,
        transformOffsetY,
        transformScale,
      } = this.getTransformOffsets();
      this.props.onDoubleClick({
        left:
          (event.pageX - offset.left - transformOffsetX) * (1 / transformScale),
        top:
          (event.pageY - offset.top - window.scrollY - transformOffsetY) *
          (1 / transformScale),
      });
    }
  }

  private handleZoomClick(direction: 0 | 1) {
    const { transformOffsetX, transformOffsetY } = this.getTransformOffsets();
    const centerX = transformOffsetX;
    const centerY = transformOffsetY;

    const zoomBy = direction ? 2 : 0.5;
    this.state.panzoomInstance.smoothZoom(centerX, centerY, zoomBy);
  }

  private moveToStart() {
    const { position } = this.getStartingNode();

    if (position) {
      const viewportWidth = document.documentElement.clientWidth;
      const scale = this.state.panzoomInstance.getTransform().scale;

      this.state.panzoomInstance.smoothMoveTo(
        viewportWidth / 2 - position.left * scale,
        TRANSFORM_START_Y - position.top * scale,
      );
    }
  }

  private getCursorCss() {
    if (this.isInSelectState()) {
      return styles.cursor_select;
    }

    if (this.props.mouseState === MouseState.DRAG) {
      return styles.cursor_drag;
    }

    return styles.cursor_dragging;
  }

  public render(): JSX.Element {
    const cursorCss = this.getCursorCss();

    return (
      <div
        id="canvas-container"
        className={styles.canvas_container + ' ' + cursorCss}
        onMouseDown={this.handleMouseDown}
        onMouseMove={this.handleMouseMove}
        onMouseUp={this.handleMouseUpCapture}
        onDoubleClick={this.handleDoubleClick}
      >
        <div
          ref={(ele: HTMLDivElement) => {
            this.canvasBg = ele;
          }}
          className={styles.canvas_background}
        >
          <div
            data-testid="canvas"
            id="canvas"
            ref={(ele: HTMLDivElement) => {
              this.ele = ele;
            }}
            className={styles.canvas}
            onMouseMove={this.handleMouseMoveCanvas}
          >
            <div id="panzoom" className={styles.panzoom}>
              {this.props.newDragElement}
              {this.props.draggables.map(
                (draggable: CanvasDraggableProps, idx: number) => {
                  const pos =
                    this.state.positions[draggable.uuid] || draggable.position;
                  return (
                    <CanvasDraggable
                      onAnimated={this.handleAnimated}
                      key={'draggable_' + draggable.uuid}
                      uuid={draggable.uuid}
                      updateDimensions={this.handleUpdateDimensions}
                      position={pos}
                      idx={draggable.idx}
                      selected={!!this.state.selected[draggable.uuid]}
                      elementCreator={draggable.elementCreator}
                      onDragStart={this.handleDragStart}
                      onDragStop={this.handleDragStop}
                      dragOnAdd={draggable.dragOnAdd}
                      config={draggable.config}
                    />
                  );
                },
              )}
              {this.renderSelectionBox()}
            </div>

            {this.state.panzoomInstance && (
              <div className={styles.zoom_control}>
                <GuidingSteps
                  guide="control_tools"
                  step={1}
                  title={i18n.t('guiding.control_tools.1.title', 'Zoom tool')}
                  description={i18n.t(
                    'guiding.control_tools.1.description',
                    `Now you can zoom in and zoom out natively, without having to zoom in on the entire browser, which also helps with the navigability of cards.`,
                  )}
                  buttonText={i18n.t('guiding.v2.1.button', 'Got it 2/3')}
                  side="top"
                  align="arrow_left"
                >
                  <UnnnicTooltip
                    className={styles.zoom_tooltip}
                    text="Zoom"
                    enabled={true}
                    side="top"
                    shortcutText={
                      (getOS() === 'Macintosh' ? 'Cmd' : 'Ctrl') + ' + Scroll'
                    }
                  >
                    <div
                      data-testid="zoom-control-0"
                      className={styles.out}
                      onClick={() => this.handleZoomClick(0)}
                    >
                      <UnnnicIcon icon="remove" size="md" />
                    </div>
                    <div className={styles.percentage}>
                      {this.state.currentZoom}
                      <UnnnicIcon icon="percent" size="md" />
                    </div>
                    <div
                      data-testid="zoom-control-1"
                      className={styles.in}
                      onClick={() => this.handleZoomClick(1)}
                    >
                      <UnnnicIcon icon="add" size="md" />
                    </div>
                  </UnnnicTooltip>
                </GuidingSteps>

                <GuidingSteps
                  guide="control_tools"
                  step={2}
                  title={i18n.t(
                    'guiding.control_tools.2.title',
                    'Start of flow',
                  )}
                  description={i18n.t(
                    'guiding.control_tools.2.description',
                    `Your flow is too big and sometimes you get lost? Your problems are over, just click here or use the shortcut Ctrl + Enter to go back to the beginning of your flow.`,
                  )}
                  buttonText={i18n.t('guiding.v2.2.button', 'Got it 3/3')}
                  side="top"
                  align="arrow_left"
                >
                  <UnnnicTooltip
                    className={styles.start_tooltip}
                    text=""
                    enabled={true}
                    side="right"
                    shortcutText={
                      (getOS() === 'Macintosh' ? 'Cmd' : 'Ctrl') + ' + Enter'
                    }
                  >
                    <div
                      data-testid="move-to-start"
                      className={styles.start}
                      onClick={() => this.moveToStart()}
                    >
                      <span className={styles.hide}>
                        {i18n.t('to_flow_start', 'Start of flow')}
                      </span>
                      <UnnnicIcon icon="arrow_upward" size="md" />
                    </div>
                  </UnnnicTooltip>
                </GuidingSteps>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}
