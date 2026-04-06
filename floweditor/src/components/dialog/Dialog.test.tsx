import Dialog, { DialogProps, HeaderStyle } from 'components/dialog/Dialog';
import * as React from 'react';
import { render, fireEvent } from 'test/utils';

const baseProps: DialogProps = {
  title: 'My Dialog',
};

const fullProps: DialogProps = {
  ...baseProps,
  subtitle: 'Subtitlf',
  headerIcon: 'fe-icon',
  headerClass: 'header-class',
  headerStyle: HeaderStyle.BARBER,
  buttons: {
    primary: { name: 'Ok', onClick: vi.fn() },
    secondary: { name: 'Cancel', onClick: vi.fn() },
    tertiary: { name: 'Other', onClick: vi.fn() },
  },
  gutter: <div>The Gutter</div>,
  noPadding: true,
  new: true,
  className: 'my-class',
};

const fullPropsWithTabs: DialogProps = {
  ...fullProps,
  tabs: [
    { name: 'Tab 1', body: <div>Tab 1 Content</div>, checked: true },
    { name: 'Tab 2', body: <div>Tab 2 Content</div>, hasErrors: true },
  ],
};

describe(Dialog.name, () => {
  it('should render', () => {
    const { baseElement } = render(<Dialog {...baseProps} />);
    expect(baseElement).toMatchSnapshot();
  });

  it('should render with full props', () => {
    const { baseElement } = render(<Dialog {...fullProps} />);
    expect(baseElement).toMatchSnapshot();
  });

  it('should focus on main tab on primary button click', () => {
    vi.useFakeTimers();
    // remove the error tab to allow the main tab focus on primary button click
    const tabsProps = [...fullPropsWithTabs.tabs];
    tabsProps.pop();

    const { baseElement, getByText } = render(
      <Dialog {...fullPropsWithTabs} tabs={tabsProps} />,
    );
    expect(baseElement).toMatchSnapshot();

    // switch to first tab
    fireEvent.click(getByText('Tab 1'));
    expect(baseElement).toMatchSnapshot();

    fireEvent.click(getByText('Ok'));
    vi.runAllTimers();

    expect(baseElement).toMatchSnapshot();
  });

  it('should switch to main tab on title click', () => {
    vi.useFakeTimers();
    const { baseElement, getByText } = render(
      <Dialog {...fullPropsWithTabs} />,
    );
    expect(baseElement).toMatchSnapshot();

    // switch to Tab 2
    fireEvent.click(getByText('Tab 2'));
    expect(baseElement).toMatchSnapshot();

    // switch to main tab
    fireEvent.click(getByText('My Dialog'));
    vi.runAllTimers();

    expect(baseElement).toMatchSnapshot();
  });

  it('should execute passed function on primary button click', () => {
    const { getByText } = render(<Dialog {...fullProps} />);
    expect(fullProps.buttons.primary.onClick).not.toHaveBeenCalled();
    fireEvent.click(getByText('Ok'));
    expect(fullProps.buttons.primary.onClick).toHaveBeenCalled();
  });

  it('should execute passed function shift+enter event', () => {
    const { baseElement } = render(<Dialog {...fullProps} />);
    expect(fullProps.buttons.primary.onClick).not.toHaveBeenCalled();
    fireEvent.keyDown(baseElement, { key: 'Enter', shiftKey: true });
    expect(fullProps.buttons.primary.onClick).toHaveBeenCalled();
  });

  it('should not execute passed function on primary button shift+enter event if button is not provided', () => {
    const buttonsProps = { ...fullProps.buttons };
    delete buttonsProps.primary;

    const { baseElement } = render(
      <Dialog {...fullProps} buttons={buttonsProps} />,
    );
    expect(fullProps.buttons.primary.onClick).not.toHaveBeenCalled();
    fireEvent.keyDown(baseElement, { key: 'Enter', shiftKey: true });
    expect(fullProps.buttons.primary.onClick).not.toHaveBeenCalled();
  });

  it('shoul not execute passed function if shift+enter event is not triggered', () => {
    const { baseElement } = render(<Dialog {...fullProps} />);
    expect(fullProps.buttons.primary.onClick).not.toHaveBeenCalled();
    fireEvent.keyDown(baseElement, { key: 'Enter' });
    expect(fullProps.buttons.primary.onClick).not.toHaveBeenCalled();
  });

  it('should render with undefined tabs', () => {
    const { baseElement } = render(<Dialog {...fullProps} tabs={undefined} />);
    expect(baseElement).toMatchSnapshot();
  });

  it('should not switch tabs if there are undefined tabs', () => {
    vi.useFakeTimers();
    const { baseElement, getByText } = render(
      <Dialog {...fullPropsWithTabs} tabs={undefined} />,
    );
    expect(baseElement).toMatchSnapshot();

    fireEvent.keyDown(baseElement, { key: 'Enter', shiftKey: true });

    vi.runAllTimers();
    expect(baseElement).toMatchSnapshot();
  });

  it('should render tabs with errors', () => {
    const { baseElement, queryByText, getByText } = render(
      <Dialog {...fullPropsWithTabs} />,
    );
    expect(baseElement).toMatchSnapshot();

    expect(queryByText('Tab 2 Content')).not.toBeInTheDocument();
    // switch to Tab 2
    fireEvent.click(getByText('Tab 2'));
    expect(baseElement).toMatchSnapshot();
    expect(getByText('Tab 2 Content')).toBeInTheDocument();
  });

  it('should switch to errored tab on primary button click', () => {
    vi.useFakeTimers();

    const { queryByText, getByText } = render(
      <Dialog {...fullPropsWithTabs} />,
    );

    expect(queryByText('Tab 2 Content')).not.toBeInTheDocument();
    // click on primary button
    fireEvent.click(getByText('Ok'));

    vi.runAllTimers();

    expect(getByText('Tab 2 Content')).toBeInTheDocument();
  });

  it('should switch tab on instace method call', () => {
    const dialog = <Dialog {...fullPropsWithTabs} />;
    const { baseElement } = render(dialog);

    expect(baseElement).toMatchSnapshot();

    dialog;
  });

  it('should render without any props', () => {
    const { baseElement } = render(<Dialog title={null} />);
    expect(baseElement).toMatchSnapshot();
  });
});
