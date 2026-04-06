import { renderAssetList } from 'components/flow/actions/helpers';
import { fakePropType } from 'config/ConfigProvider';
import i18n from 'config/i18n';
import { Types } from 'config/interfaces';
import { ChangeGroups, Endpoints } from 'flowTypes';
import * as React from 'react';
import { AssetType } from 'store/flowContext';

import styles from './ChangeGroups.module.scss';

export const removeAllSpecId = 'remove_from_all';
export const contentSpecId = 'content';
export const removeAllText = i18n.t('forms.remove_from_all_groups');

export const MAX_TO_SHOW = 5;
export const getRemoveAllMarkup = (
  key = removeAllSpecId,
  specId = removeAllSpecId,
  text = removeAllText,
) => (
  <div key={key} data-spec={specId}>
    {text}
  </div>
);

export const getContentMarkup = (
  { type, groups }: ChangeGroups,
  endpoints?: Endpoints,
): JSX.Element[] => {
  const content = [];

  if (type === Types.remove_contact_groups && (!groups || !groups.length)) {
    content.push(getRemoveAllMarkup());
  } else {
    return renderAssetList(
      groups.map(group => {
        if (group.name_match) {
          return {
            id: group.name_match,
            name: group.name_match,
            type: AssetType.NameMatch,
          };
        }
        return {
          id: group.uuid,
          name: group.name,
          type: AssetType.Group,
        };
      }),
      MAX_TO_SHOW,
      endpoints!,
    );
  }

  return content;
};

export const getChangeGroupsMarkup = (
  action: ChangeGroups,
  endpoints?: Endpoints,
  specId = contentSpecId,
) => (
  <div data-spec={specId} className={styles.groups_container}>
    {getContentMarkup(action, endpoints)}
  </div>
);

const ChangeGroupsComp: React.SFC<ChangeGroups> = (
  props: any,
  context: any,
): JSX.Element => {
  return getChangeGroupsMarkup(props, context.config.endpoints);
};

ChangeGroupsComp.contextTypes = {
  config: fakePropType,
};

export default ChangeGroupsComp;
