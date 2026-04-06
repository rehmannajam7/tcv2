import { Canvas, CanvasProps } from 'components/canvas/Canvas';
import { CanvasDraggableProps } from 'components/canvas/CanvasDraggable';
import React from 'react';
import { fireEvent, render, waitFor, act } from 'test/utils';
import { createUUID } from 'utils';
import { MouseState } from 'store/editor';
import { JSDOM } from 'jsdom';

const firstNodeUUID = createUUID();
const secondNodeUUID = createUUID();
const fakeUUID = 'b1f332f3-bdd3-4891-aec5-1843a712dbf1';
const exitUUID = 'e2g443h4-bdd3-4891-aec5-2954b823ecg2';

const nodes: any = {
  [firstNodeUUID]: {
    ui: {
      position: { top: 100, bottom: 200, left: 100, right: 200 },
    },
  },
  [secondNodeUUID]: {
    ui: {
      position: { top: 500, bottom: 600, left: 500, right: 600 },
    },
  },
};

const draggables: any = [
  {
    elementCreator: vi.fn(),
    uuid: firstNodeUUID,
    position: nodes[firstNodeUUID].ui.position,
    config: {
      node: {
        uuid: firstNodeUUID,
        exits: [
          {
            uuid: exitUUID,
            destination_uuid: secondNodeUUID,
          },
          {
            foo: 'bar',
          },
          {
            destination_uuid: fakeUUID,
          },
        ],
      },
      ui: nodes[firstNodeUUID].ui,
    },
    idx: 0,
  },
  {
    elementCreator: vi.fn(),
    uuid: secondNodeUUID,
    position: nodes[secondNodeUUID].ui.position,
    config: {
      node: {
        uuid: secondNodeUUID,
        exits: [],
      },
      ui: nodes[secondNodeUUID].ui,
      inboundConnections: {
        [exitUUID]: firstNodeUUID,
      },
    },
    idx: 0,
  },
];

const baseProps: CanvasProps = {
  uuid: createUUID(),
  draggingNew: false,
  dragActive: false,
  onDragging: vi.fn(),
  onUpdatePositions: vi.fn(),
  mergeEditorState: vi.fn(),
  onRemoveNodes: vi.fn(),
  onDoubleClick: vi.fn(),
  onLoaded: vi.fn(),
  draggables: [],
  newDragElement: <div></div>,
  mutable: true,
  mouseState: MouseState.SELECT,
  onZoom: vi.fn(),
  onMouseStateChange: vi.fn(),
  nodes: nodes,
  updateNodesEditor: vi.fn(),
  handleSearchChange: vi.fn(),
};

const setDom = () => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>');

  // `as` and anything after it are TypeScript-specific
  global.window = (dom.window as unknown) as Window & typeof globalThis;
  global.document = dom.window.document;

  global.window['requestAnimationFrame'] = vi.fn();
};

describe(Canvas.name, () => {
  beforeEach(() => {
    setDom();
  });

  it('render default', async () => {
    const { baseElement } = render(<Canvas {...baseProps} />);
    await waitFor(() => expect(baseElement).toMatchSnapshot());
  });

  it('initializes the height to the lowest draggable', async () => {
    const lowest: CanvasDraggableProps = {
      elementCreator: vi.fn(),
      uuid: createUUID(),
      position: { top: 1200, left: 100, bottom: 1290, right: 300 },
      idx: 0,
    };
    const { baseElement } = render(
      <Canvas {...baseProps} draggables={[lowest]} />,
    );
    await waitFor(() => expect(baseElement).toMatchSnapshot());
  });

  it('adjusts the height when updating dimensions', async () => {
    const uuid = createUUID();
    const lowest: CanvasDraggableProps = {
      elementCreator: vi.fn(),
      uuid,
      position: { top: 1200, left: 100, right: 200, bottom: 1400 },
      idx: 0,
    };

    const { baseElement } = render(
      <Canvas {...baseProps} draggables={[lowest]} />,
    );
    await waitFor(() => expect(baseElement).toMatchSnapshot());
  });

  it('reflows collisions', async () => {
    vi.useFakeTimers();

    const first: CanvasDraggableProps = {
      elementCreator: vi.fn(),
      uuid: createUUID(),
      position: { top: 100, bottom: 200, left: 100, right: 200 },
      idx: 0,
    };

    const second: CanvasDraggableProps = {
      elementCreator: vi.fn(),
      uuid: createUUID(),
      position: { top: 150, left: 100, bottom: 250, right: 200 },
      idx: 0,
    };

    const onDragging = vi.fn();

    const { getByTestId } = render(
      <Canvas
        {...baseProps}
        draggables={[first, second]}
        onDragging={onDragging}
      />,
    );

    // trigger reflow by simulating a drag event
    fireEvent.mouseDown(getByTestId('draggable_' + first.uuid));
    fireEvent.mouseUp(getByTestId('draggable_' + first.uuid));
    vi.runAllTimers();

    await waitFor(() => expect(onDragging).toMatchSnapshot());
  });

  it('should select nodes when dragging', () => {
    const ref = React.createRef<Canvas>();

    const first: CanvasDraggableProps = {
      elementCreator: vi.fn(),
      uuid: createUUID(),
      position: { top: 100, bottom: 200, left: 100, right: 200 },
      idx: 0,
    };

    const { baseElement } = render(
      <Canvas ref={ref} {...baseProps} draggables={[first]} />,
    );

    const movePositions = [
      { clientX: 100, clientY: 100 },
      { clientX: 200, clientY: 200 },
    ];

    const container = baseElement.querySelector('#canvas') as HTMLElement;

    expect(ref.current.state.selected).toEqual({});

    fireEvent.mouseDown(container, movePositions[0]);
    fireEvent.mouseMove(container, movePositions[1]);

    expect(ref.current.state.selected).toEqual({
      [first.uuid]: first.position,
    });
  });

  it('should do nothing if copying and not selecting any nodes', () => {
    const ref = React.createRef<Canvas>();

    const { baseElement } = render(
      <Canvas ref={ref} {...baseProps} draggables={draggables} />,
    );

    const container = baseElement.querySelector('#canvas') as HTMLElement;

    const clipboardEvent = new Event('copy', {
      bubbles: true,
      cancelable: true,
      composed: true,
    });

    const setDataMock = vi.fn();
    (clipboardEvent as any)['clipboardData'] = {
      setData: setDataMock,
    };

    fireEvent(container, clipboardEvent);

    expect(setDataMock).toHaveBeenCalledTimes(0);
  });

  it('should copy and paste selected nodes', async () => {
    const ref = React.createRef<Canvas>();

    const { baseElement } = render(
      <Canvas ref={ref} {...baseProps} draggables={draggables} />,
    );

    const movePositions = [
      { clientX: 50, clientY: 50 },
      { clientX: 300, clientY: 300 },
      { clientX: 500, clientY: 500 },
      { clientX: 800, clientY: 800 },
    ];

    const container = baseElement.querySelector('#canvas') as HTMLElement;

    expect(ref.current.state.selected).toEqual({});

    fireEvent.mouseDown(container, movePositions[0]);
    fireEvent.mouseMove(container, movePositions[1]);
    fireEvent.mouseMove(container, movePositions[2]);
    fireEvent.mouseMove(container, movePositions[3]);
    fireEvent.mouseUp(container);

    expect(ref.current.state.selected).toEqual({
      [draggables[0].uuid]: draggables[0].position,
      [draggables[1].uuid]: draggables[1].position,
    });

    const clipboardEvent = new Event('copy', {
      bubbles: true,
      cancelable: true,
      composed: true,
    });

    const setDataMock = vi.fn();
    (clipboardEvent as any)['clipboardData'] = {
      setData: setDataMock,
    };

    fireEvent(container, clipboardEvent);

    const selectedNodes = [
      {
        ...draggables[0].config,
        node: {
          ...draggables[0].config.node,
          uuid: `update:${draggables[0].config.node.uuid}`,
          exits: [
            {
              uuid: `${exitUUID}`,
              destination_uuid: `update:${draggables[1].config.node.uuid}`,
            },
            {
              foo: 'bar',
            },
            {
              destination_uuid: `update:${fakeUUID}`,
            },
          ],
        },
        ui: { position: { left: 0, top: 0 } },
      },
      {
        ...draggables[1].config,
        node: {
          ...draggables[1].config.node,
          uuid: `update:${draggables[1].config.node.uuid}`,
          exits: [],
        },
        inboundConnections: {
          [exitUUID]: `update:${draggables[0].config.node.uuid}`,
        },
        ui: { position: { left: 400, top: 400 } },
      },
    ];

    expect(setDataMock).toHaveBeenCalledTimes(1);
    expect(setDataMock).toHaveBeenCalledWith(
      'application/json',
      JSON.stringify(selectedNodes),
    );

    const pastePositions = [{ clientX: 1000, clientY: 1000 }];

    fireEvent.mouseMove(container, pastePositions[0]);
    fireEvent.mouseDown(container, pastePositions[0]);
    fireEvent.mouseUp(container);

    const pasteEvent = new Event('paste', {
      bubbles: true,
      cancelable: true,
      composed: true,
    });

    (pasteEvent as any)['clipboardData'] = {
      getData: () => {
        return JSON.stringify(selectedNodes);
      },
    };

    await act(async () => {
      fireEvent(container, pasteEvent);
    });

    expect(baseProps.onUpdatePositions).toHaveBeenCalledTimes(1);
    // expect(baseProps.onUpdatePositions).toMatchSnapshot();
  });

  it('should do nothing if trying to paste non json data', () => {
    const ref = React.createRef<Canvas>();

    const { baseElement } = render(
      <Canvas ref={ref} {...baseProps} draggables={draggables} />,
    );

    const container = baseElement.querySelector('#canvas') as HTMLElement;

    const pasteEvent = new Event('paste', {
      bubbles: true,
      cancelable: true,
      composed: true,
    });

    (pasteEvent as any)['clipboardData'] = {
      getData: () => {
        return '';
      },
    };

    fireEvent(container, pasteEvent);

    expect(baseProps.onUpdatePositions).toHaveBeenCalledTimes(0);
  });

  it('should zoom', () => {
    const ref = React.createRef<Canvas>();

    const { baseElement } = render(
      <Canvas ref={ref} {...baseProps} draggables={draggables} />,
    );

    const container = baseElement.querySelector('#canvas') as HTMLElement;

    const zoomEvent = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      composed: true,
      deltaY: 100,
      ctrlKey: true,
    });

    expect(ref.current.state.currentZoom).toBe(100);
    fireEvent(container, zoomEvent);
    expect(ref.current.state.currentZoom).toBe(75);
  });

  it('should move the canvas', () => {
    const ref = React.createRef<Canvas>();

    const { baseElement } = render(
      <Canvas
        ref={ref}
        {...baseProps}
        draggables={draggables}
        mouseState={MouseState.DRAG}
      />,
    );

    const container = baseElement.querySelector('#canvas') as HTMLElement;

    const movePositions = [
      { clientX: 100, clientY: 100 },
      { clientX: 200, clientY: 200 },
    ];

    expect(ref.current.state.panzoomInstance.getTransform()).toEqual({
      x: -100,
      y: 0,
      scale: 1,
    });
    fireEvent.mouseDown(container, { ...movePositions[0] });
    fireEvent.mouseMove(container, { ...movePositions[1] });
    fireEvent.mouseUp(container);

    expect(ref.current.state.panzoomInstance.getTransform()).toEqual({
      x: 0,
      y: 100,
      scale: 1,
    });

    fireEvent.wheel(container, {
      deltaY: -100,
    });

    expect(ref.current.state.panzoomInstance.getTransform()).toEqual({
      x: 0,
      y: 200,
      scale: 1,
    });

    fireEvent.wheel(container, {
      deltaY: -100,
      shiftKey: true,
    });

    expect(ref.current.state.panzoomInstance.getTransform()).toEqual({
      x: 100,
      y: 200,
      scale: 1,
    });
  });

  it('should delete selected nodes on delete or backspace', () => {
    const ref = React.createRef<Canvas>();

    const { baseElement } = render(
      <Canvas ref={ref} {...baseProps} draggables={draggables} />,
    );

    const container = baseElement.querySelector('#canvas') as HTMLElement;

    expect(ref.current.state.selected).toEqual({});

    fireEvent.keyDown(container, { key: 'Delete' });
    expect(baseProps.onRemoveNodes).toHaveBeenCalledTimes(0);

    fireEvent.keyDown(container, { key: 'Backspace' });
    expect(baseProps.onRemoveNodes).toHaveBeenCalledTimes(0);

    const movePositions = [
      { clientX: 100, clientY: 100 },
      { clientX: 200, clientY: 200 },
    ];

    fireEvent.mouseDown(container, movePositions[0]);
    fireEvent.mouseMove(container, movePositions[1]);

    expect(ref.current.state.selected).toEqual({
      [draggables[0].uuid]: draggables[0].position,
    });

    fireEvent.keyDown(container, { key: 'Enter' });
    expect(baseProps.onRemoveNodes).toHaveBeenCalledTimes(0);

    fireEvent.keyDown(container, { key: 'Delete' });
    expect(baseProps.onRemoveNodes).toHaveBeenCalledTimes(1);
    expect(baseProps.onRemoveNodes).toHaveBeenCalledWith([draggables[0].uuid]);

    fireEvent.keyDown(container, { key: 'Backspace' });
    expect(baseProps.onRemoveNodes).toHaveBeenCalledTimes(2);
    expect(baseProps.onRemoveNodes).toHaveBeenCalledWith([draggables[0].uuid]);
  });

  it('should change mouse state key press', () => {
    const ref = React.createRef<Canvas>();

    const { baseElement, rerender } = render(
      <Canvas ref={ref} {...baseProps} draggables={draggables} />,
    );

    const container = baseElement.querySelector('#canvas') as HTMLElement;

    expect(baseProps.onMouseStateChange).toHaveBeenCalledTimes(0);

    fireEvent.keyDown(container, { key: 'v' });
    expect(baseProps.onMouseStateChange).toHaveBeenCalledTimes(1);
    expect(baseProps.onMouseStateChange).toHaveBeenCalledWith(MouseState.DRAG);

    rerender(
      <Canvas
        ref={ref}
        {...baseProps}
        draggables={draggables}
        mouseState={MouseState.DRAG}
      />,
    );

    fireEvent.keyDown(container, { key: 'v' });
    expect(baseProps.onMouseStateChange).toHaveBeenCalledTimes(2);
    expect(baseProps.onMouseStateChange).toHaveBeenCalledWith(
      MouseState.SELECT,
    );

    // should not change state since state is not SELECT
    fireEvent.keyDown(container, { key: ' ' });
    expect(baseProps.onMouseStateChange).toHaveBeenCalledTimes(2);

    rerender(
      <Canvas
        ref={ref}
        {...baseProps}
        draggables={draggables}
        mouseState={MouseState.SELECT}
      />,
    );

    fireEvent.keyDown(container, { key: ' ' });
    expect(baseProps.onMouseStateChange).toHaveBeenCalledTimes(3);
    expect(baseProps.onMouseStateChange).toHaveBeenCalledWith(MouseState.DRAG);

    fireEvent.keyDown(container, { key: 'Space' });
    expect(baseProps.onMouseStateChange).toHaveBeenCalledTimes(4);
    expect(baseProps.onMouseStateChange).toHaveBeenCalledWith(MouseState.DRAG);

    fireEvent.keyUp(container, { key: 'Space' });
    expect(baseProps.onMouseStateChange).toHaveBeenCalledTimes(5);
    expect(baseProps.onMouseStateChange).toHaveBeenCalledWith(
      MouseState.SELECT,
    );
  });

  it('should open search box on ctrl + f press', async () => {
    const ref = React.createRef<Canvas>();

    const { baseElement } = render(
      <Canvas ref={ref} {...baseProps} draggables={draggables} />,
    );

    // create a searchBarInputElementDiv to test the focus
    await act(async () => {
      const search = baseElement.ownerDocument.createElement('div');
      search.setAttribute('id', 'searchBarInputElementDiv');
    });

    const container = baseElement.querySelector('#canvas') as HTMLElement;

    expect(baseProps.handleSearchChange).toHaveBeenCalledTimes(0);

    fireEvent.keyDown(container, { key: 'f', ctrlKey: true });
    expect(baseProps.handleSearchChange).toHaveBeenCalledTimes(1);
    expect(baseProps.handleSearchChange).toHaveBeenCalledWith({
      isSearchOpen: true,
      nodes: [],
      value: '',
      selected: 0,
    });
  });

  it('should call doubleClick callback on canvas double click', () => {
    const ref = React.createRef<Canvas>();

    const { baseElement } = render(
      <Canvas ref={ref} {...baseProps} draggables={draggables} />,
    );

    const container = baseElement.querySelector('#canvas') as HTMLElement;

    expect(baseProps.onDoubleClick).toHaveBeenCalledTimes(0);

    fireEvent.dblClick(container);
    expect(baseProps.onDoubleClick).toHaveBeenCalledTimes(1);
  });

  it('should change zoom on zoom control click', async () => {
    const ref = React.createRef<Canvas>();

    const { getByTestId } = render(
      <Canvas ref={ref} {...baseProps} draggables={draggables} />,
    );

    const zoomSpy = vi.spyOn(ref.current.state.panzoomInstance, 'smoothZoom');

    const zoomOut = getByTestId('zoom-control-0');
    const zoomIn = getByTestId('zoom-control-1');

    expect(zoomSpy).toHaveBeenCalledTimes(0);

    await act(async () => {
      await fireEvent.click(zoomIn);
    });
    expect(zoomSpy).toHaveBeenCalledTimes(1);
    expect(zoomSpy).toHaveBeenCalledWith(-100, 0, 2);

    fireEvent.click(zoomOut);
    expect(zoomSpy).toHaveBeenCalledTimes(2);
    expect(zoomSpy).toHaveBeenCalledWith(-100, 0, 0.5);
  });

  it('should move to start on button click or ctrl + enter', async () => {
    const ref = React.createRef<Canvas>();

    const { baseElement, getByTestId } = render(
      <Canvas ref={ref} {...baseProps} draggables={draggables} />,
    );

    const moveSpy = vi.spyOn(ref.current.state.panzoomInstance, 'smoothMoveTo');

    const move = getByTestId('move-to-start');

    expect(moveSpy).toHaveBeenCalledTimes(0);

    await act(async () => {
      await fireEvent.click(move);
    });
    expect(moveSpy).toHaveBeenCalledTimes(1);
    expect(moveSpy).toHaveBeenCalledWith(-100, 0);

    const container = baseElement.querySelector('#canvas') as HTMLElement;

    fireEvent.keyDown(container, { key: 'Enter', ctrlKey: true });

    expect(moveSpy).toHaveBeenCalledTimes(2);
    expect(moveSpy).toHaveBeenCalledWith(-100, 0);
  });
});
