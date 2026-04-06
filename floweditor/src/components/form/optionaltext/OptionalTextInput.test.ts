import OptionalTextInput, {
  OptionalTextInputProps,
} from 'components/form/optionaltext/OptionalTextInput';
import { composeComponentTestUtils } from 'testUtils';
import { shallowToJson } from 'enzyme-to-json';

const { setup } = composeComponentTestUtils<OptionalTextInputProps>(
  OptionalTextInput,
  {
    name: 'Optional Text Name',
    value: { value: '' },
    toggleText: 'Click me to show',
    onChange: vi.fn(),
  },
);

describe(OptionalTextInput.name, () => {
  it('renders', () => {
    const { wrapper } = setup(true);
    expect(shallowToJson(wrapper)).toMatchSnapshot();
  });

  it('updates', () => {
    const { instance } = setup(true);
    instance.handleEditingChanged();
    instance.handleTextChanged('Updated Text');
    expect(instance.state).toMatchSnapshot();
  });
});
