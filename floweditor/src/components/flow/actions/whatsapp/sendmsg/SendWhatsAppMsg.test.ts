import { SendWhatsAppMsg } from 'flowTypes';
import { composeComponentTestUtils } from 'testUtils';
import { createSendWhatsAppMsgAction } from 'testUtils/assetCreators';
import { set } from 'utils';

import SendWhatsAppMsgComp from 'components/flow/actions/whatsapp/sendmsg/SendWhatsAppMsg';

const sendWhatsAppMsgAction = createSendWhatsAppMsgAction();

const { setup } = composeComponentTestUtils<SendWhatsAppMsg>(
  SendWhatsAppMsgComp,
  sendWhatsAppMsgAction,
);

describe(SendWhatsAppMsgComp.name, () => {
  describe('render', () => {
    it('should render text prop when passed', () => {
      const { wrapper, props } = setup(false, { text: set('Text') });

      expect(wrapper.text()).toBe(props.text);
      expect(wrapper.html()).toMatchSnapshot();
    });

    it('should render quick replies list when passed', () => {
      const { wrapper } = setup(false, {
        quick_replies: set(['Quick Reply 1']),
      });

      expect(wrapper.text()).toContain('Quick Reply 1');
      expect(wrapper.html()).toMatchSnapshot();
    });

    it('should render list items when passed', () => {
      const { wrapper } = setup(false, {
        list_items: set([{ title: 'Title 1', description: 'Description 1' }]),
      });

      expect(wrapper.text()).toContain('Title 1');
      expect(wrapper.html()).toMatchSnapshot();
    });

    it('should render attachment items when passed', () => {
      const { wrapper } = setup(false, {
        attachment: set(true),
      });

      expect(wrapper.html()).toMatchSnapshot();
    });
  });
});
