import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import CurrencyElement from './CurrencyElement';
import { CurrencyElementProps } from './CurrencyElement';
import { AssetType } from 'store/flowContext';
import styles from './CurrencyElement.module.scss';

const mockStore = configureStore([]);

describe('CurrencyElement Component', () => {
  let store: any;

  const mockOnChange = vi.fn();
  const mockOnRemove = vi.fn();

  const defaultProps: CurrencyElementProps = {
    currencies: {
      items: {
        ['id1']: {
          id: 'default currency',
          name: 'default currency',
          type: AssetType.Currency,
        },
      },
      type: AssetType.Currency,
    },
    transfer: {
      value: { amount: '100', code: 'USD' },
      validationFailures: [],
    },
    index: 0,
    exclude: [],
    onChange: mockOnChange,
    onRemove: mockOnRemove,
  };

  const props = {
    ...defaultProps,
    index: 1,
  };

  beforeEach(() => {
    store = mockStore({
      flowContext: {
        assetStore: {
          completion: {
            items: [],
          },
        },
      },
    });
  });

  it('renders correctly with default props', () => {
    const { getByText } = render(
      <Provider store={store}>
        <CurrencyElement {...defaultProps} />
      </Provider>,
    );
    expect(getByText(/default currency/i)).toBeInTheDocument();
  });

  it('renders amount input when index is greater than -1', () => {
    const { getByPlaceholderText } = render(
      <Provider store={store}>
        <CurrencyElement {...props} />
      </Provider>,
    );

    expect(getByPlaceholderText(/Transfer Amount/i)).toBeInTheDocument();
  });

  it('doesn`t render amount input when index is less than 0', () => {
    const props = {
      ...defaultProps,
      index: -1,
    };
    const { queryByPlaceholderText } = render(
      <Provider store={store}>
        <CurrencyElement {...props} />
      </Provider>,
    );

    expect(queryByPlaceholderText('Transfer Amount')).not.toBeInTheDocument();
  });

  it('renders remove icon when index is greater than -1', () => {
    const { container } = render(
      <Provider store={store}>
        <CurrencyElement {...props} />
      </Provider>,
    );

    const removeIcon = container.querySelector(`div.${styles.remove}`);
    expect(removeIcon).toBeInTheDocument();
  });

  it('doesn`t render remove icon when index is less than 0', () => {
    const props = {
      ...defaultProps,
      index: -1,
    };
    const { container } = render(
      <Provider store={store}>
        <CurrencyElement {...props} />
      </Provider>,
    );

    const removeIcon = container.querySelector(`div.${styles.remove}`);
    expect(removeIcon).not.toBeInTheDocument();
  });

  it('calls onRemove when remove icon is clicked', () => {
    const { container } = render(
      <Provider store={store}>
        <CurrencyElement {...props} />
      </Provider>,
    );

    const removeIcon = container.querySelector(`div.${styles.remove}`);
    fireEvent.click(removeIcon);

    expect(mockOnRemove).toHaveBeenCalledWith(1);
  });
});
