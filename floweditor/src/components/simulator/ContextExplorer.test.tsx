import { render, fireEvent, act } from 'test/utils';
import * as React from 'react';
import ContextExplorer, { ContextExplorerProps } from './ContextExplorer';

const props: ContextExplorerProps = {
  visible: true,
  contents: {
    day: '020120',
    temperatures: [23.2, 21.2, 20.3, 20.5, 20.11, 21.3],
    location: 'A1B2C3',
  },
};

describe(ContextExplorer.name, () => {
  it('should render', () => {
    const { baseElement, queryAllByText } = render(
      <ContextExplorer {...props} />,
    );

    // root values should be visible
    expect(queryAllByText('020120').length).toBe(1);
    expect(queryAllByText('A1B2C3').length).toBe(1);
    expect(queryAllByText('[6]').length).toBe(1);

    // children should not be
    expect(queryAllByText('23.2').length).toBe(0);

    expect(baseElement).toMatchSnapshot();
  });

  it('should expand and collapse', () => {
    const { queryAllByText, getByText, baseElement } = render(
      <ContextExplorer {...props} />,
    );

    // our array values shouldn't be visible
    expect(queryAllByText('0').length).toBe(0);
    expect(queryAllByText('1').length).toBe(0);
    expect(queryAllByText('2').length).toBe(0);

    // click on temperature
    const tempNode = getByText('temperatures');
    fireEvent.click(tempNode);

    // now our array values should each have a div
    expect(queryAllByText('0').length).toBe(1);
    expect(queryAllByText('1').length).toBe(1);
    expect(queryAllByText('2').length).toBe(1);

    // and the corresponding values should be visible too
    expect(queryAllByText('23.2').length).toBe(1);

    expect(baseElement).toMatchSnapshot();
  });

  it('should show and hide keys with empty values', async () => {
    vi.useFakeTimers();
    const {
      baseElement,

      getByTestId,
    } = render(<ContextExplorer {...props} />);

    expect(baseElement).toMatchSnapshot();

    // click on show empty
    await act(async () => {
      fireEvent.click(getByTestId('empty-toggle'));
    });

    vi.runAllTimers();
    expect(baseElement).toMatchSnapshot();

    // click to hide again
    await act(async () => {
      fireEvent.click(getByTestId('empty-toggle'));
    });

    vi.runAllTimers();
    expect(baseElement).toMatchSnapshot();
  });

  it('should copy row path if shift clicked', async () => {
    vi.useFakeTimers();
    const spy = vi.spyOn(window.navigator.clipboard, 'writeText');
    const { getByText } = render(<ContextExplorer {...props} />);

    expect(spy).not.toHaveBeenCalled();

    // click on temperature
    const tempNode = getByText('temperatures');
    fireEvent.click(tempNode);

    // shift click on a value
    fireEvent.click(getByText('23.2'), { shiftKey: true });
    vi.runAllTimers();

    expect(spy).toHaveBeenCalledWith('@temperatures.0');
  });

  it('should copy row path if copy is clicked', () => {
    vi.useFakeTimers();
    const spy = vi.spyOn(window.navigator.clipboard, 'writeText');
    const { getByText, getByTestId } = render(<ContextExplorer {...props} />);

    expect(spy).not.toHaveBeenCalled();

    // click on temperature
    const tempNode = getByText('temperatures');
    fireEvent.click(tempNode);

    // click on copy
    fireEvent.click(getByTestId('context-row-temperatures-copy'));
    vi.runAllTimers();

    expect(spy).toHaveBeenCalledWith('@temperatures');
  });

  it('should handle nameless content', () => {
    props.contents = {
      '': 'nameless',
    };
    const { getByTestId, queryAllByText } = render(
      <ContextExplorer {...props} />,
    );

    // toggle show empty
    fireEvent.click(getByTestId('empty-toggle'));

    expect(queryAllByText('nameless').length).toBe(0);
  });

  it('should handle default content', () => {
    props.contents = {
      __default__: 'default',
    };
    const { getByTestId, queryAllByText } = render(
      <ContextExplorer {...props} />,
    );

    // toggle show empty
    fireEvent.click(getByTestId('empty-toggle'));

    expect(queryAllByText('default').length).toBe(0);
  });

  it('should handle default values contents', () => {
    props.contents = {
      default_value: { __default__: 'default value' },
    };
    const { getByTestId, queryAllByText } = render(
      <ContextExplorer {...props} />,
    );

    // toggle show empty
    fireEvent.click(getByTestId('empty-toggle'));

    expect(queryAllByText('default value').length).toBe(1);
  });

  it('should handle default values contents with multiple keys', () => {
    props.contents = {
      default_value: { __default__: 'default value', should: 'be displayed' },
    };
    const { getByTestId, queryAllByText, getByText } = render(
      <ContextExplorer {...props} />,
    );

    // toggle show empty
    fireEvent.click(getByTestId('empty-toggle'));

    expect(queryAllByText('default value').length).toBe(1);

    // toggle should be displayed
    fireEvent.click(getByText('default value'));

    expect(queryAllByText('be displayed').length).toBe(1);
  });

  it('should handle undefined content', () => {
    props.contents = undefined;
    const { baseElement } = render(<ContextExplorer {...props} />);

    expect(baseElement).toMatchSnapshot();
  });

  it('should show if visible', () => {
    props.visible = true;
    const { baseElement } = render(<ContextExplorer {...props} />);

    expect(baseElement).toMatchSnapshot();
  });
});
