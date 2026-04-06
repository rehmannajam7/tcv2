import { react as bindCallbacks } from 'auto-bind';
import Dialog, { ButtonSet } from 'components/dialog/Dialog';
import { ActionFormProps } from 'components/flow/props';
import AssetSelector from 'components/form/assetselector/AssetSelector';
import TypeList from 'components/nodeeditor/TypeList';
import { ChangeGroups } from 'flowTypes';
import * as React from 'react';
import { Asset } from 'store/flowContext';
import { mergeForm } from 'store/nodeEditor';
import { shouldRequireIf, validate } from 'store/validators';

import styles from './AddGroupsForm.module.scss';
import { ChangeGroupsFormState, excludeDynamicGroups } from '../helpers';
import { initializeForm, stateToAction } from './helpers';
import i18n from 'config/i18n';
import { renderIssues } from '../../helpers';

export default class AddGroupsForm extends React.Component<
  ActionFormProps,
  ChangeGroupsFormState
> {
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

  public handleGroupsChanged(groups: any[], submitting = false): boolean {
    const updates: Partial<ChangeGroupsFormState> = {
      groups: validate(i18n.t('forms.groups', 'Groups'), groups, [
        shouldRequireIf(submitting),
      ]),
    };

    const updated = mergeForm(this.state, updates);
    this.setState(updated);
    return updated.valid;
  }

  public handleGroupAdded(group: Asset): void {
    // update our store with our new group
    this.props.addAsset('groups', group);

    // try to add the group
    this.handleGroupsChanged(
      (this.state.groups.value || []).concat(group),
      false,
    );
  }

  public handleCreateAssetFromInput(input: string): any {
    return { name: input };
  }

  public getButtons(): ButtonSet {
    return {
      primary: { name: i18n.t('buttons.confirm'), onClick: this.handleSave },
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

        <AssetSelector
          name={i18n.t(
            'forms.add_groups_summary',
            'Select the groups to add the contact to',
          )}
          showLabel={true}
          multi={true}
          noOptionsMessage={i18n.t(
            'enter_to_create_group',
            'Enter a name to create a new group',
          )}
          assets={this.props.assetStore.groups}
          entry={this.state.groups}
          onChange={this.handleGroupsChanged}
          searchable={true}
          shouldExclude={excludeDynamicGroups}
          placeholder={i18n.t('forms.select_groups', 'Select Groups')}
          expressions={true}
          // Groups can be created on the fly
          createPrefix={i18n.t('forms.create_group', 'Create Group') + ': '}
          createAssetFromInput={this.handleCreateAssetFromInput}
          onAssetCreated={this.handleGroupAdded}
        />

        {renderIssues(this.props)}
      </Dialog>
    );
  }
}
