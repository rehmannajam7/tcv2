import * as React from 'react';

import {
  fireEvent,
  render,
  fireUnnnicTextAreaChangeText,
  fireUnnnicInputChangeText,
  act,
  fireUnnnicTagDelete,
} from 'test/utils';
import {
  getLocalizationFormProps,
  Spanish,
  createSendMsgAction,
  createSayMsgAction,
} from 'testUtils/assetCreators';
import axios from 'axios';

import SendMsgLocalizationForm from './MsgLocalizationForm';
import userEvent from '@testing-library/user-event';

vi.mock('axios');

describe(SendMsgLocalizationForm.name, () => {
  it('renders send msg', () => {
    const props = getLocalizationFormProps(createSendMsgAction());
    const { baseElement } = render(<SendMsgLocalizationForm {...props} />);
    expect(baseElement).toMatchSnapshot();
  });

  it('handles changes', () => {
    const props = getLocalizationFormProps(createSendMsgAction());
    const { getByTestId, getByText } = render(
      <SendMsgLocalizationForm {...props} />,
    );

    // modify the message
    fireUnnnicTextAreaChangeText(getByTestId('Message'), 'translated message');

    // save our translations
    fireEvent.click(getByText('Ok'));
    expect(props.updateLocalizations).toMatchSnapshot();
  });

  it('removes translations', () => {
    const action = createSendMsgAction();
    const props = getLocalizationFormProps(action, Spanish, {
      [action.uuid]: { text: ['hola'] },
    });

    // show that we initialized with hola
    const { getByTestId, getByText } = render(
      <SendMsgLocalizationForm {...props} />,
    );
    fireEvent.click(getByText('Ok'));
    expect(props.updateLocalizations).toMatchSnapshot();

    // clear the translation
    fireUnnnicTextAreaChangeText(getByTestId('Message'), '');

    // save our translations, which should remove the key
    fireEvent.click(getByText('Ok'));
    expect(props.updateLocalizations).toMatchSnapshot();
  });

  it('should translate quick replies', async () => {
    const action = createSendMsgAction();
    const props = getLocalizationFormProps(action, Spanish, {
      [action.uuid]: { text: ['hola'], quick_replies: ['si', 'no'] },
    });

    const { getByTestId, getByText } = render(
      <SendMsgLocalizationForm {...props} />,
    );

    // modify our tab
    fireEvent.click(getByText('Quick Replies'));

    // remove a quick reply
    await act(async () => {
      fireUnnnicTagDelete(getByTestId('temba_remove_tag_no'));
    });

    // save our translations
    fireEvent.click(getByText('Ok'));
    expect(props.updateLocalizations).toMatchSnapshot();
  });

  it('should not allow invalid quick replies size', () => {
    const action = createSendMsgAction();
    const props = getLocalizationFormProps(action, Spanish, {
      [action.uuid]: {
        text: ['hola'],
        quick_replies: [
          '1',
          '2',
          '3',
          '4',
          '5',
          '6',
          '7',
          '8',
          '9',
          '10',
          '11',
        ],
      },
    });

    const { getByTestId, getByText } = render(
      <SendMsgLocalizationForm {...props} />,
    );

    // try to save our translations
    fireEvent.click(getByText('Ok'));
    expect(props.updateLocalizations).not.toHaveBeenCalled();

    // modify our tab
    fireEvent.click(getByText('Quick Replies'));

    // remove a quick reply
    fireUnnnicTagDelete(getByTestId('temba_remove_tag_11'));

    // save our translations
    fireEvent.click(getByText('Ok'));
    expect(props.updateLocalizations).toMatchSnapshot();
  });

  it('should translate template without variables', () => {
    const action = createSendMsgAction({
      templating: {
        template: {
          name: 'template',
          uuid: '9c22b594-fcab-4b29-9bcb-ce4404894a80',
        },
        uuid: 'd54ee634-c573-442b-8528-dea2765389a0',
        variables: [],
      },
    });
    const props = getLocalizationFormProps(action, Spanish, {
      [action.uuid]: {
        text: ['hola'],
        templating: {
          template: {
            name: 'template',
            uuid: '9c22b594-fcab-4b29-9bcb-ce4404894a80',
          },
          uuid: 'd54ee634-c573-442b-8528-dea2765389a0',
          variables: [],
        },
      },
    });

    const { getByText } = render(<SendMsgLocalizationForm {...props} />);

    // modify our tab
    fireEvent.click(getByText('WhatsApp'));

    // save our translations
    fireEvent.click(getByText('Ok'));
    expect(props.updateLocalizations).toMatchSnapshot();
  });

  it('should translate template variables', () => {
    const action = createSendMsgAction({
      templating: {
        template: {
          name: 'template',
          uuid: '9c22b594-fcab-4b29-9bcb-ce4404894a80',
        },
        uuid: 'd54ee634-c573-442b-8528-dea2765389a0',
        variables: ['first', 'second'],
      },
    });
    const props = getLocalizationFormProps(action, Spanish, {
      [action.uuid]: {
        text: ['hola'],
        templating: {
          template: {
            name: 'template',
            uuid: '9c22b594-fcab-4b29-9bcb-ce4404894a80',
          },
          uuid: 'd54ee634-c573-442b-8528-dea2765389a0',
          variables: ['uno', 'dos'],
        },
      },
    });

    const { getByTestId, getByText } = render(
      <SendMsgLocalizationForm {...props} />,
    );

    // modify our tab
    fireEvent.click(getByText('WhatsApp'));

    // modify our variables
    fireUnnnicInputChangeText(getByTestId('Variable 1'), 'uno nuevo');
    fireUnnnicInputChangeText(getByTestId('Variable 2'), 'dos nuevo');

    // save our translations
    fireEvent.click(getByText('Ok'));
    expect(props.updateLocalizations).toMatchSnapshot();
  });

  it('should translate attachments', async () => {
    const action = createSendMsgAction({
      attachments: ['image:https://example.com/image.jpg'],
    });
    const props = getLocalizationFormProps(action, Spanish, {
      [action.uuid]: {
        text: ['hola'],
        attachments: ['image:https://example.com/image_spanish.jpg'],
      },
    });

    const { getByTestId, getByText, getAllByText, getAllByTestId } = render(
      <SendMsgLocalizationForm {...props} />,
    );

    // modify our tab
    fireEvent.click(getByText('Attachments'));

    // modify our attachment
    await act(async () => {
      fireUnnnicInputChangeText(
        getAllByTestId('URL')[0],
        'https://example.com/image_spanish_modified.jpg',
      );
    });

    // save our translations
    fireEvent.click(getByText('Ok'));
    expect(props.updateLocalizations).toMatchSnapshot();

    // add a new attachment
    userEvent.click(getAllByText('Image URL')[1]);
    await act(async () => {
      fireUnnnicInputChangeText(
        getAllByTestId('URL')[1],
        'https://example.com/image_spanish_new.jpg',
      );
    });

    // save our translations
    fireEvent.click(getByText('Ok'));
    expect(props.updateLocalizations).toMatchSnapshot();

    // modify our tab
    fireEvent.click(getByText('Attachments'));

    // remove our attachment
    await act(async () => {
      fireEvent.click(getByTestId('remove-attachment-1'));
    });

    // save our translations
    fireEvent.click(getByText('Ok'));
    expect(props.updateLocalizations).toMatchSnapshot();
  });

  it('should translate audio from say_msg action', async () => {
    const action = createSayMsgAction();
    const props = getLocalizationFormProps(action, Spanish, {
      [action.uuid]: { audio_url: 'https://example.com/audio' },
    });

    const { getByTestId, getByText } = render(
      <SendMsgLocalizationForm {...props} />,
    );

    // @ts-expect-error we are mocking axios post request in __mocks__/axios.ts
    axios.post.mockResolvedValue({
      data: { url: ['https://example.com/audio_new.mp3'] },
    });

    // modify our audio
    await act(async () => {
      fireEvent.change(getByTestId('upload-audio-input'), {
        tager: { files: [new File([''], 'audio.mp3')] },
      });
    });

    // save our translations
    fireEvent.click(getByText('Ok'));
    expect(props.updateLocalizations).toMatchSnapshot();
  });

  it('should close the modal', () => {
    const props = getLocalizationFormProps(createSendMsgAction());
    const { getByText } = render(<SendMsgLocalizationForm {...props} />);

    fireEvent.click(getByText('Cancel'));
    expect(props.onClose).toHaveBeenCalled();
  });
});
