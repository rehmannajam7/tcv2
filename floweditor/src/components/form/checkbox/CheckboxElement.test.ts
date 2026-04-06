import { composeComponentTestUtils, getSpecWrapper } from 'testUtils';
import { shallowToJson } from 'enzyme-to-json';

import CheckboxElement, {
  CheckboxElementProps,
  titleSpecId,
} from './CheckboxElement';

const baseProps: CheckboxElementProps = {
  name: 'Checkbox',
  checked: false,
};

const { setup, spyOn } = composeComponentTestUtils(CheckboxElement, baseProps);

describe(CheckboxElement.name, () => {
  it('should render a checkbox element with title, description', () => {
    const setStateSpy = spyOn('setState');
    const { wrapper, props } = setup(true, {
      $merge: {
        title: 'Checkbox',
        description: 'All Destinations',
        labelClassName: 'label',
        checkboxClassName: 'checkbox',
        onChange: vi.fn(),
      },
    });

    expect(getSpecWrapper(wrapper, titleSpecId).exists()).toBeTruthy();
    expect(wrapper).toMatchSnapshot('unchecked');

    // Check box
    wrapper.find('label').prop('onClick')();
    wrapper.update();

    expect(setStateSpy).toHaveBeenCalledTimes(1);
    expect(setStateSpy).toMatchSnapshot();
    expect(props.onChange).toHaveBeenCalledTimes(1);
    expect(shallowToJson(wrapper)).toMatchSnapshot();

    // Remove title
    wrapper.setProps({
      title: '',
      description: 'Continue when there is no response',
    });

    expect(shallowToJson(wrapper)).toMatchSnapshot();

    setStateSpy.mockRestore();
  });
});
