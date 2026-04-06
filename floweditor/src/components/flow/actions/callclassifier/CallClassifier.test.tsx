import { CallClassifier } from 'flowTypes';
import { composeComponentTestUtils } from 'testUtils';

import CallClassifierComp from 'components/flow/actions/callclassifier/CallClassifier';
import { shallowToJson } from 'enzyme-to-json';
import { createCallClassifierAction } from 'testUtils/assetCreators';

const CallBrainAction = createCallClassifierAction();

const { setup } = composeComponentTestUtils<CallClassifier>(
  CallClassifierComp,
  CallBrainAction as CallClassifier,
);

describe(CallClassifierComp.name, () => {
  it('should render', () => {
    const { wrapper, props } = setup();

    expect(shallowToJson(wrapper)).toMatchSnapshot();
  });
});
