import { react as bindCallbacks } from 'auto-bind';
import { CaseProps } from 'components/flow/routers/caselist/CaseList';
import { isRelativeDate } from 'components/flow/routers/helpers';
import FormElement from 'components/form/FormElement';
import TextInputElement, {
  TextInputStyle,
} from 'components/form/textinput/TextInputElement';
import { fakePropType } from 'config/ConfigProvider';
import { filterOperators } from 'config/helpers';
import { Operator, Operators } from 'config/interfaces';
import { operatorConfigList } from 'config/operatorConfigs';
import { Case } from 'flowTypes';
import * as React from 'react';
import { FormState, StringEntry, SelectOptionEntry } from 'store/nodeEditor';
import { hasErrorType } from 'utils';

import styles from './CaseElement.module.scss';
import { initializeForm, validateCase } from './helpers';
import SelectElement, {
  SelectOption,
} from 'components/form/select/SelectElement';
import i18n from 'config/i18n';
import TembaSelect, { TembaSelectStyle } from 'temba/TembaSelect';
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
  },
});

const noArgumentList = [
  'has_text',
  'has_number',
  'has_date',
  'has_time',
  'has_phone',
  'has_email',
];

const SMART_CATEGORY_REGEX = /[^\p{Letter}\p{Number}~'^`´.,()\- ]+/gu;
const SMART_ARGUMENT_REGEX = /[^\p{Letter}\p{Number}~'^@`´.,()\- ]+/gu;

export enum CaseElementType {
  smart = 'smart',
  default = 'default',
}

export interface CaseElementProps {
  kase: Case;
  categoryName: string;
  name?: string; // satisfy form widget props
  onRemove?(uuid: string): void;
  onChange?(c: CaseProps): void;
  operators?: Operator[];
  classifier?: any;
  type: CaseElementType;
  required?: boolean;
}

export interface CaseElementState extends FormState {
  errors: string[];
  operatorConfig: Operator;
  categoryName: StringEntry;
  categoryNameEdited: boolean;

  // for string based args
  argument: StringEntry;

  // for numeric operators
  min: StringEntry;
  max: StringEntry;

  // intents
  intent: SelectOptionEntry;
  confidence: StringEntry;

  state: StringEntry;
  district: StringEntry;
}

export default class CaseElement extends React.Component<
  CaseElementProps,
  CaseElementState
> {
  private operators: Operator[];

  constructor(props: CaseElementProps) {
    super(props);

    bindCallbacks(this, {
      include: [/^handle/, /^get/],
    });

    this.state = initializeForm(props);
  }

  public static contextTypes = {
    config: fakePropType,
  };

  public componentDidMount() {
    const updates = validateCase({
      operatorConfig: this.state.operatorConfig,
      argument: this.state.argument.value,
      min: this.state.min.value,
      max: this.state.max.value,
      intent: this.state.intent.value,
      confidence: this.state.confidence.value,
      exitName: this.state.categoryName.value,
      exitEdited: this.state.categoryNameEdited,
      classifier: this.props.classifier,
      required: this.props.required,
    });

    this.setState(updates as CaseElementState, this.handleChange);
  }

  public componentDidUpdate(previousProps: CaseElementProps): void {
    if (
      this.props.classifier &&
      this.props.classifier !== previousProps.classifier &&
      this.state.intent.value
    ) {
      const updates = validateCase({
        operatorConfig: this.state.operatorConfig,
        argument: this.state.argument.value,
        min: this.state.min.value,
        max: this.state.max.value,
        intent: this.state.intent.value,
        confidence: this.state.confidence.value,
        exitName: this.state.categoryName.value,
        exitEdited: this.state.categoryNameEdited,
        classifier: this.props.classifier,
      });

      this.setState(updates as CaseElementState, this.handleChange);
    }
  }

  private getOperators(): Operator[] {
    const operators = this.props.operators || operatorConfigList;
    if (this.operators === undefined) {
      this.operators = filterOperators(operators, this.context.config);
    }

    return this.operators;
  }

  private getArgumentArray(): string[] {
    if (this.state.operatorConfig.operands === 0) {
      return [];
    }

    if (
      this.state.operatorConfig.type === Operators.has_intent ||
      this.state.operatorConfig.type === Operators.has_top_intent
    ) {
      if (this.state.intent.value) {
        return [this.state.intent.value.value, this.state.confidence.value];
      } else {
        return ['', this.state.confidence.value];
      }
    }

    if (this.state.operatorConfig.type === Operators.has_number_between) {
      return [this.state.min.value, this.state.max.value];
    }

    if (this.state.operatorConfig.type === Operators.has_ward) {
      return [this.state.state.value, this.state.district.value];
    }

    return [this.state.argument.value];
  }

  private handleOperatorChanged(operatorConfig: Operator): void {
    const updates = validateCase({
      operatorConfig,
      argument: this.state.argument.value,
      min: this.state.min.value,
      max: this.state.max.value,
      intent: this.state.intent.value,
      confidence: this.state.confidence.value,
      exitName: this.state.categoryName.value,
      exitEdited: this.state.categoryNameEdited,
      classifier: this.props.classifier,
      required: this.props.required,
    });

    this.setState(updates as CaseElementState, () => this.handleChange());
  }

  private handleArgumentChanged(value: string): void {
    if (this.props.type === CaseElementType.smart) {
      value = value.replace(SMART_ARGUMENT_REGEX, '');
    }

    const updates = validateCase({
      operatorConfig: this.state.operatorConfig,
      argument: value,
      exitName: this.state.categoryName.value,
      exitEdited: this.state.categoryNameEdited,
      required: this.props.required,
    });

    this.setState(updates as CaseElementState, () => this.handleChange());
  }

  private handleDistrictChanged(value: string): void {
    const updates = validateCase({
      operatorConfig: this.state.operatorConfig,
      argument: this.state.argument.value,
      state: this.state.state.value,
      district: value,
      exitName: this.state.categoryName.value,
      exitEdited: this.state.categoryNameEdited,
      required: this.props.required,
    });

    this.setState(updates as CaseElementState, () => this.handleChange());
  }

  /** The user changed the value for the state (a location-based state) */
  private handleStateChanged(value: string): void {
    const updates = validateCase({
      operatorConfig: this.state.operatorConfig,
      argument: this.state.argument.value,
      district: this.state.district.value,
      state: value,
      exitName: this.state.categoryName.value,
      exitEdited: this.state.categoryNameEdited,
      required: this.props.required,
    });

    this.setState(updates as CaseElementState, () => this.handleChange());
  }

  private handleIntentChanged(selected: SelectOption): void {
    const updates = validateCase({
      operatorConfig: this.state.operatorConfig,
      intent: selected,
      confidence: this.state.confidence.value || '.9',
      exitName: this.state.categoryName.value,
      exitEdited: this.state.categoryNameEdited,
      classifier: this.props.classifier,
      required: this.props.required,
    });

    this.setState(updates as CaseElementState, () => this.handleChange());
  }

  private handleConfidenceChanged(value: string): void {
    const updates = validateCase({
      operatorConfig: this.state.operatorConfig,
      intent: this.state.intent.value,
      confidence: value,
      exitName: this.state.categoryName.value,
      exitEdited: this.state.categoryNameEdited,
      classifier: this.props.classifier,
      required: this.props.required,
    });

    this.setState(updates as CaseElementState, () => this.handleChange());
  }

  private handleMinChanged(value: string): void {
    const updates = validateCase({
      operatorConfig: this.state.operatorConfig,
      min: value,
      max: this.state.max.value,
      exitName: this.state.categoryName.value,
      exitEdited: this.state.categoryNameEdited,
      required: this.props.required,
    });

    this.setState(updates as CaseElementState, () => this.handleChange());
  }

  private handleMaxChanged(value: string): void {
    const updates = validateCase({
      operatorConfig: this.state.operatorConfig,
      min: this.state.min.value,
      max: value,
      exitName: this.state.categoryName.value,
      exitEdited: this.state.categoryNameEdited,
      required: this.props.required,
    });

    this.setState(updates as CaseElementState, () => this.handleChange());
  }

  private handleExitChanged(value: string): void {
    if (this.props.type === CaseElementType.smart) {
      value = value.replace(SMART_CATEGORY_REGEX, '');
    }

    const updates = validateCase({
      operatorConfig: this.state.operatorConfig,
      state: this.state.state.value,
      district: this.state.district.value,
      argument: this.state.argument.value,
      min: this.state.min.value,
      max: this.state.max.value,
      intent: this.state.intent.value,
      confidence: this.state.confidence.value,
      classifier: this.props.classifier,
      exitName: value,
      exitEdited: true,
      required: this.props.required,
    });

    this.setState(updates as CaseElementState, () => this.handleChange());
  }

  private handleRemoveClicked(): void {
    this.props.onRemove(this.props.kase.uuid);
  }

  private getCaseProps(): CaseProps {
    const props = {
      uuid: this.props.kase.uuid,
      categoryName: this.state.categoryName.value,
      kase: {
        arguments: this.getArgumentArray(),
        type: this.state.operatorConfig.type,
        uuid: this.props.kase.uuid,

        // if the exit name changed, we'll need to recompute our exit
        category_uuid: this.state.categoryNameEdited
          ? null
          : this.props.kase.category_uuid,
      },
      valid: this.state.valid,
    };

    return props;
  }

  private handleChange(): void {
    // If the case doesn't have arguments & an exit name, remove it
    if (!this.state.categoryName.value) {
      // see if we are clearing out a between
      if (this.state.operatorConfig.type === Operators.has_number_between) {
        if (!this.state.min.value && !this.state.max.value) {
          // this.handleRemoveClicked();
          // return;
        }
      }
      // see if we are clearing out a single operand
      else {
        if (!this.state.argument.value) {
          // this.handleRemoveClicked();
          // return;
        }
      }
    }

    this.props.onChange(this.getCaseProps());
  }

  private handleIntentMenuOpened() {
    // hiding any errors when the menu opens
    this.setState({ intent: { value: this.state.intent.value } });
  }

  private handleIntentMenuClosed() {
    // we want to revalidate close without selection
    // wait a cycle for selection event to fire first
    window.setTimeout(() => {
      this.handleIntentChanged(this.state.intent.value);
    }, 0);
  }

  private renderArguments(): JSX.Element {
    if (this.state.operatorConfig.operands > 0) {
      // First pass at displaying, handling Operators.has_number_between inputs
      if (this.state.operatorConfig.operands > 1) {
        if (this.state.operatorConfig.type === Operators.has_number_between) {
          return (
            <>
              <TextInputElement
                name={i18n.t('forms.arguments', 'arguments')}
                style={TextInputStyle.small}
                onChange={this.handleMinChanged}
                entry={this.state.min}
                autocomplete={true}
                placeholder="0"
              />
              <span
                className={`${styles.divider} u font secondary body-md color-neutral-cloudy`}
                data-draggable={true}
              >
                {i18n.t('forms.and', 'and')}
              </span>
              <TextInputElement
                name={i18n.t('forms.arguments', 'arguments')}
                style={TextInputStyle.small}
                onChange={this.handleMaxChanged}
                entry={this.state.max}
                autocomplete={true}
                placeholder="100"
              />
            </>
          );
        } else if (
          this.state.operatorConfig.type === Operators.has_intent ||
          this.state.operatorConfig.type === Operators.has_top_intent
        ) {
          let intents: SelectOption[] = [];

          if (this.props.classifier && this.props.classifier.intents) {
            intents = this.props.classifier.intents.map((intent: string) => {
              const option: SelectOption = {
                name: intent,
                value: intent,
              };
              return option;
            });
          }

          return (
            <>
              <div style={{ width: '125px' }}>
                <SelectElement
                  key="intent_select"
                  style={TembaSelectStyle.small}
                  name={i18n.t('forms.intent', 'Intent')}
                  placeholder={i18n.t('forms.select_intent', 'Select intent')}
                  entry={this.state.intent}
                  onChange={this.handleIntentChanged}
                  options={intents}
                  onMenuOpen={this.handleIntentMenuOpened}
                  onMenuClose={this.handleIntentMenuClosed}
                  hideError={true}
                ></SelectElement>
              </div>
              <div
                className={`${styles.divider} u font secondary body-md color-neutral-cloudy`}
                data-draggable={true}
              >
                {i18n.t('forms.above')}
              </div>
              <div style={{ width: '55px' }}>
                <TextInputElement
                  name={i18n.t('forms.confidence', 'confidence')}
                  onChange={this.handleConfidenceChanged}
                  entry={this.state.confidence}
                  style={TextInputStyle.small}
                  placeholder=".9"
                />
              </div>
            </>
          );
        } else {
          return (
            <>
              <TextInputElement
                name={i18n.t('forms.state', 'State')}
                placeholder={i18n.t('forms.state', 'State')}
                onChange={this.handleStateChanged}
                style={TextInputStyle.small}
                entry={this.state.state}
              />
              <span
                className={`${styles.divider} u font secondary body-md color-neutral-cloudy`}
                data-draggable={true}
              >
                {i18n.t('forms.and', 'and')}
              </span>
              <TextInputElement
                name={i18n.t('forms.district', 'District')}
                placeholder={i18n.t('forms.district', 'District')}
                onChange={this.handleDistrictChanged}
                style={TextInputStyle.small}
                entry={this.state.district}
              />
            </>
          );
        }
      } else if (isRelativeDate(this.state.operatorConfig.type)) {
        return (
          <>
            <span className={styles.divider} data-draggable={true}>
              today +{' '}
            </span>
            <TextInputElement
              __className={styles.relative_date}
              name={i18n.t('forms.arguments', 'arguments')}
              onChange={this.handleArgumentChanged}
              entry={this.state.argument}
              style={TextInputStyle.small}
              autocomplete={false}
            />
            <span
              className={`${styles.divider} u font secondary body-md color-neutral-cloudy`}
            >
              {i18n.t('forms.days')}
            </span>
          </>
        );
      } else {
        let placeholder =
          this.state.operatorConfig.type === Operators.has_district
            ? i18n.t('forms.state')
            : i18n.t('forms.ex_cart', 'Ex: cart');

        if (this.props.type === CaseElementType.smart) {
          placeholder = i18n.t(
            'forms.ex_smart_argument',
            'Ex: when the user greets you',
          );
        }

        return (
          <TextInputElement
            data-test-id="case-arguments"
            name={i18n.t('forms.arguments', 'arguments')}
            onChange={this.handleArgumentChanged}
            entry={this.state.argument}
            style={TextInputStyle.small}
            placeholder={placeholder}
            autocomplete={true}
          />
        );
      }
    }

    return null;
  }

  public render(): JSX.Element {
    let argumentClass = styles.no_argument;
    if (this.state.operatorConfig.operands > 1) {
      argumentClass = styles.multi_operand;
    } else if (!noArgumentList.includes(this.state.operatorConfig.type)) {
      argumentClass = styles.single_operand;
    }

    const isSmart = this.props.type === CaseElementType.smart;

    return (
      <FormElement
        data-spec="case-form"
        name={this.props.name}
        __className={styles.group}
        kaseError={this.state.errors.length > 0}
      >
        <div
          className={`${styles.kase} ${styles[this.state.operatorConfig.type]}`}
          data-draggable={true}
        >
          <span className={styles.move_icon} data-draggable={true}>
            <DragIcon draggable={true} />
          </span>

          {!isSmart && (
            <div className={styles.choice}>
              <TembaSelect
                name={i18n.t('forms.operator', 'operator')}
                style={TembaSelectStyle.small}
                options={this.getOperators()}
                nameKey="verboseName"
                valueKey="type"
                onChange={this.handleOperatorChanged}
                value={this.state.operatorConfig}
              ></TembaSelect>
            </div>
          )}
          <div className={argumentClass}>{this.renderArguments()}</div>

          {!isSmart && (
            <div
              className={`${styles.categorize_as} u font secondary body-md color-neutral-cloudy`}
              data-draggable={true}
            >
              {i18n.t('forms.categorize_as')}
            </div>
          )}
          <div className={isSmart ? styles.expanded_category : styles.category}>
            <TextInputElement
              name={i18n.t('forms.exit_name', 'Exit Name')}
              style={TextInputStyle.small}
              onChange={this.handleExitChanged}
              entry={this.state.categoryName}
              maxLength={this.props.type === CaseElementType.smart ? 50 : 36}
              showInvalid={hasErrorType(this.state.errors, [/category/])}
              placeholder={
                this.props.type === CaseElementType.smart
                  ? i18n.t('forms.ex_smart_category', 'Ex: Greeting')
                  : i18n.t('forms.ex_shop', 'Ex: shopping')
              }
            />
          </div>

          <span className={styles.remove_icon_wrapper} data-draggable={true}>
            <UnnnicIcon
              className={styles.remove_icon}
              data-testid={'remove-case-' + this.props.kase.uuid}
              icon="delete-1-1"
              size="sm"
              scheme="neutral-cloudy"
              onClick={this.handleRemoveClicked}
              clickable
            />
          </span>
        </div>
      </FormElement>
    );
  }
}
