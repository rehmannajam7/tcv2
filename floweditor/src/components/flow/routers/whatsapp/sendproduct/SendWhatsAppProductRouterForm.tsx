/* eslint-disable @typescript-eslint/explicit-member-accessibility */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { react as bindCallbacks } from 'auto-bind';
import Dialog, { ButtonSet } from 'components/dialog/Dialog';
import { hasErrors, renderIssues } from 'components/flow/actions/helpers';
import {
  nodeToState,
  stateToNode,
} from 'components/flow/routers/whatsapp/sendproduct/helpers';
import { RouterFormProps } from 'components/flow/props';
import AssetSelector from 'components/form/assetselector/AssetSelector';
import SwitchElement, {
  SwitchSizes,
} from 'components/form/switch/SwitchElement';
import TextInputElement, {
  TextInputSizes,
} from 'components/form/textinput/TextInputElement';
import TypeList from 'components/nodeeditor/TypeList';
import { createResultNameInput } from 'components/flow/routers/widgets';
import { fakePropType } from 'config/ConfigProvider';
import * as React from 'react';
import {
  FormState,
  mergeForm,
  StringEntry,
  FormEntry,
  ValidationFailure,
} from 'store/nodeEditor';
import {
  Alphanumeric,
  Required,
  StartIsNonNumeric,
  ValidURL,
  shouldRequireIf,
  validate,
  validateIf,
  ValidQueryParams,
} from 'store/validators';

import styles from './SendWhatsAppProductRouterForm.module.scss';

import i18n from 'config/i18n';

import { applyVueInReact } from 'veaury';
// @ts-ignore
import Unnnic from '@weni/unnnic-system';
import { TembaSelectStyle } from 'temba/TembaSelect';
import { WhatsAppProduct } from 'flowTypes';

const UnnnicIcon = applyVueInReact(Unnnic.unnnicIcon);

const UnnnicTooltip = applyVueInReact(Unnnic.unnnicToolTip, {
  react: {
    componentWrap: 'div',
    slotWrap: 'div',
    componentWrapAttrs: {
      style: {
        all: '',
      },
    },
  },
});

const UnnnicRadio = applyVueInReact(Unnnic.unnnicRadio, {
  react: {
    componentWrap: 'div',
    slotWrap: 'div',
    componentWrapAttrs: {
      style: {
        all: '',
      },
    },
  },
});

export enum ProductSearchType {
  Default = 'default',
  Vtex = 'vtex',
}

export interface ProductViewSettings {
  header: string;
  body: string;
  footer: string;
  action: string;
}

export interface ProductViewSettingsEntry extends FormEntry {
  value: {
    header: StringEntry;
    body: StringEntry;
    footer: StringEntry;
    action: StringEntry;
  };
}

export interface SendWhatsAppProductRouterFormState extends FormState {
  automaticProductSearch: boolean;
  sendCatalog: boolean;
  searchType: ProductSearchType;
  searchUrl: StringEntry;
  cartSimulationParams: StringEntry;
  sellerId: StringEntry;
  postalCode: StringEntry;
  products: FormEntry;
  productSearch: StringEntry;
  showProductViewSettings?: boolean;
  productViewSettings: ProductViewSettingsEntry;
  resultName: StringEntry;
}

interface UpdateKeys {
  automaticProductSearch?: boolean;
  sendCatalog?: boolean;
  searchType?: ProductSearchType;
  searchUrl?: string;
  cartSimulationParams?: string;
  sellerId?: string;
  postalCode?: string;
  productSearch?: string;
  products?: WhatsAppProduct[];
  productViewSettings?: ProductViewSettings;
}

export default class SendWhatsAppProductRouterForm extends React.Component<
  RouterFormProps,
  SendWhatsAppProductRouterFormState
> {
  constructor(props: RouterFormProps) {
    super(props);
    this.state = nodeToState(this.props.nodeSettings);
    bindCallbacks(this, {
      include: [/^handle/, /^on/],
    });
  }

  public static contextTypes = {
    config: fakePropType,
  };

  private handleUpdate(keys: UpdateKeys, submitting = false): boolean {
    const updates: Partial<SendWhatsAppProductRouterFormState> = {};
    if (keys.hasOwnProperty('automaticProductSearch')) {
      updates.automaticProductSearch = keys.automaticProductSearch;
    }

    if (keys.hasOwnProperty('sendCatalog')) {
      updates.sendCatalog = keys.sendCatalog;
    }

    if (keys.hasOwnProperty('searchType')) {
      updates.searchType = keys.searchType;
    }

    if (keys.hasOwnProperty('searchUrl')) {
      updates.searchUrl = validate(
        i18n.t('forms.custom_search', 'Custom Search URL'),
        keys.searchUrl,
        [
          shouldRequireIf(
            submitting &&
              this.state.automaticProductSearch &&
              this.state.searchType !== ProductSearchType.Default,
          ),
          validateIf(ValidURL, keys.searchUrl.indexOf('@') === -1),
        ],
      );
    }

    if (keys.hasOwnProperty('cartSimulationParams')) {
      updates.cartSimulationParams = validate(
        i18n.t('forms.cart_simulation_params', 'Cart Simulation Parameters'),
        keys.cartSimulationParams,
        [
          validateIf(
            ValidQueryParams,
            keys.cartSimulationParams &&
              keys.cartSimulationParams.trim().length > 0,
          ),
        ],
      );
    }

    if (keys.hasOwnProperty('sellerId')) {
      updates.sellerId = validate(
        i18n.t('forms.seller_id', 'Seller ID'),
        keys.sellerId,
        [],
      );
    }

    if (keys.hasOwnProperty('postalCode')) {
      updates.postalCode = validate(
        i18n.t('forms.postal_code', 'Postal Code'),
        keys.postalCode,
        [],
      );
    }

    if (keys.hasOwnProperty('productSearch')) {
      updates.productSearch = validate(
        i18n.t('forms.product_search', 'Product Search'),
        keys.productSearch,
        [shouldRequireIf(submitting && this.state.automaticProductSearch)],
      );
    }

    if (keys.hasOwnProperty('products')) {
      updates.products = validate(
        i18n.t('forms.products', 'Products'),
        keys.products,
        [
          shouldRequireIf(
            submitting &&
              !this.state.automaticProductSearch &&
              !this.state.sendCatalog,
          ),
        ],
      );
    }

    if (keys.hasOwnProperty('productViewSettings')) {
      const settings = { ...this.state.productViewSettings.value };
      const failures: ValidationFailure[] = [];

      if (keys.productViewSettings.hasOwnProperty('header')) {
        settings.header = validate(
          i18n.t('forms.header', 'Header'),
          keys.productViewSettings.header,
          [
            shouldRequireIf(
              submitting &&
                (this.state.automaticProductSearch ||
                  (!this.state.sendCatalog &&
                    this.state.products.value.length > 1)),
            ),
          ],
        );
      }
      if (keys.productViewSettings.hasOwnProperty('body')) {
        settings.body = validate(
          i18n.t('forms.body', 'Body'),
          keys.productViewSettings.body,
          [shouldRequireIf(submitting)],
        );
      }
      if (keys.productViewSettings.hasOwnProperty('footer')) {
        settings.footer = validate(
          i18n.t('forms.footer', 'Footer'),
          keys.productViewSettings.footer,
          [],
        );
      }
      if (keys.productViewSettings.hasOwnProperty('action')) {
        settings.action = validate(
          i18n.t('forms.action', 'Action'),
          keys.productViewSettings.action,
          [shouldRequireIf(submitting)],
        );
      }

      if (hasErrors(settings.header)) {
        failures.push(...settings.header.validationFailures);
      }
      if (hasErrors(settings.body)) {
        failures.push(...settings.body.validationFailures);
      }
      if (hasErrors(settings.action)) {
        failures.push(...settings.action.validationFailures);
      }

      updates.productViewSettings = {
        value: settings,
        validationFailures: failures,
      };
    }

    const updated = mergeForm(
      this.state,
      updates,
    ) as SendWhatsAppProductRouterFormState;

    this.setState(updated);
    return updated.valid;
  }

  private handleResultNameUpdate(value: string): void {
    const resultName = validate(
      i18n.t('forms.result_name', 'Result Name'),
      value,
      [Required, Alphanumeric, StartIsNonNumeric],
    );
    this.setState({
      resultName,
      valid: this.state.valid && !hasErrors(resultName),
    });
  }

  public handleAutomaticProductSearchUpdate(
    automaticProductSearch: boolean,
  ): boolean {
    const toUpdate: Partial<UpdateKeys> = {
      automaticProductSearch,
    };

    if (automaticProductSearch) {
      toUpdate.products = [];
    }

    return this.handleUpdate(toUpdate);
  }

  public toggleProductViewSettings() {
    this.setState({
      showProductViewSettings: !this.state.showProductViewSettings,
    });
  }

  public handleProductSearchChange(
    productSearch: string,
    name: string,
    submitting = false,
  ): boolean {
    return this.handleUpdate({ productSearch }, submitting);
  }

  public handleSellerIdChange(
    sellerId: string,
    name: string,
    submitting = false,
  ): boolean {
    return this.handleUpdate({ sellerId }, submitting);
  }

  public handlePostalCodeChange(
    postalCode: string,
    name: string,
    submitting = false,
  ): boolean {
    return this.handleUpdate({ postalCode }, submitting);
  }

  private handleProductsChanged(products: any[]) {
    const toUpdate: Partial<UpdateKeys> = { products };
    if (!products || products.length === 0) {
      toUpdate.productViewSettings = {
        header: this.state.productViewSettings.value.header.value || '',
        body: this.state.productViewSettings.value.body.value || '',
        footer: this.state.productViewSettings.value.footer.value || '',
        action: this.state.productViewSettings.value.action.value || '',
      };
    }
    this.handleUpdate(toUpdate);
  }

  private handleProductViewSettingsChange(text: string, name: string): boolean {
    return this.handleUpdate({
      productViewSettings: ({ [name]: text } as unknown) as ProductViewSettings,
    });
  }

  private handleSendCatalogUpdate(newValue: string) {
    return this.handleUpdate({
      sendCatalog: newValue === 'true',
    });
  }

  private handleSearchTypeUpdate(newValue: ProductSearchType) {
    return this.handleUpdate({
      searchType: newValue,
    });
  }

  public handleCartSimulationParamsChange(
    cartSimulationParams: string,
    name: string,
    submitting = false,
  ): boolean {
    return this.handleUpdate({ cartSimulationParams }, submitting);
  }

  public handleSearchUrlChange(
    searchUrl: string,
    name: string,
    submitting = false,
  ): boolean {
    return this.handleUpdate({ searchUrl }, submitting);
  }

  private handleSave(): void {
    // make sure we validate untouched text fields
    let valid = true;
    let currentCheck = this.handleProductSearchChange(
      this.state.productSearch.value,
      null,
      true,
    );

    currentCheck = this.handleUpdate(
      { products: this.state.products.value },
      true,
    );
    valid = valid && currentCheck;

    currentCheck = this.handleSearchTypeUpdate(this.state.searchType);
    valid = valid && currentCheck;

    currentCheck = this.handleSearchUrlChange(
      this.state.searchUrl.value,
      null,
      true,
    );
    valid = valid && currentCheck;

    currentCheck = this.handleCartSimulationParamsChange(
      this.state.cartSimulationParams.value,
      null,
      true,
    );
    valid = valid && currentCheck;

    currentCheck = this.handleUpdate(
      {
        productViewSettings: {
          header: this.state.productViewSettings.value.header.value,
          body: this.state.productViewSettings.value.body.value,
          footer: this.state.productViewSettings.value.footer.value,
          action: this.state.productViewSettings.value.action.value,
        },
      },
      true,
    );
    valid = valid && currentCheck;

    let validProductViewSettings = true;
    if (
      this.state.productViewSettings.validationFailures &&
      this.state.productViewSettings.validationFailures.length > 0
    ) {
      validProductViewSettings = false;
    }

    if (valid) {
      this.props.updateRouter(stateToNode(this.props.nodeSettings, this.state));
      // notify our modal we are done
      this.props.onClose(false);
    } else {
      // this.setState({ templateVariables, valid });
      this.setState({
        valid,
        showProductViewSettings: validProductViewSettings
          ? this.state.showProductViewSettings
          : true,
      });
    }
  }

  private getButtons(): ButtonSet {
    return {
      primary: { name: i18n.t('buttons.confirm'), onClick: this.handleSave },
      tertiary: {
        name: i18n.t('buttons.cancel', 'Cancel'),
        onClick: () => this.props.onClose(true),
      },
    };
  }

  private renderProductViewSettings() {
    const disableHeader =
      !this.state.automaticProductSearch &&
      (this.state.sendCatalog || this.state.products.value.length <= 1);

    return (
      <div className={styles.product_view_settings}>
        <div
          className={styles.title}
          data-testid="ViewSettings"
          onClick={() => this.toggleProductViewSettings()}
        >
          {i18n.t('forms.product_view_settings', 'View Settings (required)')}

          <UnnnicIcon
            icon={
              this.state.showProductViewSettings
                ? 'arrow-button-right-1'
                : 'arrow-button-down-1'
            }
            size="xs"
            scheme="neutral-cleanest"
          />
        </div>
        {this.state.showProductViewSettings ? (
          <>
            <div className={styles.content}>
              <div>
                <span className={styles.label}>
                  {i18n.t('forms.header', 'Header')}

                  {disableHeader && (
                    <UnnnicTooltip
                      text={i18n.t(
                        'forms.send_product.header_info',
                        'It is only possible to send a personalized header when \nmultiple products are selected.',
                      )}
                      side="right"
                      enabled={true}
                    >
                      <UnnnicIcon
                        className={styles.info_icon}
                        icon="info"
                        size="sm"
                      />
                    </UnnnicTooltip>
                  )}
                </span>
                <TextInputElement
                  name={i18n.t('forms.header', 'Header')}
                  placeholder={i18n.t('forms.ex_offers', 'Ex: Offers')}
                  onChange={value =>
                    this.handleProductViewSettingsChange(value, 'header')
                  }
                  entry={this.state.productViewSettings.value.header}
                  size={TextInputSizes.sm}
                  autocomplete
                  disabled={disableHeader}
                />
              </div>

              <TextInputElement
                name={i18n.t('forms.body', 'Body')}
                placeholder={i18n.t(
                  'forms.ex_products_body',
                  'Ex: offers are valid for 5 days',
                )}
                onChange={value =>
                  this.handleProductViewSettingsChange(value, 'body')
                }
                entry={this.state.productViewSettings.value.body}
                size={TextInputSizes.sm}
                showLabel
                autocomplete
                textarea
                maxLength={1024}
              />

              <TextInputElement
                name={i18n.t('forms.footer', 'Footer (optional)')}
                placeholder={i18n.t('forms.ex_footer', 'Ex: Footer')}
                onChange={value =>
                  this.handleProductViewSettingsChange(value, 'footer')
                }
                entry={this.state.productViewSettings.value.footer}
                size={TextInputSizes.sm}
                showLabel
                autocomplete
              />

              <TextInputElement
                name={i18n.t('forms.action', 'Action button title')}
                placeholder={i18n.t('forms.ex_products_action', 'Ex: Buy now')}
                onChange={value =>
                  this.handleProductViewSettingsChange(value, 'action')
                }
                entry={this.state.productViewSettings.value.action}
                size={TextInputSizes.sm}
                showLabel
                autocomplete
              />
            </div>
            <span className={styles.help_text}>
              {i18n.t(
                'forms.product_help_text',
                'The fields have character limitations, with header and footer 60 characters, body 1024 and action button title 20 characters.',
              )}
            </span>
          </>
        ) : null}
      </div>
    );
  }

  private renderWhatsappProductsConfig() {
    return (
      <div className={styles.products_config}>
        <div className={styles.automatic_check}>
          <SwitchElement
            name={i18n.t(
              'forms.search_and_send_products_automatically',
              'Search and send products automatically',
            )}
            title={i18n.t(
              'forms.search_and_send_products_automatically',
              'Search and send products automatically',
            )}
            checked={this.state.automaticProductSearch}
            onChange={this.handleAutomaticProductSearchUpdate}
            size={SwitchSizes.small}
          />
        </div>

        {this.state.automaticProductSearch
          ? this.renderAutomaticProductSearchForm()
          : this.renderManualProductSearchForm()}
      </div>
    );
  }

  private renderProductSelector() {
    return (
      <AssetSelector
        name={i18n.t(
          'forms.manually_select_products',
          'Manually select products',
        )}
        noOptionsMessage={i18n.t(
          'forms.no_products',
          "You don't have any product",
        )}
        assets={this.props.assetStore.whatsapp_products}
        entry={this.state.products}
        onChange={this.handleProductsChanged}
        nameKey="title"
        valueKey="facebook_product_id"
        style={TembaSelectStyle.small}
        queryParam="name"
        multi
        searchable
        showLabel
        pagination={{
          selectorName: i18n.t(
            'forms.manually_select_products',
            'Manually select products',
          ),
        }}
      />
    );
  }

  private renderAutomaticProductSearchForm() {
    return (
      <>
        <div className={styles.search_type_radio}>
          <UnnnicRadio
            v-model={[
              String(this.state.searchType),
              this.handleSearchTypeUpdate,
            ]}
            value="default"
            size="sm"
          >
            <span className="color-neutral-cloudy">
              {i18n.t('forms.default_search', 'Default search')}
            </span>
          </UnnnicRadio>
          <UnnnicRadio
            v-model={[
              String(this.state.searchType),
              this.handleSearchTypeUpdate,
            ]}
            value="vtex"
            size="sm"
          >
            <span className="color-neutral-cloudy">
              {i18n.t('forms.vtex_search', 'VTEX Search')}
            </span>
          </UnnnicRadio>
        </div>

        {this.renderProductViewSettings()}

        <TextInputElement
          name={i18n.t(
            'forms.product_search_label',
            'Enter an expression to be used as input',
          )}
          placeholder={i18n.t(
            'forms.product_search_placeholder',
            'Ex: @input.text',
          )}
          onChange={this.handleProductSearchChange}
          entry={this.state.productSearch}
          showLabel
          autocomplete
          size={TextInputSizes.sm}
        />

        {this.state.searchType === ProductSearchType.Vtex ? (
          <div className={styles.vtex_fields}>
            <div className={styles.search_url}>
              <TextInputElement
                name={i18n.t('forms.custom_search', 'Custom Search URL')}
                placeholder={i18n.t(
                  'forms.custom_search_api_url',
                  'Custom Search API URL',
                )}
                onChange={this.handleSearchUrlChange}
                entry={this.state.searchUrl}
                showLabel
                autocomplete
                size={TextInputSizes.sm}
              />
            </div>

            <div className={styles.cart_simulation_params}>
              <TextInputElement
                name={i18n.t(
                  'forms.cart_simulation_params',
                  'Cart Simulation Parameters (optional)',
                )}
                placeholder={i18n.t(
                  'forms.cart_simulation_params_placeholder',
                  'Ex: ?deliveryChannels=picking',
                )}
                onChange={this.handleCartSimulationParamsChange}
                entry={this.state.cartSimulationParams}
                showLabel
                autocomplete
                size={TextInputSizes.sm}
              />
            </div>

            <div className={styles.optional}>
              <div className={styles.seller_id}>
                <TextInputElement
                  name={i18n.t('forms.seller_id', 'Seller ID (optional)')}
                  placeholder={i18n.t(
                    'forms.ex_results',
                    'Ex: @results.seller_id',
                  )}
                  onChange={this.handleSellerIdChange}
                  entry={this.state.sellerId}
                  showLabel
                  autocomplete
                  size={TextInputSizes.sm}
                />
              </div>

              <div className={styles.postal_code}>
                <TextInputElement
                  name={i18n.t('forms.postal_code', 'Postal Code (optional)')}
                  placeholder={i18n.t(
                    'forms.ex_results',
                    'Ex: @results.postal_code',
                  )}
                  onChange={this.handlePostalCodeChange}
                  entry={this.state.postalCode}
                  showLabel
                  autocomplete
                  size={TextInputSizes.sm}
                />
              </div>
            </div>
          </div>
        ) : null}
      </>
    );
  }

  private renderManualProductSearchForm() {
    return (
      <>
        <div className={`${styles.send_catalog_radio}`}>
          <UnnnicRadio
            v-model={[
              String(this.state.sendCatalog),
              this.handleSendCatalogUpdate,
            ]}
            value="true"
            size="sm"
          >
            <span className="color-neutral-cloudy">
              {i18n.t('forms.send_complete_catalog', 'Send complete catalog')}
            </span>
          </UnnnicRadio>
          <UnnnicRadio
            v-model={[
              String(this.state.sendCatalog),
              this.handleSendCatalogUpdate,
            ]}
            value="false"
            size="sm"
          >
            <span className="color-neutral-cloudy">
              {i18n.t(
                'forms.select_products_to_send',
                'Select products to send',
              )}
            </span>
          </UnnnicRadio>
        </div>

        {this.renderProductViewSettings()}

        {this.state.sendCatalog ? null : this.renderProductSelector()}
      </>
    );
  }

  public render(): JSX.Element {
    const typeConfig = this.props.typeConfig;

    return (
      <Dialog
        title={typeConfig.name}
        headerClass={typeConfig.type}
        buttons={this.getButtons()}
        new={typeConfig.new}
      >
        <TypeList
          __className=""
          initialType={typeConfig}
          onChange={this.props.onTypeChange}
          nodeSettings={this.props.nodeSettings}
        />

        {this.renderWhatsappProductsConfig()}

        {createResultNameInput(
          this.state.resultName,
          this.handleResultNameUpdate,
        )}
        {renderIssues(this.props)}
      </Dialog>
    );
  }
}
