import * as React from 'react';
import OptionalTextInput from 'components/form/optionaltext/OptionalTextInput';
import { StringEntry } from 'store/nodeEditor';
import i18n from 'config/i18n';

export const createResultNameInput = (
  value: StringEntry,
  onChange: (value: string) => void,
): JSX.Element => {
  return (
    <OptionalTextInput
      name={i18n.t('forms.save_result_name')}
      maxLength={64}
      value={value}
      onChange={onChange}
      toggleText={i18n.t('forms.save_as_title', 'Save as')}
    />
  );
};
