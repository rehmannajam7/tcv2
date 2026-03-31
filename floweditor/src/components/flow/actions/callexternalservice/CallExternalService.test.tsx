import { CallExternalService } from 'flowTypes';
import { composeComponentTestUtils } from 'testUtils';

import CallExternalServiceComp from 'components/flow/actions/callexternalservice/CallExternalService';
import { shallowToJson } from 'enzyme-to-json';
import { createCallExternalServiceAction } from 'testUtils/assetCreators';

const CallBrainAction = createCallExternalServiceAction();

const { setup } = composeComponentTestUtils<CallExternalService>(
  CallExternalServiceComp,
  CallBrainAction as CallExternalService,
);

describe(CallExternalServiceComp.name, () => {
  it('should render', () => {
    const { wrapper } = setup();

    expect(shallowToJson(wrapper)).toMatchSnapshot();
  });
});
