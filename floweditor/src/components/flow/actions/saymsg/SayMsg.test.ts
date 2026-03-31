import SayMsgComp, { PLACEHOLDER } from 'components/flow/actions/saymsg/SayMsg';
import { SayMsg } from 'flowTypes';
import { composeComponentTestUtils } from 'testUtils';
import { createSendMsgAction } from 'testUtils/assetCreators';
import { setEmpty } from 'utils';
import { shallowToJson } from 'enzyme-to-json';

const sendMsgAction = createSendMsgAction();

const { setup } = composeComponentTestUtils<SayMsg>(SayMsgComp, sendMsgAction);

describe(SayMsgComp.name, () => {
  describe('render', () => {
    it('should render text prop when passed', () => {
      const { wrapper, props } = setup();

      expect(wrapper.text()).toBe(props.text);
      expect(shallowToJson(wrapper)).toMatchSnapshot();
    });

    it("should render placeholder when text prop isn't passed", () => {
      const { wrapper } = setup(true, { text: setEmpty() });

      expect(wrapper.text()).toBe(PLACEHOLDER);
      expect(shallowToJson(wrapper)).toMatchSnapshot();
    });
  });
});
