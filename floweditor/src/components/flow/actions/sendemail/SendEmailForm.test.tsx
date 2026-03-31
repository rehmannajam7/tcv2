import * as React from 'react';

import {
  fireEvent,
  render,
  fireUnnnicInputChangeText,
  fireUnnicInputKeyPress,
  fireUnnnicKeyDown,
  fireUnnnicTextAreaChangeText,
} from 'test/utils';
import {
  getActionFormProps,
  createSendEmailAction,
} from 'testUtils/assetCreators';

import SendEmailForm from 'components/flow/actions/sendemail/SendEmailForm';

describe(SendEmailForm.name, () => {
  it('should render', () => {
    const props = getActionFormProps(createSendEmailAction());
    const { baseElement } = render(<SendEmailForm {...props} />);
    expect(baseElement).toMatchSnapshot();
  });

  it('should save updated fields', () => {
    const props = getActionFormProps(
      createSendEmailAction({
        subject: '',
        body: '',
        addresses: [],
      }),
    );
    const { getByText, getByTestId } = render(<SendEmailForm {...props} />);

    // try to save without filling in required fields
    fireEvent.click(getByText('Confirm'));
    expect(props.updateAction).not.toHaveBeenCalled();

    // fill in a single recipient
    fireUnnnicInputChangeText(
      getByTestId('Recipient'),
      'newrecipient@email.com',
    );
    fireUnnnicKeyDown(getByTestId('Recipient'), 'Enter');
    fireUnnicInputKeyPress(getByTestId('Recipient'), 'Enter');

    // fill in a subject
    fireUnnnicInputChangeText(getByTestId('Subject'), 'new subject');

    // try to save without a body
    fireEvent.click(getByText('Confirm'));
    expect(props.updateAction).not.toHaveBeenCalled();

    // fill in a body
    fireUnnnicTextAreaChangeText(getByTestId('E-mail text'), 'new body');

    // save
    fireEvent.click(getByText('Confirm'));
    expect(props.updateAction).toMatchSnapshot();
    expect(props.updateAction).toHaveBeenCalledTimes(1);

    // fill in a second invalid recipient
    fireUnnnicInputChangeText(getByTestId('Recipient'), 'newrecipient2@email');

    fireUnnicInputKeyPress(getByTestId('Recipient'), 'Enter');

    // save but should not have the invalid email
    fireEvent.click(getByText('Confirm'));
    expect(props.updateAction).toMatchSnapshot();
    expect(props.updateAction).toHaveBeenCalledTimes(2);

    // fill in a second valid recipient
    fireUnnnicInputChangeText(
      getByTestId('Recipient'),
      'newrecipient2@email.com',
    );

    fireUnnnicKeyDown(getByTestId('Recipient'), 'Enter');
    fireUnnicInputKeyPress(getByTestId('Recipient'), 'Enter');

    // save
    fireEvent.click(getByText('Confirm'));
    expect(props.updateAction).toMatchSnapshot();
    expect(props.updateAction).toHaveBeenCalledTimes(3);

    // try to add a duplicate recipient
    fireUnnnicInputChangeText(
      getByTestId('Recipient'),
      'newrecipient2@email.com',
    );

    fireUnnnicKeyDown(getByTestId('Recipient'), 'Enter');
    fireUnnicInputKeyPress(getByTestId('Recipient'), 'Enter');

    // save but should not have the duplicate email
    fireEvent.click(getByText('Confirm'));
    expect(props.updateAction).toMatchSnapshot();
    expect(props.updateAction).toHaveBeenCalledTimes(4);

    // remove the first recipient
    fireEvent.click(getByTestId('remove-recipient-0'));

    // save
    fireEvent.click(getByText('Confirm'));
    expect(props.updateAction).toMatchSnapshot();
    expect(props.updateAction).toHaveBeenCalledTimes(5);
  });
});
