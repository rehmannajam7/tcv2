import TextEditorActions, {
  TextEditorActionProps,
} from 'components/form/texteditor/TextEditorActions';
import * as React from 'react';
import { render, fireEvent, fireCustomEvent } from 'test/utils';

const baseProps: TextEditorActionProps = {
  entry: { value: '' },
  maxLength: 100,
  onAddEmoji: vi.fn(),
  onFormat: vi.fn(),
};

describe(TextEditorActions.name, () => {
  it('renders', () => {
    const { baseElement } = render(<TextEditorActions {...baseProps} />);
    expect(baseElement).toMatchSnapshot();
  });

  it('should toggle emoji picker', () => {
    const { baseElement, getByTestId } = render(
      <TextEditorActions {...baseProps} />,
    );

    const emojiButton = getByTestId('emoji-button');
    expect(baseElement).toMatchSnapshot();
    fireEvent.click(emojiButton);
    expect(baseElement).toMatchSnapshot();
  });

  it('should emit add emoji', () => {
    const { getByTestId } = render(<TextEditorActions {...baseProps} />);

    const emojiButton = getByTestId('emoji-button');
    fireEvent.click(emojiButton);

    expect(baseProps.onAddEmoji).not.toHaveBeenCalled();
    const emojiPicker = getByTestId('emoji-picker');

    fireCustomEvent(emojiPicker, 'emoji-selected', { emoji: '👍' });
    expect(baseProps.onAddEmoji).toHaveBeenCalled();
  });

  it('should close emoji picker on click outside', () => {
    const { baseElement, getByTestId } = render(
      <TextEditorActions {...baseProps} />,
    );

    const emojiButton = getByTestId('emoji-button');
    fireEvent.click(emojiButton);
    expect(baseElement).toMatchSnapshot();

    const emojiPicker = getByTestId('emoji-picker');
    fireCustomEvent(emojiPicker, 'click-outside', true);
    expect(baseElement).toMatchSnapshot();
  });

  it('should emit formats', () => {
    const { getByTestId } = render(<TextEditorActions {...baseProps} />);

    const boldButton = getByTestId('bold-button');
    const italicButton = getByTestId('italic-button');
    const codeButton = getByTestId('code-button');
    const strikeButton = getByTestId('strike-button');

    expect(baseProps.onFormat).not.toHaveBeenCalled();
    fireEvent.click(boldButton);
    expect(baseProps.onFormat).toHaveBeenCalledWith('*');

    fireEvent.click(italicButton);
    expect(baseProps.onFormat).toHaveBeenCalledWith('_');

    fireEvent.click(codeButton);
    expect(baseProps.onFormat).toHaveBeenCalledWith('```');

    fireEvent.click(strikeButton);
    expect(baseProps.onFormat).toHaveBeenCalledWith('~');
  });
});
