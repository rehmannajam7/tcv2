import { react as bindCallbacks } from 'auto-bind';
import Dialog, { ButtonSet } from 'components/dialog/Dialog';
import {
  ChangeGroupsFormState,
  excludeDynamicGroups,
} from 'components/flow/actions/changegroups/helpers';
import { ActionFormProps } from 'components/flow/props';
import AssetSelector from 'components/form/assetselector/AssetSelector';
import TypeList from 'components/nodeeditor/TypeList';
import { fakePropType } from 'config/ConfigProvider';
import { ChangeGroups } from 'flowTypes';
import * as React from 'react';
import { Asset } from 'store/flowContext';
import { mergeForm } from 'store/nodeEditor';
import { shouldRequireIf, validate } from 'store/validators';
import { renderIf } from 'utils';

import { initializeForm, stateToAction } from './helpers';
import styles from './RemoveGroupsForm.module.scss';
import i18n from 'config/i18n';
import { renderIssues } from '../../helpers';

// @ts-ignore
import Unnnic from '@weni/unnnic-system';
import { applyVueInReact } from 'veaury';

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

export const LABEL = i18n.t(
  'forms.remove_groups_summary',
  'Select the groups to remove the contact from.',
);
export const NOT_FOUND = i18n.t(
  'errors.group_not_found',
  'Enter the name of an existing group',
);
export const PLACEHOLDER = i18n.t(
  'forms.remove_groups_placeholder',
  'Enter the name of an existing group',
);
export const REMOVE_FROM_ALL = i18n.t(
  'forms.remove_from_all_label',
  'Remove from all',
);
export const REMOVE_FROM_ALL_DESC = i18n.t(
  'forms.remove_from_all_summary',
  "Remove the active contact from all groups they're a member of.",
);

export const labelSpecId = 'label';
export const fieldContainerSpecId = 'field-container';

export default class RemoveGroupsForm extends React.Component<
  ActionFormProps,
  ChangeGroupsFormState
> {
  public static contextTypes = {
    assetService: fakePropType,
  };

  constructor(props: ActionFormProps) {
    super(props);
    this.state = initializeForm(
      this.props.nodeSettings,
    ) as ChangeGroupsFormState;
    bindCallbacks(this, {
      include: [/^on/, /^handle/],
    });
  }

  public handleSave(): void {
    const valid = this.handleGroupsChanged(this.state.groups.value!, true);
    if (valid) {
      const newAction = stateToAction(this.props.nodeSettings, this.state);
      this.props.updateAction(newAction as ChangeGroups);
      this.props.onClose(false);
    }
  }

  private handleUpdate(
    keys: { groups?: Asset[]; removeAll?: boolean },
    submitting = false,
  ): boolean {
    const updates: Partial<ChangeGroupsFormState> = {};

    // we only require groups if removeAll isn't checked
    let groupValidators = this.state.removeAll
      ? []
      : [shouldRequireIf(submitting)];

    if (keys.hasOwnProperty('removeAll')) {
      updates.removeAll = keys.removeAll;
      if (keys.removeAll) {
        groupValidators = [];
      }
    }

    if (keys.hasOwnProperty('groups')) {
      updates.groups = validate(
        i18n.t('forms.groups', 'Groups'),
        keys.groups!,
        groupValidators,
      );
    }

    const updated = mergeForm(this.state, updates);
    this.setState(updated);
    return updated.valid;
  }

  public handleGroupsChanged(groups: Asset[], submitting = false): boolean {
    return this.handleUpdate({ groups }, submitting);
  }

  public handleRemoveAllUpdate(removeAll: string): boolean {
    return this.handleUpdate({ removeAll: removeAll === 'true' });
  }

  private getButtons(): ButtonSet {
    return {
      primary: { name: i18n.t('buttons.ok', 'Ok'), onClick: this.handleSave },
      secondary: {
        name: i18n.t('buttons.cancel', 'Cancel'),
        onClick: () => this.props.onClose(true),
      },
    };
  }

  public render(): JSX.Element {
    const typeConfig = this.props.typeConfig;
    return (
      <Dialog
        className={styles.dialog}
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
        <div
          className={`${styles.form_element} u font secondary body-md color-neutral-cloudy`}
        >
          {i18n.t(
            'forms.remove_groups_type_label',
            'Groups that the contact will be removed:',
          )}
          <UnnnicRadio
            v-model={[String(this.state.removeAll), this.handleRemoveAllUpdate]}
            value="false"
            size="sm"
          >
            <span className="color-neutral-cloudy">
              {i18n.t(
                'forms.remove_groups_type_values_selected_label',
                'Selected',
              )}
            </span>
          </UnnnicRadio>
          <UnnnicRadio
            v-model={[String(this.state.removeAll), this.handleRemoveAllUpdate]}
            value="true"
            size="sm"
          >
            <span className="color-neutral-cloudy">
              {i18n.t('forms.remove_groups_type_values_all_label', 'All')}
            </span>
          </UnnnicRadio>
        </div>
        {renderIf(!this.state.removeAll)(
          <div className={styles.form_element}>
            <AssetSelector
              name={i18n.t('forms.groups', 'Groups')}
              placeholder={i18n.t('forms.select_groups', 'Select Groups')}
              assets={this.props.assetStore.groups}
              entry={this.state.groups}
              shouldExclude={excludeDynamicGroups}
              searchable={true}
              onChange={this.handleGroupsChanged}
              multi={true}
            />
          </div>,
        )}
        {renderIssues(this.props)}
      </Dialog>
    );
  }
}
