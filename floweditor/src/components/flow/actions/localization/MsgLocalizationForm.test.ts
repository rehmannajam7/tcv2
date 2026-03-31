import SendMsgLocalizationForm from 'components/flow/actions/localization/MsgLocalizationForm';
import { LocalizationFormProps } from 'components/flow/props';
import { getTypeConfig } from 'config';
import { Types } from 'config/interfaces';
import { LocalizedObject } from 'services/Localization';
import { composeComponentTestUtils } from 'testUtils';
import { createSendMsgAction, Spanish } from 'testUtils/assetCreators';
import { shallowToJson } from 'enzyme-to-json';

const action = createSendMsgAction();
const sendConfig = getTypeConfig(Types.send_broadcast);

const baseProps: LocalizationFormProps = {
  language: Spanish,
  updateLocalizations: vi.fn(),
  onClose: vi.fn(),
  nodeSettings: {
    originalNode: null,
    originalAction: action,
  },
  helpArticles: {},
  issues: [],
};

const { setup } = composeComponentTestUtils<LocalizationFormProps>(
  SendMsgLocalizationForm,
  baseProps,
);

describe(SendMsgLocalizationForm.name, () => {
  describe('render', () => {
    it('should render', () => {
      const { wrapper } = setup(true);
      expect(shallowToJson(wrapper)).toMatchSnapshot();
    });
  });

  describe('inits', () => {
    it('inits with initial values', () => {
      const localizedObject = new LocalizedObject(action, Spanish);
      localizedObject.addTranslation('text', ['¡hola!']);
      const { wrapper } = setup(true, {
        nodeSettings: { $merge: { localizations: [localizedObject] } },
      });

      expect(shallowToJson(wrapper)).toMatchSnapshot();
    });
  });

  describe('updates', () => {
    it('should save changes', () => {
      const { instance, props } = setup(true, {
        $merge: { updateLocalizations: vi.fn(), onClose: vi.fn() },
      });

      instance.handleMessageUpdate('What is your favorite color?');
      instance.handleQuickRepliesUpdate(['red', 'green', 'blue']);
      expect(instance.state).toMatchSnapshot();

      instance.handleSave();
      expect(props.onClose).toHaveBeenCalled();
      expect(props.updateLocalizations).toHaveBeenCalled();
      expect(props.updateLocalizations).toMatchSnapshot();
    });

    it('should ignore empty quick replies', () => {
      const { instance, props } = setup(true, {
        $merge: { updateLocalizations: vi.fn(), onClose: vi.fn() },
      });

      instance.handleQuickRepliesUpdate([]);
      expect(instance.state).toMatchSnapshot();

      instance.handleSave();
      expect(props.onClose).toHaveBeenCalled();
      expect(props.updateLocalizations).toHaveBeenCalled();
      expect(props.updateLocalizations).toMatchSnapshot();
    });
  });

  describe('cancel', () => {
    it('should cancel without changes', () => {
      const { instance, props } = setup(true, {
        $merge: { updateLocalizations: vi.fn(), onClose: vi.fn() },
      });
      instance.handleMessageUpdate("Don't save me bro");
      instance.getButtons().secondary.onClick();
      expect(props.onClose).toHaveBeenCalled();
      expect(props.updateLocalizations).not.toHaveBeenCalled();
    });
  });
});
