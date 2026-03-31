import AddLabelsComp, {
  MAX_TO_SHOW,
} from 'components/flow/actions/addlabels/AddLabels';
import { Types } from 'config/interfaces';
import { AddLabels } from 'flowTypes';
import { composeComponentTestUtils } from 'testUtils';
import { shallowToJson } from 'enzyme-to-json';

const labels = [
  'Help',
  'New',
  'Feedback',
  'Needs Attention',
  'Running Out of Plausible Label Names',
  'But alas, here is another one',
];

const baseProps: AddLabels = {
  type: Types.add_input_labels,
  uuid: `${Types.add_input_labels}-0`,
  labels: labels.map((name, idx) => ({ name, uuid: `label-${idx}` })),
};

const { setup } = composeComponentTestUtils(AddLabelsComp, baseProps);

describe(AddLabelsComp.name, () => {
  it('should display labels on action', () => {
    const { wrapper } = setup();

    // Assert that we're displaying the max labels
    // we want to display plus an ellipses.
    // the plus one is to include de center wrapper
    expect(wrapper.find('div').length).toBe(MAX_TO_SHOW + 1);
    expect(shallowToJson(wrapper)).toMatchSnapshot();
  });

  it('should display labels that contains name_match key', () => {
    const newProps = {
      labels: [
        {
          name: 'I have a name_match key',
          name_match: 'Look at me, i have a name_match key',
          uuid: 'label-6',
        },
        ...baseProps.labels,
      ],
    };

    const { setup } = composeComponentTestUtils(AddLabelsComp, newProps);
    const { wrapper } = setup();

    expect(wrapper.find('div').length).toBe(MAX_TO_SHOW + 1);
    expect(shallowToJson(wrapper)).toMatchSnapshot();
  });
});
