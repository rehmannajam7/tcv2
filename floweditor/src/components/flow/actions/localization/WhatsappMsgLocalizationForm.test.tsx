import * as React from 'react';

import {
  fireEvent,
  render,
  fireUnnnicTextAreaChangeText,
  fireUnnnicInputChangeText,
  act,
} from 'test/utils';
import {
  getLocalizationFormProps,
  createSendWhatsAppMsgAction,
  Spanish,
} from 'testUtils/assetCreators';

import WhastsappMsgLocalizationForm from './WhastsappMsgLocalizationForm';

import axios from 'axios';
import {
  WhatsAppMessageType,
  WhatsAppHeaderType,
} from '../whatsapp/sendmsg/constants';
import userEvent from '@testing-library/user-event';
vi.mock('axios');

describe(WhastsappMsgLocalizationForm.name, () => {
  it('should start with the correct values', () => {
    const action = createSendWhatsAppMsgAction({
      messageType: WhatsAppMessageType.INTERACTIVE,
      header_type: WhatsAppHeaderType.TEXT,
      header_text: 'header text',
      attachment: 'image:https://example.com/image.png',
      text: 'text',
      footer: 'footer',
      button_text: 'button text',
      action_url: 'action url',
      list_items: [
        {
          uuid: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
          title: 'title 1',
          description: 'description 1',
        },
        {
          uuid: '550e8400-e29b-41d4-a716-446655440000',
          title: 'title 2',
          description: 'description 2',
        },
      ],
    });
    const props = getLocalizationFormProps(action, Spanish, {
      [action.uuid]: {
        text: ['texto'],
        header_text: ['texto de encabezado'],
        footer: ['pie de página'],
        button_text: ['texto del botón'],
        action_url: ['url de acción'],
        attachment: ['image:https://example.com/imagen.png'],
      },
      [action.list_items[0].uuid]: {
        title: ['título 1'],
        description: ['descripción 1'],
      },
      [action.list_items[1].uuid]: {
        title: ['título 2'],
        description: ['descripción 2'],
      },
    });
    const { getByText } = render(<WhastsappMsgLocalizationForm {...props} />);

    // save our translations
    fireEvent.click(getByText('Ok'));
    expect(props.updateLocalizations).toMatchSnapshot();
  });

  it('should save updated message translation', async () => {
    const props = getLocalizationFormProps(createSendWhatsAppMsgAction());
    const { getByText, getByTestId, debug } = render(
      <WhastsappMsgLocalizationForm {...props} />,
    );

    fireUnnnicTextAreaChangeText(getByTestId('Message'), 'new message');

    fireEvent.click(getByText('Ok'));
    expect(props.updateLocalizations).toMatchSnapshot();

    // add an url attachment
    fireUnnnicInputChangeText(
      getByTestId('Media (optional)'),
      'https://example.com/image.png',
    );

    // save our translations
    fireEvent.click(getByText('Ok'));
    expect(props.updateLocalizations).toMatchSnapshot();

    // @ts-expect-error we are mocking axios post request in __mocks__/axios.ts
    axios.post.mockResolvedValue({
      data: { type: 'audio', url: 'https://example.com/audio_new.mp3' },
    });

    /// upload a new attachment
    await act(async () => {
      fireEvent.change(getByTestId('upload-input'), {
        tager: { files: [new File([''], 'audio.mp3')] },
      });
    });

    // save our translations
    fireEvent.click(getByText('Ok'));
    expect(props.updateLocalizations).toMatchSnapshot();

    // remove our attachment
    userEvent.click(getByTestId('Remove attachment'));

    // save our translations
    fireEvent.click(getByText('Ok'));
    expect(props.updateLocalizations).toMatchSnapshot();
  });

  it('should save translated quick replies', () => {
    const props = getLocalizationFormProps(
      createSendWhatsAppMsgAction({
        quick_replies: ['quick reply 1', 'quick reply 2'],
      }),
    );
    const { getByText, getByTestId, getAllByTestId } = render(
      <WhastsappMsgLocalizationForm {...props} />,
    );

    // modify our tab
    fireEvent.click(getByText('Quick Replies'));

    // add a new quick reply
    fireUnnnicInputChangeText(getByTestId('Reply'), 'quick reply 1 spanish');

    fireEvent.click(getByText('Ok'));
    expect(props.updateLocalizations).toMatchSnapshot();

    // add a new quick reply, another input field should exist now
    fireUnnnicInputChangeText(
      getAllByTestId('Reply')[1],
      'quick reply 2 spanish',
    );

    // save our translations
    fireEvent.click(getByText('Ok'));
    expect(props.updateLocalizations).toMatchSnapshot();
  });

  it('should update an interactive message with list items', () => {
    const props = getLocalizationFormProps(
      createSendWhatsAppMsgAction({
        messageType: WhatsAppMessageType.INTERACTIVE,
        header_type: WhatsAppHeaderType.TEXT,
        header_text: 'header text',
        text: 'text',
        footer: 'footer',
        button_text: 'button text',
        action_url: 'action url',
        list_items: [
          {
            uuid: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
            title: 'title 1',
            description: 'description 1',
          },
          {
            uuid: '550e8400-e29b-41d4-a716-446655440000',
            title: 'title 2',
            description: 'description 2',
          },
        ],
      }),
    );
    const {
      getByText,
      getAllByText,
      getByTestId,
      getAllByTestId,
      debug,
    } = render(<WhastsappMsgLocalizationForm {...props} />);

    // modify our header type and go back to text to check if the final state is correct
    userEvent.click(getByText('Media'));
    userEvent.click(getByText('Text'));

    // modify our header
    fireUnnnicInputChangeText(getByTestId('Header text'), 'nuevo header');

    // modify our text
    fireUnnnicTextAreaChangeText(getByTestId('Message'), 'nuevo texto');

    // modify our footer
    fireUnnnicInputChangeText(getByTestId('Footer (optional)'), 'nuevo footer');

    // modify our button text
    fireUnnnicInputChangeText(getByTestId('Button Text'), 'nuevo button text');

    // modify our action url
    fireUnnnicInputChangeText(getByTestId('Action URL'), 'nuevo action url');

    // add a new list item
    fireUnnnicInputChangeText(getAllByTestId('Title')[0], 'título 1');
    fireUnnnicInputChangeText(
      getAllByTestId('Description (Optional)')[0],
      'descripción 1',
    );

    // save our translations
    fireEvent.click(getByText('Ok'));
    expect(props.updateLocalizations).toMatchSnapshot();

    // add a new list item, another input field should exist now
    fireUnnnicInputChangeText(getAllByTestId('Title')[1], 'título 2');
    fireUnnnicInputChangeText(
      getAllByTestId('Description (Optional)')[1],
      'descripción 2',
    );

    // save our translations again
    fireEvent.click(getByText('Ok'));
    expect(props.updateLocalizations).toMatchSnapshot();

    // remove our list item
    userEvent.click(getAllByText('Remove')[0]);

    // save our translations
    fireEvent.click(getByText('Ok'));
    expect(props.updateLocalizations).toMatchSnapshot();
  });

  it('should close the modal', () => {
    const props = getLocalizationFormProps(createSendWhatsAppMsgAction());
    const { getByText } = render(<WhastsappMsgLocalizationForm {...props} />);

    fireEvent.click(getByText('Cancel'));
    expect(props.onClose).toHaveBeenCalled();
  });
});
