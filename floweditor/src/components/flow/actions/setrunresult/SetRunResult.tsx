import * as React from 'react';
import { SetRunResult } from 'flowTypes';
import { ellipsize, emphasize } from 'utils';
import i18n from 'config/i18n';

export const getSavePlaceholder = (
  value: string,
  name: string,
): JSX.Element => (
  <div>
    {i18n.t('forms.save')} {emphasize(ellipsize(value, 100))}{' '}
    {i18n.t('forms.as')} {emphasize(name)}
  </div>
);

export const getClearPlaceholder = (name: string) => (
  <div>Clear value for {emphasize(name)}</div>
);

const SetRunResultComp: React.SFC<SetRunResult> = ({
  value,
  name,
}): JSX.Element => {
  if (value) {
    return getSavePlaceholder(value, name);
  }
  return getClearPlaceholder(name);
};

export default SetRunResultComp;
