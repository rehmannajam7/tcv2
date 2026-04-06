import { ServiceCallParam, ParamFilter } from 'config/interfaces';

import {
  ParamElementProps,
  ParamElementState,
  ParamTypes,
} from './ParamElement';
import { FormEntry, ValidationFailure } from 'store/nodeEditor';
import { Required, validate } from 'store/validators';
import i18n from 'config/i18n';

export const initializeForm = (props: ParamElementProps): ParamElementState => {
  const currentParam = props.initialParam.type
    ? props.initialParam
    : props.availableParams[0];

  let initialData;
  let dataValidationFailures: ValidationFailure[] = [];
  if (
    props.initialParam.data.value === undefined ||
    props.initialParam.data.value === null ||
    props.initialParam.data.value === ''
  ) {
    initialData = props.initialParam.defaultValue || '';
  } else {
    initialData = props.initialParam.data.value;
    dataValidationFailures = props.initialParam.data.validationFailures;
  }
  const initialFilter = props.initialParam.filter
    ? props.initialParam.filter.value
    : null;

  return {
    errors: [],
    currentParam,
    currentFilter: initialFilter,
    data: { value: initialData, validationFailures: dataValidationFailures },
    valid: true,
  };
};

export const validateParam = (keys: {
  currentParam: ServiceCallParam;
  currentFilter: ParamFilter;
  data: FormEntry;
}) => {
  const updates: Partial<ParamElementState> = {};
  const validators =
    (keys.currentParam &&
      keys.currentParam.required &&
      ![ParamTypes.multiSelect, ParamTypes.boolean].includes(
        keys.currentParam.paramType,
      )) ||
    (keys.currentFilter && keys.currentFilter.required)
      ? [Required]
      : [];

  updates.currentParam = keys.currentParam;
  updates.currentFilter = keys.currentFilter;

  updates.data = validate(
    i18n.t('forms.parameter', 'Parameter'),
    keys.data.value,
    validators,
  );

  updates.valid = updates.data.validationFailures.length === 0;

  return updates;
};
