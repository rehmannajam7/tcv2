import { react as bindCallbacks } from 'auto-bind';
import Dialog, { ButtonSet } from 'components/dialog/Dialog';
import { hasErrors, renderIssues } from 'components/flow/actions/helpers';
import { RouterFormProps } from 'components/flow/props';
import { nodeToState, stateToNode } from './helpers';
import { FormState, mergeForm, StringEntry, FormEntry } from 'store/nodeEditor';
import {
  Alphanumeric,
  Required,
  shouldRequireIf,
  StartIsNonNumeric,
  validate,
} from 'store/validators';
import AssetSelector from 'components/form/assetselector/AssetSelector';
import { Asset } from 'store/flowContext';
import * as React from 'react';
import i18n from 'config/i18n';
import { createUUID } from 'utils';
import TembaSelect from 'temba/TembaSelect';
import TypeList from 'components/nodeeditor/TypeList';
import { createResultNameInput } from 'components/flow/routers/widgets';
import ParamList from 'components/flow/routers/paramlist/ParamList';
import { ServiceCall, ServiceCallParam } from 'config/interfaces';
import { fakePropType } from '../../../../config/ConfigProvider';

export interface ExternalServiceRouterFormState extends FormState {
  externalService: FormEntry;
  call: FormEntry;
  resultName: StringEntry;
  params: FormEntry;
}

export default class ExternalServiceRouterForm extends React.Component<
  RouterFormProps,
  ExternalServiceRouterFormState
> {
  public static contextTypes = {
    config: fakePropType,
  };

  constructor(props: RouterFormProps) {
    super(props);
    const externalServices = Object.values(
      this.props.assetStore.externalServices.items,
    );
    const externalService =
      externalServices.length === 1 ? externalServices[0] : null;
    this.state = nodeToState(
      this.props.nodeSettings,
      this.props.assetStore.externalServices.items,
      externalService,
    );

    bindCallbacks(this, {
      include: [/^handle/],
    });
  }

  private handleUpdate(
    keys: {
      externalService?: Asset;
      call?: ServiceCall;
      resultName?: string;
      params?: any[];
    },
    submitting = false,
    callback?: () => void,
  ): boolean {
    const updates: Partial<ExternalServiceRouterFormState> = {};

    if (keys.hasOwnProperty('externalService')) {
      updates.externalService = validate(
        i18n.t('forms.externalService', 'External Service'),
        keys.externalService,
        [shouldRequireIf(submitting)],
      );
    }

    if (keys.hasOwnProperty('call')) {
      updates.call = validate(i18n.t('forms.call', 'Call'), keys.call, [
        shouldRequireIf(submitting),
      ]);
    }

    if (keys.hasOwnProperty('resultName')) {
      updates.resultName = validate(
        i18n.t('forms.result_name', 'Result Name'),
        keys.resultName,
        [shouldRequireIf(submitting)],
      );
    }

    let hasInvalidParam = false;
    if (keys.hasOwnProperty('params')) {
      updates.params = validate(
        i18n.t('forms.params', 'Params'),
        keys.params,
        [],
      );

      updates.params.value = updates.params.value.map((param: any) => {
        let valid = true;
        // TODO: Check if it is necessary to validate the param if it is not a string
        if (
          typeof param.data.value === 'string' ||
          param.data.value instanceof String
        ) {
          const missingFilter =
            param.filter &&
            param.filter.value == null &&
            param.filters &&
            param.filters.length > 0;

          if (
            !param.valid ||
            param.data.value.trim().length === 0 ||
            missingFilter
          ) {
            valid = false;
            hasInvalidParam = true;
          }
        }

        return { ...param, valid };
      });

      if (this.state.externalService.value.actions) {
        updates.params.value = this.mapParamOptions(
          updates.params.value,
          this.state.externalService.value.actions,
        );
      }
    }

    const updated = mergeForm(this.state, updates);

    if (hasInvalidParam) {
      updated.valid = false;
    }

    this.setState(updated, callback);
    return updated.valid;
  }

  private mapParamOptions(params: ServiceCallParam[], calls: ServiceCall[]) {
    return params.map((param: ServiceCallParam) => {
      if (!this.state.call || !this.state.call.value) return param;

      const call = calls.find((call: ServiceCall) => {
        return call.name === this.state.call.value.name;
      });

      if (call && call.params && call.params.length > 0) {
        const paramWithOptions = call.params.find(
          (callParam: ServiceCallParam) => {
            return callParam.type === param.type;
          },
        );

        if (!paramWithOptions) return param;
        return { ...param, options: paramWithOptions.options };
      }
      return param;
    });
  }

  private async handleExternalServiceUpdate(selected: any[]) {
    const newService = selected[0];

    this.handleUpdate({ externalService: newService }, false, () => {
      this.handleCallUpdate(newService.actions[0]);
    });
  }

  private handleCallUpdate(call: ServiceCall): void {
    const requiredParams: any[] = [];

    call.params.forEach(param => {
      const data: FormEntry = { value: '', validationFailures: [] };
      if (param.required) {
        requiredParams.push({ ...param, data, uuid: createUUID() });
        return;
      }

      if (!param.filters) return;

      param.filters.forEach(filter => {
        if (filter.required) {
          requiredParams.push({
            ...param,
            filter: { value: filter },
            data,
            uuid: createUUID(),
          });
        }
      });
    });

    this.handleUpdate({ call, params: requiredParams });
  }

  private handleParamsUpdated(params: any[]): void {
    this.handleUpdate({ params });
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

  private handleSave(): void {
    // remove the last param if they are not required as it is an empty one
    if (!this.state.call.value.disableEmptyParams) {
      try {
        const lastParam =
          this.state.params.value.length > 0 &&
          this.state.params.value.slice(-1)[0];
        if (lastParam && (!lastParam.data || !lastParam.data.value)) {
          const hasFilters = lastParam.required || lastParam.filters;
          const hasSelectedFilter =
            typeof lastParam.filter.value === 'object' &&
            lastParam.filter.value;
          const isRequired =
            lastParam.required ||
            (lastParam.filter.value && lastParam.filter.value.required);

          if (!hasFilters || !hasSelectedFilter || !isRequired) {
            this.state.params.value.pop();
          }
        }
      } catch (e) {}
    }

    const valid = this.handleUpdate(
      {
        externalService: this.state.externalService.value,
        call: this.state.call.value,
        params: this.state.params.value,
        resultName: this.state.resultName.value,
      },
      true,
    );

    if (valid) {
      this.props.updateRouter(stateToNode(this.props.nodeSettings, this.state));
      this.props.onClose(false);
    }
  }

  private availableParams(): ServiceCallParam[] {
    if (!this.state.call || !this.state.params) {
      return [];
    }

    const allParams = this.state.call.value ? this.state.call.value.params : [];
    const inputParams = this.state.params.value;

    const paramsWithCleanFilters = allParams.map((param: any) => {
      if ((param.filters && !param.filters.length) || !param.filters) {
        return param;
      }

      const newFilters = param.filters.filter((filter: any) => {
        const hasFilter = inputParams.find((inputParam: any) => {
          if (inputParam.filter.value) {
            return inputParam.filter.value.name === filter.name;
          }

          return false;
        });

        return !hasFilter;
      });

      return { ...param, filters: newFilters };
    });

    const filteredParams = paramsWithCleanFilters.filter((param: any) => {
      // simple param, just check if it has been used
      if ((param.filters && !param.filters.length) || !param.filters) {
        const usedParam = inputParams.find(
          (inputParam: any) => inputParam.type === param.type,
        );
        return !usedParam;
      } else if (param.filters && param.filters.length) {
        return true;
      }

      return false;
    });

    return filteredParams as ServiceCallParam[];
  }

  private getButtons(): ButtonSet {
    return {
      primary: { name: i18n.t('buttons.ok', 'ok'), onClick: this.handleSave },
      secondary: {
        name: i18n.t('buttons.cancel', 'Cancel'),
        onClick: () => this.props.onClose(true),
      },
    };
  }

  private renderEdit(): JSX.Element {
    const typeConfig = this.props.typeConfig;

    const showExternalServices =
      Object.keys(this.props.assetStore.externalServices.items).length > 0 ||
      this.props.issues.length > 0;

    const showCallSelection = !!this.state.externalService.value;

    const showParamList = this.state.call ? !!this.state.call.value : false;

    const availableParams = this.availableParams();

    return (
      <Dialog
        title={typeConfig.name}
        headerClass={typeConfig.type}
        buttons={this.getButtons()}
      >
        <TypeList
          __className=""
          initialType={typeConfig}
          onChange={this.props.onTypeChange}
          nodeSettings={this.props.nodeSettings}
        />
        {showExternalServices ? (
          <div>
            <p>
              <span>
                {i18n.t('forms.integration_with', 'Integration with...')}
              </span>
            </p>
            <AssetSelector
              key="select_external_service"
              name={i18n.t('forms.external_service', 'External Service')}
              placeholder={i18n.t(
                'forms.select_external_service',
                'Select the external service to use',
              )}
              assets={this.props.assetStore.externalServices}
              onChange={this.handleExternalServiceUpdate}
              entry={this.state.externalService}
            />
          </div>
        ) : (
          ''
        )}
        {showCallSelection ? (
          <div>
            <p>
              <span>Action</span>
            </p>
            <TembaSelect
              key="select_external_service_call"
              name={i18n.t(
                'forms.external_service_call',
                'External Service Call',
              )}
              placeholder="Select the call from external service to do"
              options={this.state.externalService.value.actions}
              nameKey="verboseName"
              onChange={this.handleCallUpdate}
              value={this.state.call ? this.state.call.value : null}
              searchable={false}
            />
          </div>
        ) : (
          <></>
        )}
        {showParamList ? (
          <ParamList
            key={this.state.call.value.name}
            availableParams={availableParams}
            params={this.state.params.value}
            onParamsUpdated={this.handleParamsUpdated}
            shouldCreateEmptyParam={!this.state.call.value.disableEmptyParams}
          />
        ) : (
          <></>
        )}
        {createResultNameInput(
          this.state.resultName,
          this.handleResultNameUpdate,
        )}
        {renderIssues(this.props)}
      </Dialog>
    );
  }

  public render(): JSX.Element {
    return this.renderEdit();
  }
}
