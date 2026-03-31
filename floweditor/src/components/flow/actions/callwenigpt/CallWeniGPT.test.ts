import { CallWeniGPT } from 'flowTypes';
import { composeComponentTestUtils } from 'testUtils';
import { createCallWeniGPTAction } from 'testUtils/assetCreators';
import { shallowToJson } from 'enzyme-to-json';

import CallWeniGPTComp, {
  getSavePlaceholder,
} from 'components/flow/actions/callwenigpt/CallWeniGPT';

const CallWeniGPTAction = createCallWeniGPTAction();

const { setup } = composeComponentTestUtils<CallWeniGPT>(
  CallWeniGPTComp,
  CallWeniGPTAction as CallWeniGPT,
);

describe(CallWeniGPTComp.name, () => {
  it('should render save placeholder when result prop passed', () => {
    const { wrapper, props } = setup();

    expect(
      wrapper.containsMatchingElement(getSavePlaceholder(props.result_name)),
    ).toBeTruthy();
    expect(shallowToJson(wrapper)).toMatchSnapshot();
  });
});
