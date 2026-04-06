import OrderDetailsSection, {
  OrderDetailsSectionProps,
} from './OrderDetailsSection';
import * as React from 'react';
import userEvent from '@testing-library/user-event';
import { fireUnnnicInputChangeText, render, waitFor, act } from 'test/utils';
import { WhatsAppOrderDetailsFailures } from '../constants';

function getProps(): OrderDetailsSectionProps {
  return {
    orderDetails: {
      value: {
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
      },
    },
    onUpdateOrderDetails: vi.fn(),
  };
}

function emptyProps(): OrderDetailsSectionProps {
  return {
    orderDetails: {
      value: {
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
          pix_config: undefined,
        },
      },
    },
    onUpdateOrderDetails: vi.fn(),
  };
}

describe(OrderDetailsSection.name, () => {
  it('should render', async () => {
    const props = getProps();
    const { baseElement, getByTestId, getByText } = render(
      <OrderDetailsSection {...props} />,
    );

    // check initial render
    expect(baseElement).toMatchSnapshot();

    // expand payment settings collapse in the current order details settings tab
    userEvent.click(getByTestId('Payment settings'));
    expect(baseElement).toMatchSnapshot();

    // switch tab to payment buttons settings
    userEvent.click(getByText('Payment buttons'));
    expect(baseElement).toMatchSnapshot();
  });

  it('should render without any orderDetails data', () => {
    const { baseElement } = render(
      <OrderDetailsSection
        orderDetails={null}
        onUpdateOrderDetails={vi.fn()}
      />,
    );
    expect(baseElement).toMatchSnapshot();
  });

  it('should update order details', async () => {
    const props = emptyProps();
    const { getByTestId, getByText } = render(
      <OrderDetailsSection {...props} />,
    );

    expect(props.onUpdateOrderDetails).not.toHaveBeenCalled();

    fireUnnnicInputChangeText(getByTestId('Reference ID'), '456');
    fireUnnnicInputChangeText(getByTestId('Item List'), '@result.new_items');

    // expand payment settings collapse
    userEvent.click(getByTestId('Payment settings'));

    // fill fields in payment settings collapse
    fireUnnnicInputChangeText(getByTestId('Tax value'), '2000');
    fireUnnnicInputChangeText(getByTestId('Tax description'), 'new tax');
    fireUnnnicInputChangeText(getByTestId('Shipping value'), '3000');
    fireUnnnicInputChangeText(
      getByTestId('Shipping description'),
      'new shipping',
    );
    fireUnnnicInputChangeText(getByTestId('Discount value'), '4000');
    fireUnnnicInputChangeText(
      getByTestId('Discount description'),
      'new discount',
    );
    fireUnnnicInputChangeText(
      getByTestId('Discount program name'),
      'new program',
    );

    // switch payment type
    userEvent.click(getByText('Physical goods'));

    // now to digital goods
    userEvent.click(getByText('Digital goods'));

    // switch to payment buttons settings tab
    userEvent.click(getByText('Payment buttons'));

    // expand pay with card collapse
    userEvent.click(getByText('Pay with card'));
    fireUnnnicInputChangeText(
      getByTestId('Payment link'),
      'https://weni.ai/new',
    );

    // expand copy pix code collapse
    userEvent.click(getByText('Copy pix code'));
    fireUnnnicInputChangeText(getByTestId('Key'), 'new key');
    fireUnnnicInputChangeText(getByTestId('Key type'), 'new random');
    fireUnnnicInputChangeText(getByTestId("Merchant's name"), 'new merchant');
    fireUnnnicInputChangeText(getByTestId('Pix code'), 'new code');

    await waitFor(() => {
      expect(props.onUpdateOrderDetails).toHaveBeenCalled();
    });

    expect(props.onUpdateOrderDetails).toMatchSnapshot();
  });

  it('should render errors', async () => {
    const props = emptyProps();
    const { baseElement, rerender } = render(
      <OrderDetailsSection {...props} />,
    );

    props.orderDetails = {
      ...props.orderDetails,
    };

    rerender(<OrderDetailsSection {...props} />);
    expect(baseElement).toMatchSnapshot();

    props.orderDetails = {
      ...props.orderDetails,
      validationFailures: [
        {
          field: WhatsAppOrderDetailsFailures.PAYMENT_BUTTONS,
          message: 'At least one payment button is required',
        },
      ],
    };

    rerender(<OrderDetailsSection {...props} />);
    expect(baseElement).toMatchSnapshot();
  });
});
