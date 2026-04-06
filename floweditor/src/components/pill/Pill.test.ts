import Pill, { PillProps } from 'components/pill/Pill';
import { composeComponentTestUtils } from 'testUtils';
import { shallowToJson } from 'enzyme-to-json';

const { setup } = composeComponentTestUtils<PillProps>(Pill, {
  advanced: false,
  text: 'This is my pill text',
  maxLength: 10,
});

describe(Pill.name, () => {
  it('renders', () => {
    const { wrapper } = setup();
    expect(shallowToJson(wrapper)).toMatchSnapshot();
  });

  it('treats @ text differently', () => {
    const { wrapper } = setup(true, {
      text: { $set: '@(CONCAT(contact.name, contact.age))' },
    });
    expect(shallowToJson(wrapper)).toMatchSnapshot();
  });
});
