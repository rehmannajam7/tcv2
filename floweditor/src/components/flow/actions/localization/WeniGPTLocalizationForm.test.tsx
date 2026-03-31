import * as React from 'react';

import { fireEvent, render, fireUnnnicTextAreaChangeText } from 'test/utils';
import {
  getLocalizationFormProps,
  createCallWeniGPTAction,
  Spanish,
} from 'testUtils/assetCreators';

import WeniGPTLocalizationForm from './WeniGPTLocalizationForm';

describe(WeniGPTLocalizationForm.name, () => {
  it('should render wenigpt', () => {
    const props = getLocalizationFormProps(createCallWeniGPTAction());
    const { baseElement } = render(<WeniGPTLocalizationForm {...props} />);
    expect(baseElement).toMatchSnapshot();
  });

  it('should render wenigpt with initial values', () => {
    const action = createCallWeniGPTAction({
      input: 'hi',
    });
    const props = getLocalizationFormProps(action, Spanish, {
      [action.uuid]: { input: ['hola'] },
    });
    const { getByText } = render(<WeniGPTLocalizationForm {...props} />);

    fireEvent.click(getByText('Ok'));
    expect(props.updateLocalizations).toMatchSnapshot();
  });

  it('should save updated expression translation', () => {
    const props = getLocalizationFormProps(createCallWeniGPTAction());
    const { getByText, getByTestId } = render(
      <WeniGPTLocalizationForm {...props} />,
    );

    fireUnnnicTextAreaChangeText(getByTestId('Message'), 'new message');
    fireEvent.click(getByText('Ok'));

    expect(props.updateLocalizations).toMatchSnapshot();
  });

  it('should close the modal', () => {
    const props = getLocalizationFormProps(createCallWeniGPTAction());
    const { getByText } = render(<WeniGPTLocalizationForm {...props} />);

    fireEvent.click(getByText('Cancel'));
    expect(props.onClose).toHaveBeenCalled();
  });
});
