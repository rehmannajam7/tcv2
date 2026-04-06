import TextEditorElement, {
  TextEditorProps,
} from 'components/form/texteditor/TextEditorElement';
import * as React from 'react';
import {
  render,
  fireEvent,
  fireCustomEvent,
  fireUnnnicTextAreaChangeText,
} from 'test/utils';

const baseProps: TextEditorProps = {
  name: 'Message',
  entry: { value: '' },
  onChange: vi.fn(),
};

describe(TextEditorElement.name, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders', () => {
    const { baseElement } = render(<TextEditorElement {...baseProps} />);
    expect(baseElement).toMatchSnapshot();
  });

  it('renders with initial value', () => {
    const { baseElement } = render(
      <TextEditorElement {...baseProps} entry={{ value: 'Hello' }} />,
    );
    expect(baseElement).toMatchSnapshot();
  });

  it('renders with autocomplete', () => {
    const { baseElement } = render(
      <TextEditorElement {...baseProps} autocomplete={true} />,
    );
    expect(baseElement).toMatchSnapshot();
  });

  it('renders with label', () => {
    const { baseElement } = render(
      <TextEditorElement {...baseProps} showLabel={true} />,
    );
    expect(baseElement).toMatchSnapshot();
  });

  it('renders with autocomplete and label', () => {
    const { baseElement } = render(
      <TextEditorElement {...baseProps} autocomplete={true} showLabel={true} />,
    );
    expect(baseElement).toMatchSnapshot();
  });

  it('renders with error', () => {
    const { baseElement } = render(
      <TextEditorElement
        {...baseProps}
        entry={{
          value: '',
          validationFailures: [
            {
              message: 'Error',
            },
          ],
        }}
      />,
    );
    expect(baseElement).toMatchSnapshot();
  });

  it('should call onChange with correct value', () => {
    const { getByTestId } = render(
      <TextEditorElement {...baseProps} autocomplete={true} />,
    );
    const input = getByTestId('Message');

    fireUnnnicTextAreaChangeText(input, 'Hello');
    expect(baseProps.onChange).toHaveBeenCalledWith('Hello', 'Message');
  });

  it('should not call onChange if undefined', () => {
    const { getByTestId } = render(
      <TextEditorElement
        {...baseProps}
        autocomplete={true}
        onChange={undefined}
      />,
    );
    const input = getByTestId('Message');

    fireUnnnicTextAreaChangeText(input, 'hello');
    expect(baseProps.onChange).not.toHaveBeenCalled();
  });

  it('should call on change when emoji is added', () => {
    const { getByTestId } = render(
      <TextEditorElement {...baseProps} autocomplete={true} />,
    );

    const emojiButton = getByTestId('emoji-button');
    fireEvent.click(emojiButton);

    expect(baseProps.onChange).not.toHaveBeenCalled();
    const emojiPicker = getByTestId('emoji-picker');

    fireCustomEvent(emojiPicker, 'emoji-selected', { emoji: '👍' });
    expect(baseProps.onChange).toHaveBeenCalledTimes(1);
  });

  it('should emit on change formatted value', () => {
    const { getByTestId, rerender } = render(
      <TextEditorElement {...baseProps} autocomplete={true} />,
    );

    const input = getByTestId('Message');
    fireUnnnicTextAreaChangeText(input, 'Hello');
    expect(baseProps.onChange).toHaveBeenCalledWith('Hello', 'Message');

    rerender(
      <TextEditorElement
        {...baseProps}
        autocomplete={true}
        entry={{ value: 'Hello' }}
      />,
    );

    const boldButton = getByTestId('bold-button');
    fireEvent.click(boldButton);
    expect(baseProps.onChange).toHaveBeenCalledWith('Hello**', 'Message');

    const italicButton = getByTestId('italic-button');
    fireEvent.click(italicButton);
    expect(baseProps.onChange).toHaveBeenCalledWith('Hello__', 'Message');

    const codeButton = getByTestId('code-button');
    fireEvent.click(codeButton);
    expect(baseProps.onChange).toHaveBeenCalledWith('Hello``````', 'Message');

    const strikeButton = getByTestId('strike-button');
    fireEvent.click(strikeButton);
    expect(baseProps.onChange).toHaveBeenCalledWith('Hello~~', 'Message');
  });

  it('should not emit formats if disabled', () => {
    const { getByTestId } = render(
      <TextEditorElement {...baseProps} autocomplete={true} disabled={true} />,
    );

    const boldButton = getByTestId('bold-button');
    const italicButton = getByTestId('italic-button');
    const codeButton = getByTestId('code-button');
    const strikeButton = getByTestId('strike-button');

    expect(baseProps.onChange).not.toHaveBeenCalled();
    fireEvent.click(boldButton);
    fireEvent.click(italicButton);
    fireEvent.click(codeButton);
    fireEvent.click(strikeButton);
    expect(baseProps.onChange).not.toHaveBeenCalled();
  });
});
