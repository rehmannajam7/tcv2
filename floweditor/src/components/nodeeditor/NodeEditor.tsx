import { react as bindCallbacks } from 'auto-bind';
import { getDraggedFrom } from 'components/helpers';
import Modal from 'components/modal/Modal';
import { Type } from 'config/interfaces';
import { Action, AnyAction, FlowIssue } from 'flowTypes';
import * as React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { UpdateUserAddingAction } from 'store/actionTypes';
import { Asset, AssetStore, FlowIssueMap, RenderNode } from 'store/flowContext';
import { NodeEditorSettings, updateUserAddingAction } from 'store/nodeEditor';
import AppState from 'store/state';
import {
  AddAsset,
  addAsset,
  DispatchWithState,
  GetState,
  HandleTypeConfigChange,
  handleTypeConfigChange,
  LocalizationUpdates,
  MergeEditorState,
  mergeEditorState,
  NoParamsAC,
  onUpdateAction,
  OnUpdateAction,
  OnUpdateLocalizations,
  onUpdateLocalizations,
  OnUpdateRouter,
  onUpdateRouter,
  resetNodeEditingState,
} from 'store/thunks';
import { LocalizationFormProps } from 'components/flow/props';

export type UpdateLocalizations = (
  language: string,
  changes: LocalizationUpdates,
) => void;

// TODO: Remove use of Function
// tslint:disable:ban-types
export interface NodeEditorPassedProps {
  plumberConnectExit: Function;
  helpArticles: { [key: string]: string };
}

export interface NodeEditorStoreProps {
  assetStore: AssetStore;
  addAsset: AddAsset;
  language: Asset;
  translating: boolean;
  typeConfig: Type;
  settings: NodeEditorSettings;
  nodes: { [uuid: string]: RenderNode };
  handleTypeConfigChange: HandleTypeConfigChange;
  resetNodeEditingState: NoParamsAC;
  issues: FlowIssueMap;
  mergeEditorState: MergeEditorState;
  onUpdateLocalizations: OnUpdateLocalizations;
  onUpdateAction: OnUpdateAction;
  onUpdateRouter: OnUpdateRouter;
  updateUserAddingAction: UpdateUserAddingAction;
}

export type NodeEditorProps = NodeEditorPassedProps & NodeEditorStoreProps;

export interface FormProps {
  // our two ways of updating
  updateRouter(renderNode: RenderNode): void;
  updateAction(action: AnyAction): void;

  addAsset(assetType: string, asset: Asset): void;

  assetStore: AssetStore;
  issues: FlowIssue[];
  helpArticles: { [key: string]: string };

  nodeSettings?: NodeEditorSettings;
  typeConfig?: Type;
  onTypeChange?(config: Type): void;
  onClose?(canceled: boolean): void;
}

/* export interface LocalizationProps {
  nodeSettings?: NodeEditorSettings;
  typeConfig?: Type;
  onClose?(canceled: boolean): void;

  issues: FlowIssue[];
  updateLocalizations: UpdateLocalizations;
  language: Asset;
}*/

export class NodeEditor extends React.Component<NodeEditorProps> {
  constructor(props: NodeEditorProps) {
    super(props);

    bindCallbacks(this, {
      include: [/^close/, /^update/, /^handle/],
    });
  }

  private updateLocalizations(language: string, changes: LocalizationUpdates) {
    this.props.onUpdateLocalizations(language, changes);
  }

  public close(canceled: boolean): void {
    // Make sure we re-wire the old connection
    if (canceled) {
      const dragPoint = getDraggedFrom(this.props.settings.originalNode);
      if (dragPoint) {
        const renderNode = this.props.nodes[dragPoint.nodeUUID];
        for (const exit of renderNode.node.exits) {
          if (exit.uuid === dragPoint.exitUUID) {
            // TODO: should this just be taking literal uuids instead of objects?
            this.props.plumberConnectExit(renderNode.node, exit);
            break;
          }
        }
      }
    }

    this.props.resetNodeEditingState();
    this.props.updateUserAddingAction(false);
  }

  private updateAction(
    action: Action,
    onUpdated?: (dispatch: DispatchWithState, getState: GetState) => void,
  ): void {
    this.props.onUpdateAction(action, onUpdated);
  }

  private updateRouter(renderNode: RenderNode): void {
    this.props.onUpdateRouter(renderNode);
  }

  private handleAddAsset(assetType: string, asset: Asset): void {
    this.props.addAsset(assetType, asset);
  }

  public render(): JSX.Element {
    console.log('🟡 NodeEditor: render called');
    console.log('🟡 NodeEditor: settings:', this.props.settings);
    console.log('🟡 NodeEditor: typeConfig:', this.props.typeConfig);
    console.log('🟡 NodeEditor: translating:', this.props.translating);

    const filteredIssues = (
      this.props.issues[this.props.settings.originalNode.node.uuid] || []
    ).filter(
      (issue: FlowIssue) =>
        !this.props.settings.originalAction ||
        this.props.settings.originalAction.uuid === issue.action_uuid,
    );

    if (this.props.settings) {
      console.log(
        '🟡 NodeEditor: settings exists, proceeding with modal render',
      );
      const { typeConfig } = this.props;

      // see if we should use the localization form
      if (this.props.translating) {
        console.log('🟡 NodeEditor: translating mode');
        const { localization: LocalizationForm } = typeConfig;

        if (LocalizationForm) {
          console.log('🟡 NodeEditor: rendering localization modal');
          const localizationProps: LocalizationFormProps = {
            updateLocalizations: this.updateLocalizations,
            nodeSettings: this.props.settings,
            onClose: this.close,
            language: this.props.language,
            helpArticles: this.props.helpArticles,
            issues: filteredIssues.filter(
              (issue: FlowIssue) => issue.language === this.props.language.id,
            ),
          };

          return (
            <Modal width="fit-content" show={true}>
              <LocalizationForm {...{ ...localizationProps }} />
            </Modal>
          );
        }
      }

      const { form: Form } = typeConfig;
      console.log('🟡 NodeEditor: Form component:', Form);

      const formProps: FormProps = {
        assetStore: this.props.assetStore,
        addAsset: this.handleAddAsset,
        updateAction: this.updateAction,
        updateRouter: this.updateRouter,
        nodeSettings: this.props.settings,
        helpArticles: this.props.helpArticles,
        issues: filteredIssues.filter((issue: FlowIssue) => !issue.language),
        typeConfig: this.props.typeConfig,
        onTypeChange: this.props.handleTypeConfigChange,
        onClose: this.close,
      };

      console.log('🟡 NodeEditor: rendering main modal with Form');
      return (
        <Modal width="fit-content" show={true}>
          <Form {...{ ...formProps }} />
        </Modal>
      );
    }

    console.log('🟡 NodeEditor: no settings, returning null');
    return null;
  }
}

/* istanbul ignore next -- @preserve */
const mapStateToProps = ({
  flowContext: { nodes, assetStore, issues },
  editorState: { language, translating },
  nodeEditor: { typeConfig, settings },
}: AppState) => {
  return {
    issues,
    language,
    nodes,
    translating,
    typeConfig,
    settings,
    assetStore,
  };
};

/* istanbul ignore next -- @preserve */
const mapDispatchToProps = (dispatch: DispatchWithState) =>
  bindActionCreators(
    {
      addAsset,
      resetNodeEditingState,
      mergeEditorState,
      handleTypeConfigChange,
      onUpdateLocalizations,
      onUpdateAction,
      onUpdateRouter,
      updateUserAddingAction,
    },
    dispatch,
  );

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(NodeEditor);
