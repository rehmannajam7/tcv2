import SwitchElement, {
  SwitchElementProps,
  descTestId,
  SwitchSizes,
} from './SwitchElement';
import * as React from 'react';
import { fireEvent, render } from 'test/utils';

const baseProps: SwitchElementProps = {
  name: 'switch',
  checked: false,
  title: 'Switch Title',
  description: 'Switch Description',
  labelClassName: 'label-class',
  switchClassName: 'switch-class',
  size: SwitchSizes.small,
};

describe(SwitchElement.name, () => {
  it('should render a switch element with description', () => {
    const { baseElement, getByTestId } = render(
      <SwitchElement {...baseProps} />,
    );
    expect(baseElement).toMatchSnapshot();
    expect(getByTestId(descTestId)).toHaveTextContent(baseProps.description);
  });

  it('should switch', () => {
    const onChangeSpy = vi.fn();
    render(<SwitchElement {...baseProps} onChange={onChangeSpy} />);
    const switchIcon = document.getElementById('default');
    fireEvent.click(switchIcon);
    expect(onChangeSpy).toHaveBeenCalled();
  });
});
