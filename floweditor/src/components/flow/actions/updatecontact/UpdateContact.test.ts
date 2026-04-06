import UpdateContactComp from 'components/flow/actions/updatecontact/UpdateContact';
import { SetContactField } from 'flowTypes';
import { composeComponentTestUtils } from 'testUtils';
import {
  createSetContactChannelAction,
  createSetContactFieldAction,
  createSetContactLanguageAction,
  createSetContactNameAction,
  createSetContactStatusAction,
} from 'testUtils/assetCreators';
import { shallowToJson } from 'enzyme-to-json';

describe(UpdateContactComp.name, () => {
  const setNameAction = createSetContactNameAction();
  const { setup } = composeComponentTestUtils(UpdateContactComp, setNameAction);

  describe('render', () => {
    it('should render set name', () => {
      const { wrapper } = setup(true);
      expect(shallowToJson(wrapper)).toMatchSnapshot();
    });

    it('should render set channel', () => {
      const { wrapper } = setup(true, {
        $set: createSetContactChannelAction(),
      });
      expect(shallowToJson(wrapper)).toMatchSnapshot();
    });

    it('should render set field', () => {
      const { wrapper } = setup(true, { $set: createSetContactFieldAction() });
      expect(shallowToJson(wrapper)).toMatchSnapshot();
    });

    it('should render set language', () => {
      const { wrapper } = setup(true, {
        $set: createSetContactLanguageAction(),
      });
      expect(shallowToJson(wrapper)).toMatchSnapshot();
    });

    it('should render set status', () => {
      const { wrapper } = setup(true, {
        $set: createSetContactStatusAction(),
      });
      expect(shallowToJson(wrapper)).toMatchSnapshot();
    });

    it('should render clearing the value', () => {
      const setFieldAction = createSetContactFieldAction();
      (setFieldAction as SetContactField).value = null;

      const { wrapper } = setup(true, { $set: setFieldAction });
      expect(shallowToJson(wrapper)).toMatchSnapshot();
    });
  });
});
