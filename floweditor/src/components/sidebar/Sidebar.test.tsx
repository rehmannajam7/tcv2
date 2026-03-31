import * as React from 'react';
import { render, fireEvent } from 'test/utils';
import { composeComponentTestUtils, setMock } from 'testUtils';
import { Sidebar, SidebarStoreProps } from './Sidebar';
import { MouseState } from '../../store/editor';
import { shallowToJson } from 'enzyme-to-json';

vi.mock('veaury', async () => {
  return {
    applyVueInReact: (component: any) => (args: any) => {
      const dataTestId = args['data-testid']
        ? args['data-testid']
        : `veaury-${component.name}-stub`;

      return <div data-testid={dataTestId}>{args.children}</div>;
    },
  };
});

const baseProps: SidebarStoreProps = {
  onCopyClick: vi.fn(),
  onCreateNode: vi.fn(),
  onMouseStateChange: vi.fn(),
  selectionActive: false,
  nodes: {},
  onOpenNodeEditor: vi.fn(),
  guidingStep: 0,
  currentGuide: null,
  mergeEditorState: vi.fn(),
  mouseState: MouseState.SELECT,
  handleSearchChange: vi.fn(),
  search: {
    isSearchOpen: false,
    value: '',
    nodes: [],
    selected: 0,
  },
};

const { setup } = composeComponentTestUtils(Sidebar, baseProps);

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render', async () => {
    const { baseElement } = render(<Sidebar {...baseProps} />);

    expect(baseElement).toMatchSnapshot();
  });

  it('should change mouse state on click', async () => {
    const { baseElement, getByTestId } = render(<Sidebar {...baseProps} />);

    fireEvent.click(getByTestId('mouse-state'));
    expect(baseProps.onMouseStateChange).toHaveBeenCalledWith(MouseState.DRAG);

    expect(baseElement).toMatchSnapshot();
  });

  it('should change mouse state to select on click', async () => {
    const newProps = { ...baseProps, mouseState: MouseState.DRAG };
    const { baseElement, getByTestId } = render(<Sidebar {...newProps} />);

    fireEvent.click(getByTestId('mouse-state'));
    expect(baseProps.onMouseStateChange).toHaveBeenCalledWith(
      MouseState.SELECT,
    );

    expect(baseElement).toMatchSnapshot();
  });

  it('should create node on click', async () => {
    const { baseElement, getByTestId } = render(<Sidebar {...baseProps} />);

    fireEvent.click(getByTestId('create-node'));
    expect(baseProps.onCreateNode).toHaveBeenCalledTimes(1);

    expect(baseElement).toMatchSnapshot();
  });

  it('should copy on click', async () => {
    const { baseElement, getByTestId, rerender } = render(
      <Sidebar {...baseProps} />,
    );

    fireEvent.click(getByTestId('copy-button'));
    expect(baseProps.onCopyClick).toHaveBeenCalledTimes(0);

    rerender(<Sidebar {...baseProps} selectionActive={true} />);
    fireEvent.click(getByTestId('copy-button'));
    expect(baseProps.onCopyClick).toHaveBeenCalledTimes(1);

    expect(baseElement).toMatchSnapshot();
  });

  it('should open search on click', () => {
    const component = setup(true, {
      handleSearchChange: setMock(),
    });

    const props: Partial<SidebarStoreProps> = component.props;

    expect(props.handleSearchChange).not.toHaveBeenCalled();
    component.wrapper.find('[data-testid="search-button"]').simulate('click');
    expect(props.handleSearchChange).toHaveBeenCalledTimes(1);
    expect(props.handleSearchChange).toHaveBeenCalledWith({
      isSearchOpen: true,
      value: '',
      nodes: [{}],
      selected: 0,
    });

    expect(shallowToJson(component.wrapper)).toMatchSnapshot();
  });
});
