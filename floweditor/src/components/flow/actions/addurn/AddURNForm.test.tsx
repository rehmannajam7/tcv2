import AddURNForm from 'components/flow/actions/addurn/AddURNForm';
import { Types } from 'config/interfaces';
import { AddURN } from 'flowTypes';
import React from 'react';
import { render, fireUnnnicInputChangeText } from 'test/utils';
import { getActionFormProps } from 'testUtils/assetCreators';

const props = getActionFormProps({
  scheme: 'tel',
  path: '+12065551212',
  type: Types.add_contact_urn,
} as AddURN);

describe(AddURNForm.name, () => {
  it('renders', () => {
    const { baseElement } = render(<AddURNForm {...props} />);
    expect(baseElement).toMatchSnapshot();
  });

  it('should render if originalAction is missing', () => {
    const newProps = {
      ...props,
      nodeSettings: { ...props.nodeSettings, originalAction: null as any },
    };
    const { baseElement } = render(<AddURNForm {...newProps} />);
    expect(baseElement).toMatchSnapshot();
  });

  it('should save', () => {
    const { getByText, getByTestId } = render(<AddURNForm {...props} />);

    // changes urn type
    getByText('WhatsApp Number').click();

    // changes urn value
    fireUnnnicInputChangeText(getByTestId('Value of URN'), '1234567890');

    // save
    getByText('Confirm').click();

    expect(props.updateAction).toHaveBeenCalled();
    expect(props.updateAction).toMatchSnapshot();
  });

  it('should not save if urn value is empty', () => {
    const { getByText, getByTestId } = render(<AddURNForm {...props} />);

    // changes urn type
    getByText('WhatsApp Number').click();

    // changes urn value
    fireUnnnicInputChangeText(getByTestId('Value of URN'), '');

    // save
    getByText('Confirm').click();

    expect(props.updateAction).not.toHaveBeenCalled();
  });

  it('closes', () => {
    const { getByText } = render(<AddURNForm {...props} />);
    getByText('Cancel').click();
    expect(props.onClose).toHaveBeenCalled();
  });
});
