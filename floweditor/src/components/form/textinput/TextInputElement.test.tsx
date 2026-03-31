import TextInputElement, {
  TextInputProps,
} from 'components/form/textinput/TextInputElement';
import * as React from 'react';
import { render, fireEvent } from 'test/utils';

const baseProps: TextInputProps = {
  name: 'Message',
  entry: { value: '' },
  onChange: vi.fn(),
  onKeyDown: vi.fn(),
  onKeyPressEnter: vi.fn(),
};

describe(TextInputElement.name, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders', () => {
    const { baseElement } = render(<TextInputElement {...baseProps} />);
    expect(baseElement).toMatchSnapshot();
  });

  it('renders with initial value', () => {
    const { baseElement } = render(
      <TextInputElement {...baseProps} entry={{ value: 'Hello' }} />,
    );
    expect(baseElement).toMatchSnapshot();
  });

  it('renders with undefined entry', () => {
    const { baseElement } = render(
      <TextInputElement {...baseProps} entry={undefined} />,
    );
    expect(baseElement).toMatchSnapshot();
  });

  it('renders with undefined entry as autocomplete', () => {
    const { baseElement } = render(
      <TextInputElement {...baseProps} entry={undefined} autocomplete={true} />,
    );
    expect(baseElement).toMatchSnapshot();
  });

  it('renders with error', () => {
    const { baseElement } = render(
      <TextInputElement {...baseProps} error={'Error'} />,
    );
    expect(baseElement).toMatchSnapshot();
  });

  it('renders with error directly on entry', () => {
    const { baseElement } = render(
      <TextInputElement
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

  it('renders with autocomplete', () => {
    const { baseElement } = render(
      <TextInputElement {...baseProps} autocomplete={true} />,
    );
    expect(baseElement).toMatchSnapshot();
  });

  it('renders with label', () => {
    const { baseElement } = render(
      <TextInputElement {...baseProps} showLabel={true} />,
    );
    expect(baseElement).toMatchSnapshot();
  });

  it('renders with autocomplete and label', () => {
    const { baseElement } = render(
      <TextInputElement {...baseProps} autocomplete={true} showLabel={true} />,
    );
    expect(baseElement).toMatchSnapshot();
  });

  it('renders with helpText', () => {
    const { baseElement } = render(
      <TextInputElement {...baseProps} helpText={'Help'} />,
    );
    expect(baseElement).toMatchSnapshot();
  });

  it('renders with helpText as an element', () => {
    const { baseElement } = render(
      <TextInputElement {...baseProps} helpText={<div>Help</div>} />,
    );
    expect(baseElement).toMatchSnapshot();
  });

  it('should change value on input change', () => {
    const { baseElement } = render(<TextInputElement {...baseProps} />);
    const input = baseElement.querySelector('input');
    expect(input).not.toBeNull();
    expect(input).toMatchSnapshot();
    expect(baseProps.onChange).not.toHaveBeenCalled();
    fireEvent.input(input, { target: { value: 'Hello' } });
    expect(input).toMatchSnapshot();
    expect(baseProps.onChange).toHaveBeenCalledWith('Hello', 'Message');
  });

  it('should change value on autocomplete input change', () => {
    const { baseElement } = render(
      <TextInputElement {...baseProps} autocomplete={true} />,
    );
    const input = baseElement.querySelector('input');
    expect(input).not.toBeNull();
    expect(input).toMatchSnapshot();
    expect(baseProps.onChange).not.toHaveBeenCalled();
    fireEvent.input(input, { target: { value: 'Hello' } });
    expect(input).toMatchSnapshot();
    expect(baseProps.onChange).toHaveBeenCalledWith('Hello', 'Message');
  });

  it('should handle keyDown and keyPress enter events on input', () => {
    const { baseElement } = render(<TextInputElement {...baseProps} />);
    const input = baseElement.querySelector('input');
    expect(input).not.toBeNull();
    expect(input).toMatchSnapshot();
    expect(baseProps.onKeyDown).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(baseProps.onKeyDown).toHaveBeenCalled();
    expect(baseProps.onKeyPressEnter).not.toHaveBeenCalled();
    fireEvent.keyPress(input, { key: 'Enter' });
    expect(baseProps.onKeyPressEnter).toHaveBeenCalled();
  });

  it('should do nothing with undefined events', () => {
    const { baseElement } = render(
      <TextInputElement
        {...baseProps}
        onChange={undefined}
        onKeyDown={undefined}
        onKeyPressEnter={undefined}
      />,
    );
    const input = baseElement.querySelector('input');
    expect(input).not.toBeNull();
    expect(input).toMatchSnapshot();
    expect(baseProps.onKeyDown).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(baseProps.onKeyDown).not.toHaveBeenCalled();
    expect(baseProps.onKeyPressEnter).not.toHaveBeenCalled();
    fireEvent.keyPress(input, { key: 'Enter' });
    expect(baseProps.onKeyPressEnter).not.toHaveBeenCalled();

    expect(baseProps.onChange).not.toHaveBeenCalled();
    fireEvent.input(input, { target: { value: 'Hello' } });
    expect(baseProps.onChange).not.toHaveBeenCalled();
  });

  describe('textarea', () => {
    const textAreaBaseProps: TextInputProps = {
      ...baseProps,
      textarea: true,
      onChange: vi.fn(),
    };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('renders', () => {
      const { baseElement } = render(
        <TextInputElement {...textAreaBaseProps} />,
      );
      expect(baseElement).toMatchSnapshot();
    });

    it('renders with initial value', () => {
      const { baseElement } = render(
        <TextInputElement {...textAreaBaseProps} entry={{ value: 'Hello' }} />,
      );
      expect(baseElement).toMatchSnapshot();
    });

    it('renders with undefined entry', () => {
      const { baseElement } = render(
        <TextInputElement {...textAreaBaseProps} entry={undefined} />,
      );
      expect(baseElement).toMatchSnapshot();
    });

    it('renders with undefined entry as autocomplete', () => {
      const { baseElement } = render(
        <TextInputElement
          {...textAreaBaseProps}
          entry={undefined}
          autocomplete={true}
        />,
      );
      expect(baseElement).toMatchSnapshot();
    });

    it('renders with counter', () => {
      const { baseElement } = render(
        <TextInputElement {...textAreaBaseProps} counter={'100'} />,
      );
      expect(baseElement).toMatchSnapshot();
    });

    it('renders with counter with undefined entry', () => {
      const { baseElement } = render(
        <TextInputElement
          {...textAreaBaseProps}
          counter={'100'}
          entry={undefined}
        />,
      );
      expect(baseElement).toMatchSnapshot();
    });

    it('renders with error', () => {
      const { baseElement } = render(
        <TextInputElement {...textAreaBaseProps} error={'Error'} />,
      );
      expect(baseElement).toMatchSnapshot();
    });

    it('renders with error directly on entry', () => {
      const { baseElement } = render(
        <TextInputElement
          {...textAreaBaseProps}
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

    it('renders with autocomplete', () => {
      const { baseElement } = render(
        <TextInputElement {...textAreaBaseProps} autocomplete={true} />,
      );
      expect(baseElement).toMatchSnapshot();
    });

    it('renders with autocomplete and counter', () => {
      const { baseElement } = render(
        <TextInputElement
          {...textAreaBaseProps}
          autocomplete={true}
          counter={'100'}
        />,
      );
      expect(baseElement).toMatchSnapshot();
    });

    it('renders with label', () => {
      const { baseElement } = render(
        <TextInputElement {...textAreaBaseProps} showLabel={true} />,
      );
      expect(baseElement).toMatchSnapshot();
    });

    it('renders with autocomplete and label', () => {
      const { baseElement } = render(
        <TextInputElement
          {...textAreaBaseProps}
          autocomplete={true}
          showLabel={true}
        />,
      );
      expect(baseElement).toMatchSnapshot();
    });

    it('should change value on textarea input', () => {
      const { baseElement } = render(
        <TextInputElement {...textAreaBaseProps} />,
      );
      const input = baseElement.querySelector('textarea');
      expect(input).not.toBeNull();
      expect(input).toMatchSnapshot();
      expect(textAreaBaseProps.onChange).not.toHaveBeenCalled();
      fireEvent.input(input, { target: { value: 'Hello' } });
      expect(input).toMatchSnapshot();
      expect(textAreaBaseProps.onChange).toHaveBeenCalledWith(
        'Hello',
        'Message',
      );
    });

    it('should change value on autocomplete textarea input', () => {
      const { baseElement } = render(
        <TextInputElement {...textAreaBaseProps} autocomplete={true} />,
      );
      const input = baseElement.querySelector('textarea');
      expect(input).not.toBeNull();
      expect(input).toMatchSnapshot();
      expect(textAreaBaseProps.onChange).not.toHaveBeenCalled();
      fireEvent.input(input, { target: { value: 'Hello' } });
      expect(input).toMatchSnapshot();
      expect(textAreaBaseProps.onChange).toHaveBeenCalledWith(
        'Hello',
        'Message',
      );
    });
  });
});
