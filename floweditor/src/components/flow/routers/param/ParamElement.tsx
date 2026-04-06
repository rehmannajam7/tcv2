import { react as bindCallbacks } from 'auto-bind';
import FormElement from 'components/form/FormElement';
import TextInputElement, {
  TextInputStyle,
} from 'components/form/textinput/TextInputElement';
import SwitchElement, {
  SwitchSizes,
} from 'components/form/switch/SwitchElement';
import { ServiceCallParam, ParamFilter } from 'config/interfaces';
import * as React from 'react';
import { FormEntry, FormState } from 'store/nodeEditor';

import styles from './ParamElement.module.scss';
import { initializeForm, validateParam } from './helpers';
import i18n from 'config/i18n';
import TembaSelect, { TembaSelectStyle } from 'temba/TembaSelect';
import { ParamProps } from '../paramlist/ParamList';

import { applyVueInReact } from 'veaury';

// @ts-ignore
import Unnnic from '@weni/unnnic-system';
import { DragIcon } from 'pureIcons/DragIcon';

const UnnnicIcon = applyVueInReact(Unnnic.unnnicIcon, {
  vue: {
    componentWrap: 'div',
    slotWrap: 'div',
    componentWrapAttrs: {
      'data-draggable': 'true',
      style: {
        all: '',
      },
    },

    slotWrapAttrs: {
      'data-draggable': 'true',
      style: {
        all: '',
      },
    },
  },
});

export enum ParamTypes {
  multiSelect = 'multiSelect',
  boolean = 'boolean',
  expressionInput = 'expressionInput',
}

export interface ParamElementProps {
  initialParam: ParamProps;
  availableParams: ServiceCallParam[];
  name?: string; // satisfy form widget props
  hasArrangeFunctionality: boolean;
  onRemove?(uuid: string): void;
  onChange?(p: ParamProps): void;
}

export interface ParamElementState extends FormState {
  errors: string[];
  currentParam: ServiceCallParam;
  currentFilter: ParamFilter;
  data: FormEntry;
}

export default class ParamElement extends React.Component<
  ParamElementProps,
  ParamElementState
> {
  constructor(props: ParamElementProps) {
    super(props);

    bindCallbacks(this, {
      include: [/^handle/],
    });

    this.state = initializeForm(props);
  }

  public componentDidMount() {
    const updates = validateParam({
      currentParam: this.state.currentParam,
      currentFilter: this.state.currentFilter,
      data: this.state.data,
    });
    this.setState(updates as ParamElementState, () => this.handleChange());
  }

  // eslint-disable-next-line react/no-deprecated
  public componentWillReceiveProps(
    nextProps: Readonly<ParamElementProps>,
  ): void {
    if (nextProps.initialParam !== this.props.initialParam) {
      this.setState(initializeForm(nextProps), () => {
        const updates = validateParam({
          currentParam: this.state.currentParam,
          currentFilter: this.state.currentFilter,
          data: this.state.data,
        });
        this.setState(updates as ParamElementState);
      });
    }
  }

  private handleParamChange(newParam: ServiceCallParam): void {
    const updates = validateParam({
      currentParam: newParam,
      currentFilter:
        newParam.filters && newParam.filters.length >= 1
          ? newParam.filters[0]
          : null,
      data: this.state.data,
    });
    this.setState(updates as ParamElementState, () => this.handleChange());
  }

  private handleFilterChange(newFilter: ParamFilter): void {
    const updates = validateParam({
      currentParam: this.state.currentParam,
      currentFilter: newFilter,
      data: this.state.data,
    });
    this.setState(updates as ParamElementState, () => this.handleChange());
  }

  private handleDataChange(newData: string | any[] | boolean): void {
    const updates = validateParam({
      currentParam: this.state.currentParam,
      currentFilter: this.state.currentFilter,
      data: { value: newData },
    });
    this.setState(updates as ParamElementState, () => this.handleChange());
  }

  private handleRemoveClicked(): void {
    this.props.onRemove(this.props.initialParam.uuid);
  }

  private getParamProps(): ParamProps {
    return {
      uuid: this.props.initialParam.uuid,
      type: this.state.currentParam.type,
      paramType: this.state.currentParam.paramType,
      verboseName: this.state.currentParam.verboseName,
      required: this.state.currentParam.required,
      filters: this.state.currentParam.filters,
      filter: { value: this.state.currentFilter },
      defaultValue: this.state.currentParam.defaultValue,
      options: this.state.currentParam.options,
      nameKey: this.state.currentParam.nameKey,
      valueKey: this.state.currentParam.valueKey,
      data: this.state.data,
      valid: this.state.valid,
    };
  }

  private handleChange(): void {
    this.props.onChange(this.getParamProps());
  }

  private renderParamElement(
    param: ServiceCallParam,
    disableParam: boolean,
    disableFilter: boolean,
    showFilter: boolean | number,
    paramFilters: ParamFilter[],
    paramOptions: ServiceCallParam[],
  ): JSX.Element {
    if (!param) return null;

    if (param.paramType === ParamTypes.multiSelect) {
      return (
        <div className={styles.choice}>
          <span>{param.verboseName}</span>
          <TembaSelect
            name={param.verboseName}
            placeholder={i18n.t('forms.select_an_option', 'Select an option')}
            style={TembaSelectStyle.small}
            options={param.options}
            nameKey={param.nameKey || 'name'}
            valueKey={param.valueKey || 'value'}
            multi={true}
            tags={false}
            onChange={this.handleDataChange}
            value={this.state.data.value}
          />
        </div>
      );
    } else if (param.paramType === ParamTypes.boolean) {
      return (
        <SwitchElement
          name={param.verboseName}
          title={param.verboseName}
          checked={this.state.data.value}
          onChange={this.handleDataChange}
          size={SwitchSizes.small}
        />
      );
    } else if (param.paramType === ParamTypes.expressionInput) {
      return (
        <div className={styles.expression_input}>
          <span>{param.verboseName}</span>
          <TextInputElement
            name={param.verboseName}
            style={TextInputStyle.normal}
            onChange={this.handleDataChange}
            entry={this.state.data}
            autocomplete={true}
          />
        </div>
      );
    } else {
      const filterError =
        showFilter &&
        paramFilters &&
        paramFilters.length > 0 &&
        !this.state.currentFilter &&
        this.state.data.value
          ? [i18n.t('forms.required', 'Required')]
          : [];

      return (
        <>
          <div
            className={`${styles.choice} ${
              disableFilter ? styles.disabled : ''
            }`}
            style={{ flex: showFilter ? 1 : 2 }}
          >
            <TembaSelect
              name={i18n.t('forms.service_call_param', 'Service Call Param')}
              placeholder={i18n.t('forms.param', 'Param')}
              style={TembaSelectStyle.small}
              options={paramOptions}
              nameKey="verboseName"
              valueKey="type"
              disabled={disableParam || disableFilter}
              onChange={this.handleParamChange}
              value={this.state.currentParam}
            />
          </div>
          {showFilter ? (
            <div
              className={`${styles.choice} ${
                disableFilter ? styles.disabled : ''
              }`}
            >
              <TembaSelect
                name={i18n.t(
                  'forms.service_call_param_filter',
                  'Service Call Param Filter',
                )}
                placeholder={i18n.t('forms.filter', 'Filter')}
                style={TembaSelectStyle.small}
                options={paramFilters}
                nameKey="verboseName"
                valueKey="name"
                onChange={this.handleFilterChange}
                value={this.state.currentFilter}
                disabled={disableFilter}
                errors={filterError}
              />
            </div>
          ) : (
            <></>
          )}
          <div className={styles.data}>
            <TextInputElement
              name={i18n.t(
                'forms.service_call_param_data',
                'Service Call Param Data',
              )}
              onChange={this.handleDataChange}
              entry={this.state.data}
              autocomplete={true}
            />
          </div>
        </>
      );
    }
  }

  public render(): JSX.Element {
    const disableParam =
      this.state.currentParam && this.state.currentParam.required ? true : null;
    const disableFilter =
      this.state.currentFilter && this.state.currentFilter.required
        ? true
        : null;
    const canArrange = !disableParam && !disableFilter;

    const showFilter =
      this.state.currentParam &&
      this.state.currentParam.filters &&
      this.state.currentParam.filters.length;

    const rawParam = this.props.availableParams.find(
      param => param.type === this.state.currentParam.type,
    );
    let paramFilters = rawParam ? rawParam.filters : [];
    paramFilters = this.state.currentFilter
      ? [this.state.currentFilter].concat(paramFilters)
      : paramFilters;
    const paramOptions =
      this.state.currentParam &&
      !this.props.availableParams.find(
        p => p.type === this.state.currentParam.type,
      )
        ? [this.state.currentParam].concat(this.props.availableParams)
        : this.props.availableParams;

    const paramElement = this.renderParamElement(
      this.state.currentParam,
      disableParam,
      disableFilter,
      showFilter,
      paramFilters,
      paramOptions,
    );

    return (
      <FormElement
        data-spec="param-form"
        name={this.props.name}
        __className={styles.group}
        kaseError={this.state.errors.length > 0}
      >
        <div className={`${styles.param}`} data-draggable={canArrange}>
          {this.props.hasArrangeFunctionality && (
            <div className={styles.moveIcon}>
              <DragIcon draggable={true} />
            </div>
          )}

          {paramElement}

          {this.props.hasArrangeFunctionality && (
            <UnnnicIcon
              className={styles.remove_icon}
              data-testid={'remove-param-' + this.props.initialParam.uuid}
              icon="delete-1-1"
              size="sm"
              scheme={
                !disableParam && !disableFilter
                  ? 'neutral-cloudy'
                  : 'neutral-clean'
              }
              onClick={
                !disableParam && !disableFilter
                  ? this.handleRemoveClicked
                  : () => {}
              }
              clickable
            />
          )}
        </div>
      </FormElement>
    );
  }
}
