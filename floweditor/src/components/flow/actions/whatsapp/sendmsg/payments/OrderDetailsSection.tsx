import { react as bindCallbacks } from 'auto-bind';
import * as React from 'react';
import styles from 'components/flow/actions/whatsapp/sendmsg/payments/OrderDetailsSection.module.scss';

import { applyVueInReact } from 'veaury';
// @ts-ignore
import Unnnic from '@weni/unnnic-system';

import TextInputElement, {
  TextInputSizes,
} from 'components/form/textinput/TextInputElement';
import { Tab } from 'components/dialog/Dialog';
import i18n from 'config/i18n';
import { StringEntry, mergeForm, FormState, FormEntry } from 'store/nodeEditor';
import { WhatsAppOrderDetails } from 'components/flow/actions/whatsapp/sendmsg/payments/types';
import {
  propsToState,
  stateToProps,
} from 'components/flow/actions/whatsapp/sendmsg/payments/helpers';
import ContentCollapse from 'components/contentcollapse/ContentCollapse';
import { debounce } from 'utils';
import { WhatsAppOrderDetailsFailures } from 'components/flow/actions/whatsapp/sendmsg/constants';

const UnnnicTab = applyVueInReact(Unnnic.unnnicTab);
const UnnnicRadio = applyVueInReact(Unnnic.unnnicRadio);

export interface OrderDetailsSectionProps {
  orderDetails: FormEntry<WhatsAppOrderDetails>;
  onUpdateOrderDetails: (orderDetails: WhatsAppOrderDetails) => void;
}

export interface OrderDetailsSectionState extends FormState {
  activeTab: number;
  referenceID: StringEntry;
  itemList: StringEntry;
  taxValue: StringEntry;
  taxDescription: StringEntry;
  shippingValue: StringEntry;
  shippingDescription: StringEntry;
  discountValue: StringEntry;
  discountDescription: StringEntry;
  discountProgramName: StringEntry;
  paymentType: StringEntry;
  paymentLink: StringEntry;
  pixConfigKey: StringEntry;
  pixConfigKeyType: StringEntry;
  pixConfigMerchantName: StringEntry;
  pixConfigCode: StringEntry;
}

export default class OrderDetailsSection extends React.Component<
  OrderDetailsSectionProps,
  OrderDetailsSectionState
> {
  constructor(props: OrderDetailsSectionProps) {
    super(props);

    this.state = propsToState(props);

    bindCallbacks(this, {
      include: [/^on/, /^handle/],
    });
  }

  public componentDidUpdate(prevProps: OrderDetailsSectionProps): void {
    if (prevProps.orderDetails !== this.props.orderDetails) {
      if (
        this.props.orderDetails &&
        this.props.orderDetails.validationFailures &&
        this.props.orderDetails.validationFailures.length === 1 &&
        this.props.orderDetails.validationFailures[0].field ===
          WhatsAppOrderDetailsFailures.PAYMENT_BUTTONS
      ) {
        this.setState({ activeTab: 1 });
      }
    }
  }

  private updateState(updates: Partial<OrderDetailsSectionState>): void {
    const updated = mergeForm(this.state, updates) as OrderDetailsSectionState;

    this.setState(updated, () => {
      debounce(this.props.onUpdateOrderDetails, 250, () => {
        this.props.onUpdateOrderDetails(stateToProps(this.state));
      });
    });
  }

  private setActiveTab(tab: number): void {
    this.setState({ activeTab: tab });
  }

  private toStateEntry(
    event: string,
    key: keyof OrderDetailsSectionState,
  ): Partial<OrderDetailsSectionState> {
    return {
      [key]: { value: event },
    };
  }

  private getErrorFor(field: string) {
    if (
      !this.props.orderDetails ||
      !this.props.orderDetails.validationFailures
    ) {
      return null;
    }

    const error = this.props.orderDetails.validationFailures.find(
      failure => failure.field === field,
    );

    return error ? error.message : null;
  }

  private paymentSettingsFilled(): boolean {
    const {
      discountValue,
      discountProgramName,
      discountDescription,
      shippingValue,
      shippingDescription,
      taxValue,
      taxDescription,
    } = this.state;

    return !!(
      discountValue.value.trim() ||
      discountProgramName.value.trim() ||
      discountDescription.value.trim() ||
      shippingValue.value.trim() ||
      shippingDescription.value.trim() ||
      taxDescription.value.trim() ||
      (taxValue.value.trim() && taxValue.value.trim() !== '0')
    );
  }

  private pixConfigFilled(): boolean {
    const {
      pixConfigKey,
      pixConfigKeyType,
      pixConfigMerchantName,
      pixConfigCode,
    } = this.state;

    return !!(
      pixConfigKey.value.trim() &&
      pixConfigKeyType.value.trim() &&
      pixConfigMerchantName.value.trim() &&
      pixConfigCode.value.trim()
    );
  }

  private renderOrderDetailsSettings(): JSX.Element {
    return (
      <div className={styles.tab_settings}>
        <p className={styles.description}>
          {i18n.t(
            'whatsapp_interactions.payments.tab_description',
            'Configure the values ​​below with their respective variables',
          )}
        </p>

        <TextInputElement
          placeholder={i18n.t(
            'whatsapp_interactions.payments.reference_id_placeholder',
            'Input the order unique identifier',
          )}
          name={i18n.t(
            'whatsapp_interactions.payments.reference_id',
            'Reference ID',
          )}
          size={TextInputSizes.sm}
          onChange={event =>
            this.updateState(this.toStateEntry(event, 'referenceID'))
          }
          entry={this.state.referenceID}
          autocomplete={true}
          showLabel={true}
          error={this.getErrorFor(WhatsAppOrderDetailsFailures.REFERENCE_ID)}
        />

        <TextInputElement
          placeholder={i18n.t(
            'whatsapp_interactions.payments.items_placeholder',
            'eg., @results.item_list',
          )}
          name={i18n.t('whatsapp_interactions.payments.items', 'Item List')}
          size={TextInputSizes.sm}
          onChange={event =>
            this.updateState(this.toStateEntry(event, 'itemList'))
          }
          entry={this.state.itemList}
          autocomplete={true}
          showLabel={true}
          error={this.getErrorFor(WhatsAppOrderDetailsFailures.ITEM_LIST)}
        />

        <div>
          <p className={styles.payment_type_label}>
            {i18n.t(
              'whatsapp_interactions.payments.payment_type_label',
              'Payment type',
            )}
          </p>
          <UnnnicRadio
            v-model={[
              this.state.paymentType.value,
              (event: string) =>
                this.updateState(this.toStateEntry(event, 'paymentType')),
            ]}
            value="physical-goods"
            size="md"
          >
            <span className="color-neutral-cloudy">
              {i18n.t(
                'whatsapp_interactions.payments.payment_type.physical_goods',
                'Physical goods',
              )}
            </span>
          </UnnnicRadio>
          <UnnnicRadio
            v-model={[
              this.state.paymentType.value,
              (event: string) =>
                this.updateState(this.toStateEntry(event, 'paymentType')),
            ]}
            value="digital-goods"
            size="md"
          >
            <span className="color-neutral-cloudy">
              {i18n.t(
                'whatsapp_interactions.payments.payment_type.digital_goods',
                'Digital goods',
              )}
            </span>
          </UnnnicRadio>
        </div>

        <ContentCollapse
          title={i18n.t(
            'whatsapp_interactions.payments.payment_settings',
            'Payment settings',
          )}
          optional
          titleIcon="check_circle"
          titleIconScheme={
            this.paymentSettingsFilled() ? 'weni-600' : 'neutral-soft'
          }
        >
          <div className={styles.payment_settings}>
            <div className={styles.row_fields}>
              <div className={styles.small}>
                <TextInputElement
                  placeholder={i18n.t(
                    'whatsapp_interactions.payments.discount_value_placeholder',
                    '5.99',
                  )}
                  name={i18n.t(
                    'whatsapp_interactions.payments.discount_value',
                    'Discount value',
                  )}
                  size={TextInputSizes.sm}
                  onChange={event =>
                    this.updateState(this.toStateEntry(event, 'discountValue'))
                  }
                  entry={this.state.discountValue}
                  autocomplete={true}
                  showLabel={true}
                />
              </div>

              <TextInputElement
                placeholder={i18n.t(
                  'whatsapp_interactions.payments.discount_program_name_placeholder',
                  'e.g., Summer Sale, VIP Discount',
                )}
                name={i18n.t(
                  'whatsapp_interactions.payments.discount_program_name',
                  'Discount program name',
                )}
                size={TextInputSizes.sm}
                onChange={event =>
                  this.updateState(
                    this.toStateEntry(event, 'discountProgramName'),
                  )
                }
                entry={this.state.discountProgramName}
                autocomplete={true}
                showLabel={true}
              />

              <TextInputElement
                placeholder={i18n.t(
                  'whatsapp_interactions.payments.discount_description_placeholder',
                  'e.g., 10% off on all eletronics',
                )}
                name={i18n.t(
                  'whatsapp_interactions.payments.discount_description',
                  'Discount description',
                )}
                size={TextInputSizes.sm}
                onChange={event =>
                  this.updateState(
                    this.toStateEntry(event, 'discountDescription'),
                  )
                }
                entry={this.state.discountDescription}
                autocomplete={true}
                showLabel={true}
              />
            </div>

            <div className={styles.divider} />

            <div className={styles.row_fields}>
              <TextInputElement
                placeholder={i18n.t(
                  'whatsapp_interactions.payments.shipping_value_placeholder',
                  '9.99',
                )}
                name={i18n.t(
                  'whatsapp_interactions.payments.shipping_value',
                  'Shipping value',
                )}
                size={TextInputSizes.sm}
                onChange={event =>
                  this.updateState(this.toStateEntry(event, 'shippingValue'))
                }
                entry={this.state.shippingValue}
                autocomplete={true}
                showLabel={true}
              />

              <TextInputElement
                placeholder={i18n.t(
                  'whatsapp_interactions.payments.shipping_description_placeholder',
                  'e.g., Standard shipping (5-7 days)',
                )}
                name={i18n.t(
                  'whatsapp_interactions.payments.shipping_description',
                  'Shipping description',
                )}
                size={TextInputSizes.sm}
                onChange={event =>
                  this.updateState(
                    this.toStateEntry(event, 'shippingDescription'),
                  )
                }
                entry={this.state.shippingDescription}
                autocomplete={true}
                showLabel={true}
              />
            </div>

            <div className={styles.divider} />

            <div className={styles.row_fields}>
              <TextInputElement
                placeholder={i18n.t(
                  'whatsapp_interactions.payments.tax_value_placeholder',
                  '0',
                )}
                name={i18n.t(
                  'whatsapp_interactions.payments.tax_value',
                  'Tax value',
                )}
                size={TextInputSizes.sm}
                onChange={event =>
                  this.updateState(this.toStateEntry(event, 'taxValue'))
                }
                entry={this.state.taxValue}
                autocomplete={true}
                showLabel={true}
              />

              <TextInputElement
                placeholder={i18n.t(
                  'whatsapp_interactions.payments.tax_description_placeholder',
                  'e.g., 10% tax on all products',
                )}
                name={i18n.t(
                  'whatsapp_interactions.payments.tax_description',
                  'Tax description',
                )}
                size={TextInputSizes.sm}
                onChange={event =>
                  this.updateState(this.toStateEntry(event, 'taxDescription'))
                }
                entry={this.state.taxDescription}
                autocomplete={true}
                showLabel={true}
              />
            </div>
          </div>
        </ContentCollapse>
      </div>
    );
  }

  private renderPaymentButtonsSettings(): JSX.Element {
    return (
      <div className={styles.tab_settings}>
        <p className={styles.description}>
          {i18n.t(
            'whatsapp_interactions.payments.tab_description',
            'Configure the values ​​below with their respective variables',
          )}
        </p>

        <div className={styles.collapses_wrapper}>
          <ContentCollapse
            title={i18n.t(
              'whatsapp_interactions.payments.pay_with_card',
              'Pay with card',
            )}
            titleIcon="check_circle"
            titleIconScheme={
              this.state.paymentLink.value &&
              this.state.paymentLink.value.trim()
                ? 'weni-600'
                : 'neutral-soft'
            }
          >
            <TextInputElement
              placeholder={i18n.t(
                'whatsapp_interactions.payments.payment_link_placeholder',
                'https://checkout.psp.com',
              )}
              name={i18n.t(
                'whatsapp_interactions.payments.payment_link',
                'Payment link',
              )}
              size={TextInputSizes.sm}
              onChange={event =>
                this.updateState(this.toStateEntry(event, 'paymentLink'))
              }
              entry={this.state.paymentLink}
              autocomplete={true}
              showLabel={true}
            />
          </ContentCollapse>

          <ContentCollapse
            title={i18n.t(
              'whatsapp_interactions.payments.pix_payment',
              'Copy pix code',
            )}
            titleIcon="check_circle"
            titleIconScheme={
              this.pixConfigFilled() ? 'weni-600' : 'neutral-soft'
            }
            wrapper_class={styles.pix_payment_collapse}
          >
            <TextInputElement
              placeholder={i18n.t(
                'whatsapp_interactions.payments.pix_config_code_placeholder',
                'e.g., 00020126330014br.gov.bcb.pix01111335366962052040000530398654040.805802BR5919NOME6014CIDADE62',
              )}
              name={i18n.t(
                'whatsapp_interactions.payments.pix_config_code',
                'Pix code',
              )}
              size={TextInputSizes.sm}
              onChange={event =>
                this.updateState(this.toStateEntry(event, 'pixConfigCode'))
              }
              entry={this.state.pixConfigCode}
              autocomplete={true}
              showLabel={true}
            />

            <TextInputElement
              placeholder={i18n.t(
                'whatsapp_interactions.payments.pix_config_merchant_name_placeholder',
                "e.g., Emily's cake",
              )}
              name={i18n.t(
                'whatsapp_interactions.payments.pix_config_merchant_name',
                "Merchant's name",
              )}
              size={TextInputSizes.sm}
              onChange={event =>
                this.updateState(
                  this.toStateEntry(event, 'pixConfigMerchantName'),
                )
              }
              entry={this.state.pixConfigMerchantName}
              autocomplete={true}
              showLabel={true}
            />

            <div className={styles.row_fields}>
              <TextInputElement
                placeholder={i18n.t(
                  'whatsapp_interactions.payments.pix_config_key_type_placeholder',
                  'e.g., CPF, PHONE, CNPJ',
                )}
                name={i18n.t(
                  'whatsapp_interactions.payments.pix_config_key_type',
                  'Key type',
                )}
                size={TextInputSizes.sm}
                onChange={event =>
                  this.updateState(this.toStateEntry(event, 'pixConfigKeyType'))
                }
                entry={this.state.pixConfigKeyType}
                autocomplete={true}
                showLabel={true}
              />

              <TextInputElement
                placeholder={i18n.t(
                  'whatsapp_interactions.payments.pix_config_key_placeholder',
                  'eg., 09888542156',
                )}
                name={i18n.t(
                  'whatsapp_interactions.payments.pix_config_key',
                  'Key',
                )}
                size={TextInputSizes.sm}
                onChange={event =>
                  this.updateState(this.toStateEntry(event, 'pixConfigKey'))
                }
                entry={this.state.pixConfigKey}
                autocomplete={true}
                showLabel={true}
              />
            </div>
          </ContentCollapse>
          <p className={styles.payment_buttons_error}>
            {this.getErrorFor(WhatsAppOrderDetailsFailures.PAYMENT_BUTTONS)}
          </p>
        </div>
      </div>
    );
  }

  public render(): JSX.Element {
    const orderDetails: Tab = {
      name: i18n.t(
        'whatsapp_interactions.payments.order_details',
        'Order details',
      ),
      body: this.renderOrderDetailsSettings(),
    };

    const paymentButtons: Tab = {
      name: i18n.t(
        'whatsapp_interactions.payments.payment_buttons',
        'Payment buttons',
      ),
      body: this.renderPaymentButtonsSettings(),
    };

    const tabs = [orderDetails, paymentButtons];

    const tabsSlots = {
      'tab-head-0': orderDetails.name,
      'tab-head-1': paymentButtons.name,
    };

    return (
      <div>
        <UnnnicTab
          className={styles.tabs}
          size="sm"
          initialTab={String(this.state.activeTab)}
          tabs={[...tabs.map((tab: Tab, index: number) => String(index))]}
          v-slots={tabsSlots}
          activeTab={String(this.state.activeTab)}
          onChange={(tab: any) => this.setActiveTab(tab)}
        />
        <div>{tabs[this.state.activeTab].body}</div>
      </div>
    );
  }
}
