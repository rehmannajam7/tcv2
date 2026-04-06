import * as React from 'react';
import { fireEvent, render, fireUnnnicTextAreaChangeText } from 'test/utils';
import {
  createSendEmailAction,
  getLocalizationFormProps,
  Spanish,
} from 'testUtils/assetCreators';

import KeyLocalizationForm from './KeyLocalizationForm';

describe(KeyLocalizationForm.name, () => {
  it('renders send email', () => {
    const props = getLocalizationFormProps(createSendEmailAction());
    const { baseElement } = render(<KeyLocalizationForm {...props} />);
    expect(baseElement).toMatchSnapshot();
  });

  it('handles changes', () => {
    const props = getLocalizationFormProps(createSendEmailAction());
    const { getByTestId, getByText } = render(
      <KeyLocalizationForm {...props} />,
    );

    // modify the subject
    fireUnnnicTextAreaChangeText(getByTestId('Subject'), 'translated subject');

    // modify the body
    fireEvent.click(getByText('Body Translation'));
    fireUnnnicTextAreaChangeText(getByTestId('Body'), 'translated body');

    // save our translations
    fireEvent.click(getByText('Ok'));
    expect(props.updateLocalizations).toMatchSnapshot();
  });

  it('removes translations', () => {
    const action = createSendEmailAction();
    const props = getLocalizationFormProps(action, Spanish, {
      [action.uuid]: { subject: ['hola'] },
    });

    // show that we initialized with hola
    const { baseElement, getByTestId, getByText } = render(
      <KeyLocalizationForm {...props} />,
    );
    expect(baseElement).toMatchSnapshot();

    // clear the translation
    fireUnnnicTextAreaChangeText(getByTestId('Subject'), '');

    // save our translations, which should remove the key
    fireEvent.click(getByText('Ok'));
    expect(props.updateLocalizations).toMatchSnapshot();
  });

  it('should close the modal', () => {
    const props = getLocalizationFormProps(createSendEmailAction());
    const { getByText } = render(<KeyLocalizationForm {...props} />);

    fireEvent.click(getByText('Cancel'));
    expect(props.onClose).toHaveBeenCalled();
  });
});
