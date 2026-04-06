import { ActionFormProps } from 'components/flow/props';
import { composeComponentTestUtils, mock } from 'testUtils';
import {
  createSendWhatsAppMsgAction,
  getActionFormProps,
} from 'testUtils/assetCreators';
import * as utils from 'utils';

import SendWhatsAppMsgForm from 'components/flow/actions/whatsapp/sendmsg/SendWhatsAppMsgForm';
import {
  WHATSAPP_HEADER_TYPE_MEDIA,
  WHATSAPP_HEADER_TYPE_TEXT,
  WHATSAPP_INTERACTION_TYPE_CTA,
  WHATSAPP_INTERACTION_TYPE_LIST,
  WHATSAPP_INTERACTION_TYPE_LOCATION,
  WHATSAPP_INTERACTION_TYPE_REPLIES,
  WHATSAPP_INTERACTION_TYPE_WHATSAPP_FLOWS,
  WHATSAPP_MESSAGE_TYPE_INTERACTIVE,
  WHATSAPP_MESSAGE_TYPE_SIMPLE,
  WHATSAPP_INTERACTION_TYPE_ORDER_DETAILS,
} from 'components/flow/actions/whatsapp/sendmsg/constants';
import { AxiosResponse } from 'axios';

const { setup } = composeComponentTestUtils<ActionFormProps>(
  SendWhatsAppMsgForm,
  getActionFormProps(createSendWhatsAppMsgAction()),
);

mock(utils, 'createUUID', utils.seededUUIDs());

describe(SendWhatsAppMsgForm.name, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('render', () => {
    it('should render', () => {
      const { instance }: { instance: SendWhatsAppMsgForm } = setup(true);
      expect(instance.render()).toMatchSnapshot();
    });
  });

  describe('updates', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should not save if message is empty and there is no attachment', () => {
      const {
        instance,
        props,
      }: {
        instance: SendWhatsAppMsgForm;
        props: ActionFormProps | Partial<ActionFormProps>;
      } = setup(true);
      instance.handleSave();
      expect(instance.state).toMatchSnapshot();
      expect(props.updateAction).not.toHaveBeenCalled();
    });

    it('should save changes with updated message', () => {
      const {
        instance,
        props,
      }: {
        instance: SendWhatsAppMsgForm;
        props: ActionFormProps | Partial<ActionFormProps>;
      } = setup(true);
      instance.handleMessageTypeUpdate([WHATSAPP_MESSAGE_TYPE_SIMPLE]);
      instance.handleMessageUpdate('new msg', null);
      expect(instance.state).toMatchSnapshot();
      instance.handleSave();
      expect(props.updateAction).toHaveBeenCalled();
      expect(props.updateAction).toMatchSnapshot();
    });

    it('should switch message type to interactive and go back to simple if desired', () => {
      const {
        instance,
        props,
      }: {
        instance: SendWhatsAppMsgForm;
        props: ActionFormProps | Partial<ActionFormProps>;
      } = setup(true);
      instance.handleMessageUpdate('new msg', null);
      expect(instance.state).toMatchSnapshot();
      instance.handleMessageTypeUpdate([WHATSAPP_MESSAGE_TYPE_INTERACTIVE]);
      expect(instance.state).toMatchSnapshot();
      instance.handleMessageTypeUpdate([WHATSAPP_MESSAGE_TYPE_SIMPLE]);
      expect(instance.state).toMatchSnapshot();
    });

    it('should save changes with updated attachment by url', () => {
      const {
        instance,
        props,
      }: {
        instance: SendWhatsAppMsgForm;
        props: ActionFormProps | Partial<ActionFormProps>;
      } = setup(true);
      instance.handleAttachmentUrlChange('http://weni.ai/image.png', null);
      expect(instance.state).toMatchSnapshot();
      instance.handleSave();
      expect(props.updateAction).toHaveBeenCalled();
      expect(props.updateAction).toMatchSnapshot();
    });

    it('should save changes with updated upload attachment', () => {
      const {
        instance,
        props,
      }: {
        instance: SendWhatsAppMsgForm;
        props: ActionFormProps | Partial<ActionFormProps>;
      } = setup(true);
      instance.handleAttachmentUploaded({
        data: { type: 'image', url: 'http://weni.ai/image.png' },
      } as AxiosResponse);
      expect(instance.state).toMatchSnapshot();
      instance.handleSave();
      expect(props.updateAction).toHaveBeenCalled();
      expect(props.updateAction).toMatchSnapshot();
    });

    it('should save changes after remove attachment', () => {
      const {
        instance,
        props,
      }: {
        instance: SendWhatsAppMsgForm;
        props: ActionFormProps | Partial<ActionFormProps>;
      } = setup(true);
      instance.handleMessageUpdate('new msg', null);
      instance.handleAttachmentUploaded({
        data: { type: 'image', url: 'http://weni.ai/image.png' },
      } as AxiosResponse);
      expect(instance.state).toMatchSnapshot();
      instance.handleAttachmentRemoved();
      expect(instance.state).toMatchSnapshot();
      instance.handleSave();
      expect(props.updateAction).toHaveBeenCalled();
      expect(props.updateAction).toMatchSnapshot();
    });

    it('should save changes with updated footer', () => {
      const {
        instance,
        props,
      }: {
        instance: SendWhatsAppMsgForm;
        props: ActionFormProps | Partial<ActionFormProps>;
      } = setup(true);
      // msg is required if there is no attachment
      instance.handleMessageUpdate('new msg', null);

      instance.handleFooterUpdate('new footer', null);

      // reply is required if there is a footer
      instance.handleInteractionTypeUpdate([WHATSAPP_INTERACTION_TYPE_REPLIES]);
      instance.handleQuickRepliesUpdate(['reply 1']);
      expect(instance.state).toMatchSnapshot();
      instance.handleSave();
      expect(props.updateAction).toHaveBeenCalled();
      expect(props.updateAction).toMatchSnapshot();
    });

    it('should save changes with updated header', () => {
      const {
        instance,
        props,
      }: {
        instance: SendWhatsAppMsgForm;
        props: ActionFormProps | Partial<ActionFormProps>;
      } = setup(true);
      // msg is required if there is no attachment
      instance.handleMessageUpdate('new msg', null);

      instance.handleHeaderTypeChange([WHATSAPP_HEADER_TYPE_TEXT]);
      instance.handleHeaderTextUpdate('new header', null);

      // interaction is required if there is a text header
      instance.handleInteractionTypeUpdate([WHATSAPP_INTERACTION_TYPE_REPLIES]);
      instance.handleQuickRepliesUpdate(['reply 1']);
      expect(instance.state).toMatchSnapshot();
      instance.handleSave();
      expect(props.updateAction).toHaveBeenCalled();
      expect(props.updateAction).toMatchSnapshot();
    });

    it('should save changes if header is set to media and filled, and there is no message', () => {
      const {
        instance,
        props,
      }: {
        instance: SendWhatsAppMsgForm;
        props: ActionFormProps | Partial<ActionFormProps>;
      } = setup(true);
      instance.handleHeaderTypeChange([WHATSAPP_HEADER_TYPE_MEDIA]);
      instance.handleAttachmentUploaded({
        data: { type: 'image', url: 'http://weni.ai/image.png' },
      } as AxiosResponse);
      expect(instance.state).toMatchSnapshot();
      instance.handleSave();
      expect(props.updateAction).toHaveBeenCalled();
      expect(props.updateAction).toMatchSnapshot();
    });

    it('should save changes if header is set to media and filled, and there are no replies or list items', () => {
      const {
        instance,
        props,
      }: {
        instance: SendWhatsAppMsgForm;
        props: ActionFormProps | Partial<ActionFormProps>;
      } = setup(true);
      instance.handleMessageUpdate('new msg', null);
      instance.handleHeaderTypeChange([WHATSAPP_HEADER_TYPE_MEDIA]);
      instance.handleAttachmentUploaded({
        data: { type: 'image', url: 'http://weni.ai/image.png' },
      } as AxiosResponse);
      expect(instance.state).toMatchSnapshot();
      instance.handleSave();
      expect(props.updateAction).toHaveBeenCalled();
      expect(props.updateAction).toMatchSnapshot();
    });

    it('should not save changes if header is set to text and filled but there are no replies or list items', () => {
      const {
        instance,
        props,
      }: {
        instance: SendWhatsAppMsgForm;
        props: ActionFormProps | Partial<ActionFormProps>;
      } = setup(true);
      // msg is required if there is no attachment
      instance.handleMessageUpdate('new msg', null);
      instance.handleMessageTypeUpdate([WHATSAPP_MESSAGE_TYPE_INTERACTIVE]);
      instance.handleInteractionTypeUpdate([WHATSAPP_INTERACTION_TYPE_REPLIES]);
      instance.handleHeaderTypeChange([WHATSAPP_HEADER_TYPE_TEXT]);
      instance.handleHeaderTextUpdate('new header', null);
      expect(instance.state).toMatchSnapshot();
      instance.handleSave();
      expect(props.updateAction).not.toHaveBeenCalled();

      instance.handleInteractionTypeUpdate([WHATSAPP_INTERACTION_TYPE_LIST]);
      expect(instance.state).toMatchSnapshot();
      instance.handleSave();
      expect(props.updateAction).not.toHaveBeenCalled();
    });

    it('should not save changes if footer is filled but there are no replies or list items', () => {
      const {
        instance,
        props,
      }: {
        instance: SendWhatsAppMsgForm;
        props: ActionFormProps | Partial<ActionFormProps>;
      } = setup(true);
      // msg is required if there is no attachment
      instance.handleMessageUpdate('new msg', null);
      instance.handleInteractionTypeUpdate([WHATSAPP_INTERACTION_TYPE_REPLIES]);
      instance.handleFooterUpdate('new footer', null);
      expect(instance.state).toMatchSnapshot();
      instance.handleSave();
      expect(props.updateAction).not.toHaveBeenCalled();

      instance.handleInteractionTypeUpdate([WHATSAPP_INTERACTION_TYPE_LIST]);
      expect(instance.state).toMatchSnapshot();
      instance.handleSave();
      expect(props.updateAction).not.toHaveBeenCalled();
    });

    it('should save changes with updated list items', () => {
      const {
        instance,
        props,
      }: {
        instance: SendWhatsAppMsgForm;
        props: ActionFormProps | Partial<ActionFormProps>;
      } = setup(true);
      // msg is required if there is no attachment
      instance.handleMessageUpdate('new msg', null);
      instance.handleInteractionTypeUpdate([WHATSAPP_INTERACTION_TYPE_LIST]);

      instance.handleListItemsUpdate([
        { uuid: '1', title: 'title 1', description: 'description 1' },
        { uuid: '2', title: 'title 2', description: 'description 2' },
      ]);

      instance.handleInteractionTypeUpdate([WHATSAPP_INTERACTION_TYPE_LIST]);
      expect(instance.state).toMatchSnapshot();
      instance.handleSave();
      expect(props.updateAction).toHaveBeenCalled();
      expect(props.updateAction).toMatchSnapshot();
    });

    it('should save changes with updated list items after a removal', () => {
      const {
        instance,
        props,
      }: {
        instance: SendWhatsAppMsgForm;
        props: ActionFormProps | Partial<ActionFormProps>;
      } = setup(true);
      // msg is required if there is no attachment
      instance.handleMessageUpdate('new msg', null);
      instance.handleInteractionTypeUpdate([WHATSAPP_INTERACTION_TYPE_LIST]);

      instance.handleListItemsUpdate([
        { uuid: '1', title: 'title 1', description: 'description 1' },
        { uuid: '2', title: 'title 2', description: 'description 2' },
      ]);
      expect(instance.state).toMatchSnapshot();
      instance.handleListItemRemoval({
        uuid: '1',
        title: 'title 1',
        description: 'description 1',
      });
      expect(instance.state).toMatchSnapshot();
      instance.handleSave();
      expect(props.updateAction).toHaveBeenCalled();
      expect(props.updateAction).toMatchSnapshot();
    });

    it('should not save changes with updated button text if no list items are provided', () => {
      const {
        instance,
        props,
      }: {
        instance: SendWhatsAppMsgForm;
        props: ActionFormProps | Partial<ActionFormProps>;
      } = setup(true);
      // msg is required if there is no attachment
      instance.handleMessageUpdate('new msg', null);
      instance.handleInteractionTypeUpdate([WHATSAPP_INTERACTION_TYPE_LIST]);

      instance.handleButtonTextUpdate('new button text');
      expect(instance.state).toMatchSnapshot();
      instance.handleSave();
      expect(props.updateAction).not.toHaveBeenCalled();
      expect(instance.state).toMatchSnapshot();
    });

    it('should save changes with updated button text', () => {
      const {
        instance,
        props,
      }: {
        instance: SendWhatsAppMsgForm;
        props: ActionFormProps | Partial<ActionFormProps>;
      } = setup(true);
      // msg is required if there is no attachment
      instance.handleMessageUpdate('new msg', null);
      instance.handleInteractionTypeUpdate([WHATSAPP_INTERACTION_TYPE_LIST]);
      instance.handleListItemsUpdate([
        { uuid: '1', title: 'title 1', description: 'description 1' },
        { uuid: '2', title: 'title 2', description: 'description 2' },
      ]);

      instance.handleButtonTextUpdate('new button text');
      expect(instance.state).toMatchSnapshot();
      instance.handleSave();
      expect(props.updateAction).toHaveBeenCalled();
      expect(props.updateAction).toMatchSnapshot();
    });

    it('should not save changes with updated button url if no list items are provided', () => {
      const {
        instance,
        props,
      }: {
        instance: SendWhatsAppMsgForm;
        props: ActionFormProps | Partial<ActionFormProps>;
      } = setup(true);
      // msg is required if there is no attachment
      instance.handleMessageUpdate('new msg', null);
      instance.handleInteractionTypeUpdate([WHATSAPP_INTERACTION_TYPE_LIST]);

      instance.handleActionURLUpdate('new url text');
      expect(instance.state).toMatchSnapshot();
      instance.handleSave();
      expect(props.updateAction).not.toHaveBeenCalled();
      expect(instance.state).toMatchSnapshot();
    });

    it('should save changes with updated button url', () => {
      const {
        instance,
        props,
      }: {
        instance: SendWhatsAppMsgForm;
        props: ActionFormProps | Partial<ActionFormProps>;
      } = setup(true);
      // msg is required if there is no attachment
      instance.handleMessageUpdate('new msg', null);
      instance.handleInteractionTypeUpdate([WHATSAPP_INTERACTION_TYPE_LIST]);
      instance.handleListItemsUpdate([
        { uuid: '1', title: 'title 1', description: 'description 1' },
        { uuid: '2', title: 'title 2', description: 'description 2' },
      ]);

      instance.handleActionURLUpdate('new url text');
      expect(instance.state).toMatchSnapshot();
      instance.handleSave();
      expect(props.updateAction).toHaveBeenCalled();
      expect(props.updateAction).toMatchSnapshot();
    });

    it('should save changes with updated quick replies', () => {
      const {
        instance,
        props,
      }: {
        instance: SendWhatsAppMsgForm;
        props: ActionFormProps | Partial<ActionFormProps>;
      } = setup(true);
      // msg is required if there is no attachment
      instance.handleMessageUpdate('new msg', null);
      instance.handleInteractionTypeUpdate([WHATSAPP_INTERACTION_TYPE_REPLIES]);

      instance.handleQuickRepliesUpdate(['reply 1', 'reply 2']);
      expect(instance.state).toMatchSnapshot();
      instance.handleSave();
      expect(props.updateAction).toHaveBeenCalled();
      expect(props.updateAction).toMatchSnapshot();
    });

    it('should save changes when interaction type is location', () => {
      const {
        instance,
        props,
      }: {
        instance: SendWhatsAppMsgForm;
        props: ActionFormProps | Partial<ActionFormProps>;
      } = setup(true);
      // msg is required if there is no attachment
      instance.handleMessageUpdate('new msg', null);
      instance.handleInteractionTypeUpdate([
        WHATSAPP_INTERACTION_TYPE_LOCATION,
      ]);

      expect(instance.state).toMatchSnapshot();
      instance.handleSave();
      expect(props.updateAction).toHaveBeenCalled();
      expect(props.updateAction).toMatchSnapshot();
    });

    it('should save changes with cta button and action url when interaction type is CTA', () => {
      const {
        instance,
        props,
      }: {
        instance: SendWhatsAppMsgForm;
        props: ActionFormProps | Partial<ActionFormProps>;
      } = setup(true);
      instance.handleMessageUpdate('new msg', null);
      instance.handleInteractionTypeUpdate([WHATSAPP_INTERACTION_TYPE_CTA]);
      instance.handleButtonTextUpdate('new button text');
      instance.handleActionURLUpdate('https://weni.ai');
      expect(instance.state).toMatchSnapshot();
      instance.handleSave();
      expect(props.updateAction).toHaveBeenCalled();
      expect(props.updateAction).toMatchSnapshot();
    });

    it('should save changes with whatsapp flow configured', () => {
      const {
        instance,
        props,
      }: {
        instance: SendWhatsAppMsgForm;
        props: ActionFormProps | Partial<ActionFormProps>;
      } = setup(true);
      instance.handleMessageUpdate('new msg', null);
      instance.handleInteractionTypeUpdate([
        WHATSAPP_INTERACTION_TYPE_WHATSAPP_FLOWS,
      ]);
      instance.handleWhatsAppFlowUpdate([
        {
          id: '123',
          name: 'wpp flow',
          assets: {
            screens: ['first screen', 'second screen'],
            variables: ['foo', 'file'],
          },
        },
      ]);
      instance.handleButtonTextUpdate('button text');
      instance.handleFlowScreenUpdate('first screen');
      instance.handleFlowDataUpdate('foo', 'bar');
      expect(instance.state).toMatchSnapshot();
      instance.handleSave();
      expect(props.updateAction).toHaveBeenCalled();
      expect(props.updateAction).toMatchSnapshot();

      // add an attachment-like value
      instance.handleFlowDataUpdate('file', 'file value');
      instance.handleFlowDataAttachmentNameUpdate('file', 'file name');

      expect(instance.state).toMatchSnapshot();
      instance.handleSave();
      expect(props.updateAction).toHaveBeenCalled();

      // it should remove the key from attachment name map
      instance.handleFlowDataUpdate('file', '');
      expect(instance.state).toMatchSnapshot();
      instance.handleSave();
      expect(props.updateAction).toHaveBeenCalled();
    });
  });

  it('should save changes with order details filled', () => {
    const {
      instance,
      props,
    }: {
      instance: SendWhatsAppMsgForm;
      props: ActionFormProps | Partial<ActionFormProps>;
    } = setup(true);
    instance.handleMessageUpdate('new msg', null);
    instance.handleMessageTypeUpdate([WHATSAPP_MESSAGE_TYPE_INTERACTIVE]);
    instance.handleInteractionTypeUpdate([
      WHATSAPP_INTERACTION_TYPE_ORDER_DETAILS,
    ]);
    instance.handleOrderDetailsUpdate({
      reference_id: '123',
      item_list: '@results.items',
      tax: {
        value: '1000',
        description: 'tax',
      },
      shipping: {
        value: '2000',
        description: 'shipping',
      },
      discount: {
        value: '3000',
        description: 'discount',
        program_name: 'program',
      },
      payment_settings: {
        type: 'physical-goods',
        payment_link: 'https://weni.ai',
        pix_config: {
          key: '123',
          key_type: 'random',
          merchant_name: 'merchant',
          code: '456',
        },
      },
    });
    expect(instance.state).toMatchSnapshot();
    instance.handleSave();
    expect(props.updateAction).toHaveBeenCalled();
    expect(props.updateAction).toMatchSnapshot();
  });

  it('should not save changes with order details filled if there is no message, reference id, item list or neither payment buttons', () => {
    const {
      instance,
      props,
    }: {
      instance: SendWhatsAppMsgForm;
      props: ActionFormProps | Partial<ActionFormProps>;
    } = setup(true);
    instance.handleMessageTypeUpdate([WHATSAPP_MESSAGE_TYPE_INTERACTIVE]);
    instance.handleInteractionTypeUpdate([
      WHATSAPP_INTERACTION_TYPE_ORDER_DETAILS,
    ]);
    instance.handleOrderDetailsUpdate({
      reference_id: '',
      item_list: '',
      tax: {
        value: '',
        description: '',
      },
      shipping: {
        value: '',
        description: '',
      },
      discount: {
        value: '',
        description: '',
        program_name: '',
      },
      payment_settings: {
        type: 'physical-goods',
        payment_link: '',
        pix_config: {
          key: '',
          key_type: '',
          merchant_name: '',
          code: '',
        },
      },
    });
    expect(instance.state).toMatchSnapshot();
    instance.handleSave();
    expect(props.updateAction).not.toHaveBeenCalled();
  });

  it("should not save changes with order details filled but missing a single pix config field if there's no payment link", () => {
    const {
      instance,
      props,
    }: {
      instance: SendWhatsAppMsgForm;
      props: ActionFormProps | Partial<ActionFormProps>;
    } = setup(true);
    instance.handleMessageTypeUpdate([WHATSAPP_MESSAGE_TYPE_INTERACTIVE]);
    instance.handleInteractionTypeUpdate([
      WHATSAPP_INTERACTION_TYPE_ORDER_DETAILS,
    ]);
    instance.handleOrderDetailsUpdate({
      reference_id: '123',
      item_list: '@results.items',
      tax: {
        value: '1000',
        description: 'tax',
      },
      shipping: {
        value: '2000',
        description: 'shipping',
      },
      discount: {
        value: '3000',
        description: 'discount',
        program_name: 'program',
      },
      payment_settings: {
        type: 'physical-goods',
        payment_link: '',
        pix_config: {
          key: '123',
          key_type: 'random',
          merchant_name: '',
          code: '456',
        },
      },
    });
    expect(instance.state).toMatchSnapshot();
    instance.handleSave();
    expect(props.updateAction).not.toHaveBeenCalled();
  });

  describe('cancel', () => {
    it('should cancel without changes', () => {
      const {
        instance,
        props,
      }: {
        instance: SendWhatsAppMsgForm;
        props: ActionFormProps | Partial<ActionFormProps>;
      } = setup(true, {
        $merge: { onClose: vi.fn(), updateAction: vi.fn() },
      });
      instance.handleMessageUpdate('new msg', null);
      instance.getButtons().tertiary.onClick();
      expect(props.onClose).toHaveBeenCalled();
      expect(props.updateAction).not.toHaveBeenCalled();
    });
  });
});
