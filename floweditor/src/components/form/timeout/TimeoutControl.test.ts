import TimeoutControl, {
  TIMEOUT_OPTIONS,
  TimeoutControlProps,
} from 'components/form/timeout/TimeoutControl';
import { composeComponentTestUtils, setMock } from 'testUtils';
import { shallowToJson } from 'enzyme-to-json';

const { setup } = composeComponentTestUtils<TimeoutControlProps>(
  TimeoutControl,
  {
    timeout: 0,
    onChanged: vi.fn(),
  },
);

describe(TimeoutControl.name, () => {
  it('renders', () => {
    const { wrapper } = setup();
    expect(shallowToJson(wrapper)).toMatchSnapshot();
  });

  it('updates', () => {
    const { instance, props } = setup(true, { onChanged: setMock() });
    instance.handleChecked();
    expect(props.onChanged).toMatchSnapshot('check');

    instance.handleTimeoutChanged(TIMEOUT_OPTIONS[0]);
    expect(props.onChanged).toMatchSnapshot('update');
  });

  it('handles initial values', () => {
    const { wrapper, instance } = setup(true, {
      timeout: { $set: 15 },
      onChanged: setMock(),
    });

    instance.handleChecked();
    expect(shallowToJson(wrapper)).toMatchSnapshot();
  });
});
