import CallResthookComp from './CallResthook';
import { CallResthook } from 'flowTypes';
import { composeComponentTestUtils } from 'testUtils';
import { createCallResthookAction } from 'testUtils/assetCreators';
import { shallowToJson } from 'enzyme-to-json';

const callResthookAction = createCallResthookAction();

const { setup } = composeComponentTestUtils<CallResthook>(
  CallResthookComp,
  callResthookAction as CallResthook,
);

describe(CallResthookComp.name, () => {
  describe('render', () => {
    it('should render self', () => {
      const { wrapper, props } = setup();
      expect(wrapper.text()).toBe(props.resthook);
      expect(shallowToJson(wrapper)).toMatchSnapshot();
    });
  });
});
