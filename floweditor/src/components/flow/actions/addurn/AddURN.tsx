import * as React from 'react';
import { AddURN } from 'flowTypes';

import { getSchemeObject } from './helpers';
import i18n from 'config/i18n';
import { emphasize } from 'utils';

export const MAX_TO_SHOW = 5;

const AddURNComp: React.SFC<AddURN> = ({
  scheme,
  path,
}: AddURN): JSX.Element => {
  const schemeObject = getSchemeObject(scheme);
  const schemeName = schemeObject ? schemeObject.path : scheme;
  return (
    <>
      {i18n.t('add', 'Add')} {schemeName && schemeName.toLowerCase()}{' '}
      {emphasize(path)}
    </>
  );
};

export default AddURNComp;
