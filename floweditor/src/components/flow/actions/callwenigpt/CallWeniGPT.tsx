import * as React from 'react';
import { CallWeniGPT } from 'flowTypes';
import { emphasize } from 'utils';
import i18n from 'config/i18n';

export const getSavePlaceholder = (name: string): JSX.Element => (
  <div>
    {i18n.t('forms.save')} {i18n.t('forms.as')} {emphasize(name)}
  </div>
);

const CallWeniGPTComp: React.SFC<CallWeniGPT> = ({
  result_name,
}): JSX.Element => {
  return getSavePlaceholder(result_name);
};

export default CallWeniGPTComp;
