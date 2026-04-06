import TitleBar, {
  moveIconSpecId,
  removeIconSpecId,
  TitleBarProps,
} from 'components/titlebar/TitleBar';
import React from 'react';
import { act, fireEvent, render } from 'test/utils';

const baseProps: TitleBarProps = {
  title: 'Send Message',
  onRemoval: vi.fn(),
};

describe(TitleBar.name, () => {
  describe('render', () => {
    it('should render self, children with base props', () => {
      const { container } = render(<TitleBar {...baseProps} />);
      expect(container).toMatchSnapshot();
    });

    it('should apply _className prop', () => {
      const { container } = render(
        <TitleBar {...baseProps} __className="some-classy-class" />,
      );
      expect(container).toMatchSnapshot();
    });

    describe('move icon', () => {
      it('should render move icon', () => {
        const { container } = render(
          <TitleBar {...baseProps} showMove={true} />,
        );
        expect(container).toMatchSnapshot();
      });

      it('should call onMoveUp', () => {
        const onMoveUp = vi.fn();
        const { baseElement, getByTestId } = render(
          <TitleBar {...baseProps} showMove={true} onMoveUp={onMoveUp} />,
        );
        expect(baseElement).toMatchSnapshot();

        // click on the move up button
        fireEvent.mouseUp(getByTestId(moveIconSpecId));
        expect(onMoveUp).toHaveBeenCalledTimes(1);
      });
    });

    describe('remove icon', () => {
      it('should render remove icon', () => {
        const { baseElement } = render(
          <TitleBar {...baseProps} showMove={true} showRemoval={true} />,
        );
        expect(baseElement).toMatchSnapshot();
      });
    });

    describe('confirmation', () => {
      it('should render confirmation markup and call onRemoval prop', async () => {
        const handleRemoveClicked = vi.fn();
        const { baseElement, getByTestId, getByText } = render(
          <TitleBar
            {...baseProps}
            showMove={true}
            showRemoval={true}
            onRemoval={handleRemoveClicked}
          />,
        );

        expect(baseElement).toMatchSnapshot();

        await act(async () => {
          fireEvent.mouseUp(getByTestId(removeIconSpecId));
        });
        fireEvent.click(getByText('Confirm'));
        expect(handleRemoveClicked).toHaveBeenCalledTimes(1);
      });
    });
  });
});
