import { NodeComp, NodeProps } from 'components/flow/node/Node';
import { Types } from 'config/interfaces';
import React from 'react';
import {
  act,
  fireEvent,
  render,
  renderWithCustomProvider,
  store,
  TEST_NODE,
} from 'test/utils';
import {
  createCallBrainAction,
  createCallResthookAction,
  createContactFieldRouterNode,
  createGroupsRouterNode,
  createRandomNode,
  createRenderNode,
  createResthookNode,
  createSendMsgAction,
  createStartFlowAction,
  createSubflowNode,
  createSwitchRouter,
} from 'testUtils/assetCreators';
import { createUUID } from 'utils';
import { MouseState } from 'store/editor';
import ConfigProvider from 'config';
import { Provider } from 'react-redux';
import config from 'test/config';
import { FlowIssueType, WaitTypes } from 'flowTypes';

const baseProps: NodeProps = {
  languages: {},
  nodeUUID: createUUID(),
  startingNode: true,
  onlyNode: true,
  selected: false,
  plumberMakeTarget: vi.fn(),
  plumberRecalculate: vi.fn(),
  plumberMakeSource: vi.fn(),
  plumberRemove: vi.fn(),
  plumberConnectExit: vi.fn(),
  plumberUpdateClass: vi.fn(),

  results: {},
  activeCount: 0,
  translating: false,
  simulating: false,
  debug: null,
  renderNode: {
    node: TEST_NODE,
    ui: {
      position: { left: 0, top: 0 },
      type: Types.execute_actions,
    },
    inboundConnections: {},
  },
  onAddToNode: vi.fn(),
  onOpenNodeEditor: vi.fn(),
  removeNode: vi.fn(),
  mergeEditorState: vi.fn(),
  issues: [],
  language: null,
  mouseState: MouseState.SELECT,
  scrollToAction: '',
  scrollToNode: '',
  brainInfo: null,
};

describe(NodeComp.name, () => {
  it('renders', () => {
    const { baseElement } = render(<NodeComp {...baseProps} />);
    expect(baseElement).toMatchSnapshot();
  });

  it('renders a named random split', () => {
    const randomSplit = createRandomNode(3);
    randomSplit.node.router.result_name = 'My Random Split';
    const { baseElement } = render(
      <NodeComp {...baseProps} renderNode={randomSplit} />,
    );
    expect(baseElement).toMatchSnapshot();
  });

  it('should recalculate exits on component update', async () => {
    const randomSplit = createRandomNode(3);
    const { container } = render(
      <NodeComp {...baseProps} renderNode={randomSplit} />,
    );
    expect(baseProps.plumberRecalculate).toHaveBeenCalledTimes(0);
    const newRandomSplit = createRandomNode(4);
    await act(async () => {
      render(<NodeComp {...baseProps} renderNode={newRandomSplit} />, {
        container,
      });
    });
    expect(baseProps.plumberRecalculate).toHaveBeenCalledTimes(5); // 1 base + 4 exits
  });

  it('should handle node removal', async () => {
    const randomSplit = createRandomNode(3);
    randomSplit.node.router.result_name = 'My Random Split';
    const { baseElement, getByTestId, getByText } = render(
      <NodeComp {...baseProps} renderNode={randomSplit} />,
    );
    expect(baseElement).toMatchSnapshot();

    await act(async () => {
      fireEvent.mouseUp(getByTestId('remove-icon'));
    });
    const confirmRemoval = getByTestId('confirm-removal');
    expect(confirmRemoval).toBeInTheDocument();

    const confirmButton = getByText('Confirm');
    expect(confirmButton).toBeInTheDocument();

    expect(baseProps.removeNode).toHaveBeenCalledTimes(0);

    fireEvent.click(confirmButton);

    expect(baseProps.removeNode).toHaveBeenCalledTimes(1);
  });

  it('should render a ghost node', () => {
    const { baseElement } = render(<NodeComp {...baseProps} ghost={true} />);
    expect(baseElement).toMatchSnapshot();
  });

  it('should update with a ghost node but not recalculate', async () => {
    const randomSplit = createRandomNode(3);
    const { container } = render(
      <NodeComp {...baseProps} renderNode={randomSplit} ghost={true} />,
    );
    expect(baseProps.plumberRecalculate).toHaveBeenCalledTimes(0);
    await act(async () => {
      render(<NodeComp {...baseProps} ghost={true} />, { container });
    });
    expect(baseProps.plumberRecalculate).toHaveBeenCalledTimes(0);
  });

  it('should render counter and call activityClicked callback', () => {
    const onActivityClicked = vi.fn();
    const customProvider = ({ children }: { children: unknown }) => (
      <ConfigProvider config={{ ...config, onActivityClicked }}>
        <Provider store={store as any}>{children}</Provider>
      </ConfigProvider>
    );
    const { baseElement, getByTestId } = renderWithCustomProvider(
      <NodeComp {...baseProps} activeCount={10} />,
      customProvider,
    );
    expect(baseElement).toMatchSnapshot();

    expect(onActivityClicked).toHaveBeenCalledTimes(0);
    fireEvent.click(getByTestId('counter-outter'));
    expect(onActivityClicked).toHaveBeenCalledTimes(1);
    expect(onActivityClicked).toHaveBeenCalledWith(baseProps.nodeUUID, 10);
  });

  it('should not show addAction button if a stacked action node and has a call brain action on it', () => {
    const callBrain = createRenderNode({
      actions: [createSendMsgAction(), createCallBrainAction()],
      exits: [],
      ui: {
        position: { left: 0, top: 0 },
        type: Types.execute_actions,
      },
    });
    const { baseElement, queryByTestId } = render(
      <NodeComp
        {...baseProps}
        renderNode={callBrain}
        brainInfo={{
          enabled: true,
          name: 'Dóris',
          occupation: 'Marketing Specialist',
        }}
      />,
    );
    expect(baseElement).toMatchSnapshot();
    expect(queryByTestId('add-action')).toBeNull();
  });

  it('should show addAction button if a stacked action node and has no call brain action on it', () => {
    const actionNode = createRenderNode({
      actions: [createSendMsgAction()],
      exits: null,
      ui: {
        position: { left: 0, top: 0 },
        type: Types.execute_actions,
      },
    });
    const { baseElement, getByTestId } = render(
      <NodeComp {...baseProps} renderNode={actionNode} />,
    );
    expect(baseElement).toMatchSnapshot();
    expect(getByTestId('add-action')).toBeInTheDocument();

    expect(baseProps.onAddToNode).toHaveBeenCalledTimes(0);

    fireEvent.mouseUp(getByTestId('add-action'));

    expect(baseProps.onAddToNode).toHaveBeenCalledTimes(1);
  });

  it('should render a switch router node', () => {
    const groupsRouter = createContactFieldRouterNode();
    const { baseElement } = render(
      <NodeComp {...baseProps} renderNode={groupsRouter} />,
    );
    expect(baseElement).toMatchSnapshot();
  });

  it('should open node editor on node click', () => {
    const groupsRouter = createContactFieldRouterNode();
    const { baseElement, getByTestId } = render(
      <NodeComp {...baseProps} renderNode={groupsRouter} />,
    );
    expect(baseElement).toMatchSnapshot();

    expect(baseProps.onOpenNodeEditor).toHaveBeenCalledTimes(0);

    fireEvent.mouseUp(getByTestId('titlebar-wrapper'));

    expect(baseProps.onOpenNodeEditor).toHaveBeenCalledTimes(1);
  });

  it('should not open node editor on node click if mouse status is DRAGGING', () => {
    const groupsRouter = createContactFieldRouterNode();
    const { baseElement, getByTestId } = render(
      <NodeComp
        {...baseProps}
        renderNode={groupsRouter}
        mouseState={MouseState.DRAGGING}
      />,
    );
    expect(baseElement).toMatchSnapshot();

    expect(baseProps.onOpenNodeEditor).toHaveBeenCalledTimes(0);

    fireEvent.mouseUp(getByTestId('titlebar-wrapper'));

    expect(baseProps.onOpenNodeEditor).toHaveBeenCalledTimes(0);
  });

  it('should render with scroll to node', () => {
    const { baseElement } = render(
      <NodeComp {...baseProps} scrollToNode={baseProps.nodeUUID} />,
    );
    expect(baseElement).toMatchSnapshot();
  });

  it('should render even with null action', () => {
    const actionNode = createRenderNode({
      actions: null,
      exits: null,
      ui: {
        position: { left: 0, top: 0 },
        type: Types.execute_actions,
      },
    });
    const { baseElement } = render(
      <NodeComp {...baseProps} renderNode={actionNode} />,
    );
    expect(baseElement).toMatchSnapshot();
  });

  it('should render a wait for responde node', () => {
    const node = createRenderNode({
      actions: [],
      exits: [],
      router: createSwitchRouter({
        cases: [],
        categories: [],
        wait: {
          type: WaitTypes.msg,
        },
        result_name: 'Result Name',
      }),
      ui: {
        position: { left: 0, top: 0 },
        type: Types.wait_for_response,
      },
    });

    const { baseElement } = render(
      <NodeComp
        {...baseProps}
        renderNode={node}
        selected={true}
        startingNode={false}
      />,
    );
    expect(baseElement).toMatchSnapshot();
  });

  it('should render a webhook based node', () => {
    const resthookNode = createResthookNode(createCallResthookAction());
    const { baseElement } = render(
      <NodeComp {...baseProps} renderNode={resthookNode} />,
    );

    expect(baseElement).toMatchSnapshot();
  });

  it('should render a split by subflow node', () => {
    const subflowNode = createSubflowNode(createStartFlowAction());
    const { baseElement } = render(
      <NodeComp {...baseProps} renderNode={subflowNode} />,
    );

    expect(baseElement).toMatchSnapshot();
  });

  it('should render a split by groups node', () => {
    const groupsRouter = createGroupsRouterNode();
    const { baseElement } = render(
      <NodeComp {...baseProps} renderNode={groupsRouter} />,
    );

    expect(baseElement).toMatchSnapshot();
  });

  it('should render a router node with issues', () => {
    const groupsRouter = createContactFieldRouterNode();
    const { baseElement } = render(
      <NodeComp
        {...baseProps}
        renderNode={groupsRouter}
        issues={[
          {
            type: FlowIssueType.MISSING_DEPENDENCY,
            node_uuid: baseProps.nodeUUID,
            action_uuid: null,
            description: 'missing dependency',
          },
        ]}
      />,
    );

    expect(baseElement).toMatchSnapshot();
  });

  it('should render an action node with issues', () => {
    const actionNode = createRenderNode({
      actions: [createSendMsgAction()],
      exits: null,
      ui: {
        position: { left: 0, top: 0 },
        type: Types.execute_actions,
      },
    });
    const { baseElement } = render(
      <NodeComp
        {...baseProps}
        renderNode={actionNode}
        issues={[
          {
            type: FlowIssueType.MISSING_DEPENDENCY,
            node_uuid: baseProps.nodeUUID,
            action_uuid: actionNode.node.actions[0].uuid,
            description: 'missing dependency',
          },
        ]}
      />,
    );

    expect(baseElement).toMatchSnapshot();
  });

  it('should render non mutable node and not trigger counter click', () => {
    const customProvider = ({ children }: { children: unknown }) => (
      <ConfigProvider
        config={{ ...config, onActivityClicked: null, mutable: false }}
      >
        <Provider store={store as any}>{children}</Provider>
      </ConfigProvider>
    );
    const { baseElement, getByTestId } = renderWithCustomProvider(
      <NodeComp {...baseProps} activeCount={10} />,
      customProvider,
    );
    expect(baseElement).toMatchSnapshot();

    fireEvent.click(getByTestId('counter-outter'));
  });
});
