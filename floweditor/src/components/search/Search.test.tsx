import React from 'react';
import { SearchBar, SearchStoreProps } from './SearchBar';
import { act, fireEvent, fireUnnnicInputChangeText, render } from 'test/utils';
import { NodeComp } from '../flow/node/Node';
import { MouseState } from '../../store/editor';
import { RenderNodeMap } from '../../store/flowContext';
import { shallowToJson } from 'enzyme-to-json';

const renderNodes = (nodes: RenderNodeMap) => {
  return Object.entries(nodes).map(([uuid, node]) => {
    return (
      <NodeComp
        key={uuid}
        nodeUUID={uuid}
        plumberMakeTarget={vi.fn()}
        plumberRecalculate={vi.fn()}
        plumberMakeSource={vi.fn()}
        plumberRemove={vi.fn()}
        plumberConnectExit={vi.fn()}
        plumberUpdateClass={vi.fn()}
        startingNode={false}
        onlyNode={false}
        selected={false}
        results={undefined}
        language={undefined}
        languages={undefined}
        activeCount={0}
        translating={false}
        simulating={false}
        debug={undefined}
        renderNode={node}
        issues={[]}
        onAddToNode={vi.fn()}
        onOpenNodeEditor={vi.fn()}
        removeNode={vi.fn()}
        mergeEditorState={vi.fn()}
        scrollToNode={''}
        scrollToAction={''}
        mouseState={MouseState.SELECT}
        brainInfo={undefined}
      />
    );
  });
}

// @ts-ignore
const nodes: RenderNodeMap = {
  '11f18b66-37ce-43f0-a74e-4638eb7e5921': {
    node: {
      uuid: '11f18b66-37ce-43f0-a74e-4638eb7e5921',
      actions: [
        {
          attachments: [],
          text: 'teste1',
          // @ts-ignore
          type: 'send_msg',
          quick_replies: [],
          uuid: 'bbb43f9d-d254-44ef-a9d1-7a3e392f972c',
        },
      ],
      exits: [
        {
          uuid: '07e2e3d2-d7cb-4905-93b8-50598ec4fdf3',
          destination_uuid: 'f5804ae2-2103-4b55-b17a-129b359d39a2',
        },
      ],
    },
    ui: {
      position: {
        left: 160,
        top: 100,
      },
      // @ts-ignore
      type: 'execute_actions',
    },
    inboundConnections: {},
  },
  'f5804ae2-2103-4b55-b17a-129b359d39a2': {
    node: {
      uuid: 'f5804ae2-2103-4b55-b17a-129b359d39a2',
      actions: [
        {
          attachments: [],
          text: 'teste2',
          // @ts-ignore
          type: 'send_msg',
          quick_replies: [],
          uuid: '77e4f770-42ad-4573-95cf-f7d96a020dd9',
        },
      ],
      exits: [
        {
          uuid: '72e44e5c-777e-41de-a35c-c52f418d6c6c',
          destination_uuid: null,
        },
      ],
    },
    ui: {
      position: {
        left: 129,
        top: 409,
      },
      // @ts-ignore
      type: 'execute_actions',
    },
    inboundConnections: {
      '07e2e3d2-d7cb-4905-93b8-50598ec4fdf3': '11f18b66-37ce-43f0-a74e-4638eb7e5921',
    },
  },
  '2eeba668-b742-4982-b8da-2cb3726903e5': {
    node: {
      uuid: '2eeba668-b742-4982-b8da-2cb3726903e5',
      actions: [
        {
          attachments: [],
          text: 'different',
          // @ts-ignore
          type: 'send_msg',
          quick_replies: [],
          uuid: '87e4f770-42ad-4573-95cf-f7d96a020dd9',
        },
      ],
      exits: [
        {
          uuid: '82e44e5c-777e-41de-a35c-c52f418d6c6c',
          destination_uuid: null,
        },
      ],
    },
    ui: {
      position: {
        left: 129,
        top: 409,
      },
      // @ts-ignore
      type: 'execute_actions',
    },
  },
};

const baseProps: SearchStoreProps = {
  search: {
    isSearchOpen: true,
    value: '',
    selected: 0,
    nodes: [],
  },
  nodes: nodes,
  handleSearchChange: vi.fn(),
};

describe(SearchBar.name, () => {
  
  vi.spyOn(document, 'createTreeWalker').mockImplementation((node: any) => {
    return {
      nextNode: vi.fn(),
    };
  })

  vi.spyOn(document, 'getElementById').mockImplementation((elementId: string) => {
    return {
      // @ts-expect-error Property 'text' does not exist on type 'Action'
      // eslint-disable-next-line prettier/prettier
      innerText: nodes[elementId]?.node.actions[0].text,
      querySelectorAll: vi.fn((): [] => {
        return []
      }),
    } as HTMLElement
  })

  beforeEach(() => {
    vi.clearAllMocks();
  })  

  it('should render', () => {
    const { baseElement } = render(
      <>
        <SearchBar {...baseProps} />
        {renderNodes(nodes)}
      </>
    );
    expect(baseElement).toMatchSnapshot();
  });

  it('should call handleSearchChange with correct nodes', async () => {
    const { getByTestId } = render(
      <>
        <SearchBar {...baseProps} />
        {renderNodes(nodes)}
      </>
    );
    
    expect(baseProps.handleSearchChange).not.toHaveBeenCalled();
    // change the search value
    const input = getByTestId('searchInput');
    fireUnnnicInputChangeText(input, 'test');

    expect(baseProps.handleSearchChange).toHaveBeenCalledTimes(1);
    expect(baseProps.handleSearchChange).toHaveBeenCalledWith({
      isSearchOpen: true,
      value: 'test',
      nodes: [
        {
          uuid: '11f18b66-37ce-43f0-a74e-4638eb7e5921',
          data: nodes['11f18b66-37ce-43f0-a74e-4638eb7e5921'],
        },
        { 
          uuid: 'f5804ae2-2103-4b55-b17a-129b359d39a2',
          data: nodes['f5804ae2-2103-4b55-b17a-129b359d39a2'],
        }
      ],
      selected: 0,
    });

    fireUnnnicInputChangeText(input, 'different');
    expect(baseProps.handleSearchChange).toHaveBeenCalledTimes(2);
    expect(baseProps.handleSearchChange).toHaveBeenCalledWith({
      isSearchOpen: true,
      value: 'different',
      nodes: [
        {
          uuid: '2eeba668-b742-4982-b8da-2cb3726903e5',
          data: nodes['2eeba668-b742-4982-b8da-2cb3726903e5'],
        }
      ],
      selected: 0,
    });
  })

  it('should iter through the search results', async () => {
    const { getByTestId, rerender } = render(
      <>
        <SearchBar {...baseProps} />
        {renderNodes(nodes)}
      </>
    );

    expect(baseProps.handleSearchChange).not.toHaveBeenCalled();
    // change the search value
    const input = getByTestId('searchInput');
    fireUnnnicInputChangeText(input, 'test');

    const searchMatchNodes = [
      {
        uuid: '11f18b66-37ce-43f0-a74e-4638eb7e5921',
        data: nodes['11f18b66-37ce-43f0-a74e-4638eb7e5921'],
      },
      { 
        uuid: 'f5804ae2-2103-4b55-b17a-129b359d39a2',
        data: nodes['f5804ae2-2103-4b55-b17a-129b359d39a2'],
      }
    ]

    rerender(
      <>
        <SearchBar {...baseProps} search={{...baseProps.search, value: 'test', nodes: searchMatchNodes}} />
        {renderNodes(nodes)}
      </>
    )

    expect(baseProps.handleSearchChange).toHaveBeenCalledWith({
      isSearchOpen: true,
      value: 'test',
      nodes: searchMatchNodes,
      selected: 0,
    });    

    const downButton = getByTestId('downButton');
    fireEvent.click(downButton);

    expect(baseProps.handleSearchChange).toHaveBeenCalledWith({
      isSearchOpen: true,
      value: 'test',
      nodes: searchMatchNodes,
      selected: 1,
    });

    // should go down on when enter is typed, also checks for circular navigation
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(baseProps.handleSearchChange).toHaveBeenCalledWith({
      isSearchOpen: true,
      value: 'test',
      nodes: searchMatchNodes,
      selected: 0,
    });

    // should go up
    const upButton = getByTestId('upButton');
    fireEvent.click(upButton);

    expect(baseProps.handleSearchChange).toHaveBeenCalledWith({
      isSearchOpen: true,
      value: 'test',
      nodes: searchMatchNodes,
      selected: 1,
    });
  })
});
