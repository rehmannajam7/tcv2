import { react as bindCallbacks } from 'auto-bind';
import Button, { ButtonTypes } from 'components/button/Button';
import Dialog from 'components/dialog/Dialog';
import ErrorBoundary from './ErrorBoundary';
import { Fixy } from 'components/fixy/Fixy';
import ConnectedFlow from 'components/flow/Flow';
// @ts-ignore
import styles from './index.module.scss';

import ConnectedLanguageSelector from 'components/languageselector/LanguageSelector';
import Loading from 'components/loading/Loading';
import Modal from 'components/modal/Modal';
import RevisionExplorer from 'components/revisions/RevisionExplorer';
import { IssuesTab, IssueDetail } from 'components/issues/IssuesTab';
import ConfigProvider from 'config';
import { fakePropType } from 'config/ConfigProvider';
import { FlowDefinition, FlowEditorConfig, AnyAction } from 'flowTypes';
import * as React from 'react';
import { connect, Provider as ReduxProvider } from 'react-redux';
import { bindActionCreators } from 'redux';
import createStore from 'store/createStore';
import { ModalMessage } from 'store/editor';
import {
  Asset,
  Assets,
  RenderNodeMap,
  FlowIssueMap,
  BrainInfo,
} from 'store/flowContext';
import { getCurrentDefinition } from 'store/helpers';
import AppState from 'store/state';
import {
  CreateNewRevision,
  createNewRevision,
  DispatchWithState,
  FetchFlow,
  fetchFlow,
  LoadFlowDefinition,
  loadFlowDefinition,
  MergeEditorState,
  mergeEditorState,
  onOpenNodeEditor,
  OnOpenNodeEditor,
  handleLanguageChange,
  HandleLanguageChange,
  UpdateTranslationFilters,
  updateTranslationFilters,
} from 'store/thunks';
import { ACTIVITY_INTERVAL, downloadJSON, renderIf, onNextRender } from 'utils';
import { PopTabType } from 'config/interfaces';
import { TranslatorTab, TranslationBundle } from './translator/TranslatorTab';
import i18n from 'config/i18n';

// @ts-ignore
import PageVisibility from 'react-page-visibility';

export interface FlowEditorContainerProps {
  config: FlowEditorConfig;
}

export interface FlowEditorStoreProps {
  baseLanguage: Asset;
  language: Asset;
  languages: Assets;
  translating: boolean;
  fetchingFlow: boolean;
  definition: FlowDefinition;
  issues: FlowIssueMap;
  fetchFlow: FetchFlow;
  loadFlowDefinition: LoadFlowDefinition;
  createNewRevision: CreateNewRevision;
  mergeEditorState: MergeEditorState;
  onOpenNodeEditor: OnOpenNodeEditor;
  handleLanguageChange: HandleLanguageChange;
  nodes: RenderNodeMap;
  modalMessage: ModalMessage;
  saving: boolean;
  scrollToNode: string;
  scrollToAction: string;
  popped: string;
  updateTranslationFilters: UpdateTranslationFilters;
  brainInfo: BrainInfo;
}

const hotStore = createStore();

// Extend Window interface to include flowEditorStore
declare global {
  interface Window {
    flowEditorStore: any;
  }
}

// Make the store globally accessible for message handlers
if (typeof window !== 'undefined') {
  window.flowEditorStore = hotStore;
}

export const getLabel = (): JSX.Element => {
  return <div>testing</div>;
};

// Account Context Validation Component
const AccountContextValidator: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [accountError, setAccountError] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    // Check both 'accountId' (from Chatwoot) and 'account_id' (fallback)
    const accountId = urlParams.get('accountId') || urlParams.get('account_id');

    console.log(
      'FlowEditor URL params:',
      Object.fromEntries(urlParams.entries()),
    );
    console.log('Account ID from URL:', accountId);

    // Check if accountId is present
    if (!accountId) {
      console.warn(
        'No accountId found in URL parameters. Direct access detected.',
      );
      setAccountError(
        'No account context found. Please access the Flow Editor through Chatwoot.',
      );
      return;
    }

    // Validate accountId format (should be a number or valid string)
    if (
      accountId.trim() === '' ||
      accountId === 'null' ||
      accountId === 'undefined'
    ) {
      console.warn('Invalid accountId in URL parameters:', accountId);
      setAccountError(
        'Invalid account context. Please access the Flow Editor through Chatwoot.',
      );
      return;
    }

    console.log('Account context validation passed for accountId:', accountId);
    setAccountError(null);
  }, []);

  // Show error state if no valid account context
  if (accountError) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          padding: '20px',
          textAlign: 'center',
          backgroundColor: '#f8f9fa',
          color: '#495057',
        }}
      >
        <div
          style={{
            backgroundColor: '#fff3cd',
            border: '1px solid #ffeaa7',
            borderRadius: '8px',
            padding: '20px',
            maxWidth: '500px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          <h2 style={{ color: '#856404', marginBottom: '16px' }}>
            Access Restricted
          </h2>
          <p style={{ marginBottom: '16px', lineHeight: '1.5' }}>
            {accountError}
          </p>
          <p style={{ fontSize: '14px', color: '#6c757d' }}>
            The Flow Editor requires proper account context to function
            correctly.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// Root container, wires up context-providers
export const FlowEditorContainer: React.SFC<FlowEditorContainerProps> = ({
  config,
}: FlowEditorContainerProps) => {
  return (
    <ErrorBoundary>
      <AccountContextValidator>
        <ConfigProvider config={{ ...config }}>
          <ReduxProvider store={hotStore as any}>
            <ConnectedFlowEditor />
          </ReduxProvider>
        </ConfigProvider>
      </AccountContextValidator>
    </ErrorBoundary>
  );
};

export const contextTypes = {
  config: fakePropType,
};

export const editorContainerSpecId = 'editor-container';
export const editorSpecId = 'editor';

/**
 * The main editor view for editing a flow
 */
export class FlowEditor extends React.Component<FlowEditorStoreProps> {
  public static contextTypes = contextTypes;

  constructor(props: FlowEditorStoreProps) {
    super(props);
    bindCallbacks(this, {
      include: [/^handle/],
    });
  }

  public componentDidMount(): void {
    const { endpoints, flow, forceSaveOnLoad } = this.context.config;
    this.props.fetchFlow(endpoints, flow, forceSaveOnLoad);
  }

  private handleDownloadClicked(): void {
    downloadJSON(
      getCurrentDefinition(this.props.definition, this.props.nodes),
      'definition',
    );
  }

  private handleVisibilityChanged(visible: boolean): void {
    this.props.mergeEditorState({
      visible,
      activityInterval: ACTIVITY_INTERVAL,
    });
  }

  public getAlertModal(): JSX.Element {
    if (!this.props.modalMessage) {
      return null;
    }

    return (
      <Modal width="600px" show={true}>
        <Dialog
          className={styles.alert_modal}
          title={this.props.modalMessage.title}
          headerClass="alert"
          buttons={{
            primary: {
              name: 'Ok',
              onClick: () => {
                this.props.mergeEditorState({ modalMessage: null });
              },
            },
          }}
        >
          <div className={styles.alert_body}>
            {this.props.modalMessage.body}
          </div>
        </Dialog>
      </Modal>
    );
  }

  public getSavingIndicator(): JSX.Element {
    if (!this.props.saving) {
      return null;
    }

    return (
      <div id="saving_animation" className={styles.saving}>
        <Fixy>
          <Loading units={5} color="#3498db" size={7} />
        </Fixy>
      </div>
    );
  }

  public getFooter(): JSX.Element {
    return !this.props.fetchingFlow && this.context.config.showDownload ? (
      <div className={styles.footer}>
        <div className={styles.download_button}>
          <Button
            name={i18n.t('buttons.download', 'Download')}
            onClick={this.handleDownloadClicked}
            type={ButtonTypes.primary}
          />
        </div>
      </div>
    ) : null;
  }

  private handleLanguageSetting(issueDetail: IssueDetail): void {
    if (issueDetail.language) {
      this.props.handleLanguageChange(issueDetail.language);
    } else {
      this.props.handleLanguageChange(this.props.baseLanguage);
    }
  }

  public handleOpenIssue(issueDetail: IssueDetail): void {
    this.handleLanguageSetting(issueDetail);
    this.props.onOpenNodeEditor({
      originalNode: issueDetail.renderObjects.renderNode,
      originalAction: issueDetail.renderObjects.renderAction
        ? (issueDetail.renderObjects.renderAction.action as AnyAction)
        : null,
    });
  }

  private handleScrollToNode(node_uuid: string, action_uuid: string): void {
    if (
      this.props.scrollToNode === node_uuid &&
      this.props.scrollToAction === action_uuid
    ) {
      this.props.mergeEditorState({
        scrollToNode: null,
        scrollToAction: null,
      });
    }

    onNextRender(() => {
      this.props.mergeEditorState({
        scrollToNode: node_uuid,
        scrollToAction: action_uuid,
      });
    });
  }

  public handleScrollToTranslation(translation: TranslationBundle): void {
    this.handleScrollToNode(translation.node_uuid, translation.action_uuid);
  }

  private handleOpenTranslation(translation: TranslationBundle): void {
    const renderNode = this.props.nodes[translation.node_uuid];
    const action = translation.action_uuid
      ? renderNode.node.actions.find(
          action => action.uuid === translation.action_uuid,
        )
      : null;

    this.props.onOpenNodeEditor({
      originalNode: renderNode,
      originalAction: action,
    });
  }

  public handleScrollToIssue(issueDetail: IssueDetail): void {
    this.handleLanguageSetting(issueDetail);
    const issue = issueDetail.issues[0];
    this.handleScrollToNode(issue.node_uuid, issue.action_uuid);
  }

  private handleTabPopped(visible: boolean, tab: PopTabType): void {
    if (visible) {
      this.props.mergeEditorState({ popped: tab });
    } else {
      this.props.mergeEditorState({ popped: null });
    }
  }

  public componentDidUpdate(prevProps: FlowEditorStoreProps): void {
    // traceUpdate(this, prevProps);

    // Send flow name to Chatwoot when flow definition is loaded
    if (
      this.props.definition &&
      this.props.definition.name &&
      (!prevProps.definition ||
        prevProps.definition.name !== this.props.definition.name)
    ) {
      try {
        // Send flow name to parent window (Chatwoot) to update the browser title
        if (window.parent && window.parent !== window) {
          window.parent.postMessage(
            {
              type: 'flow_title_update',
              flowName: this.props.definition.name,
            },
            '*',
          );
        }
      } catch (error) {
        console.warn(
          'FlowEditor: Could not send flow name to parent window:',
          error,
        );
      }
    }
  }

  public render(): JSX.Element {
    return (
      <PageVisibility onChange={this.handleVisibilityChanged}>
        <div
          id={editorContainerSpecId}
          className={this.props.translating ? styles.translating : undefined}
          data-spec={editorContainerSpecId}
        >
          {this.getFooter()}
          {this.getAlertModal()}
          <div className={styles.editor} data-spec={editorSpecId}>
            {renderIf(
              Object.keys(this.props.nodes || {}).length > 0 &&
                this.props.languages &&
                Object.keys(this.props.languages.items).length > 0,
            )(<ConnectedLanguageSelector />)}

            {this.getSavingIndicator()}

            {renderIf(
              this.props.definition &&
                this.props.language &&
                !this.props.fetchingFlow,
            )(<ConnectedFlow />)}

            {renderIf(
              this.props.definition &&
                this.props.translating &&
                !this.props.fetchingFlow,
            )(
              <TranslatorTab
                language={this.props.language}
                languages={
                  this.props.languages ? this.props.languages.items : {}
                }
                localization={
                  this.props.definition && this.props.language
                    ? this.props.definition.localization[this.props.language.id]
                    : {}
                }
                onTranslationClicked={this.handleScrollToTranslation}
                onTranslationOpened={this.handleOpenTranslation}
                onTranslationFilterChanged={this.props.updateTranslationFilters}
                translationFilters={
                  this.props.definition
                    ? this.props.definition._ui.translation_filters
                    : null
                }
                nodes={this.props.nodes}
                onToggled={this.handleTabPopped}
                popped={this.props.popped}
              />,
            )}

            <RevisionExplorer
              loadFlowDefinition={this.props.loadFlowDefinition}
              createNewRevision={this.props.createNewRevision}
              onToggled={this.handleTabPopped}
              popped={this.props.popped}
              mutable={this.context.config.mutable}
            />

            {renderIf(Object.keys(this.props.issues).length > 0)(
              <IssuesTab
                issues={this.props.issues}
                onIssueClicked={this.handleScrollToIssue}
                onIssueOpened={this.handleOpenIssue}
                languages={
                  this.props.languages ? this.props.languages.items : {}
                }
                nodes={this.props.nodes}
                onToggled={this.handleTabPopped}
                popped={this.props.popped}
              />,
            )}
            <div id="portal-root" />
            <div id="canvas-portal" />
          </div>
        </div>
      </PageVisibility>
    );
  }
}

const mapStateToProps = ({
  flowContext: {
    definition,
    issues,
    nodes,
    assetStore,
    baseLanguage,
    brainInfo,
  },
  editorState: {
    translating,
    language,
    fetchingFlow,
    modalMessage,
    saving,
    scrollToAction,
    scrollToNode,
    popped,
  },
}: AppState) => {
  const languages = assetStore ? assetStore.languages : null;

  return {
    popped,
    baseLanguage,
    modalMessage,
    saving,
    translating,
    language,
    fetchingFlow,
    definition,
    issues,
    nodes,
    languages,
    scrollToAction,
    scrollToNode,
    brainInfo,
  };
};

const mapDispatchToProps = (dispatch: DispatchWithState) =>
  bindActionCreators(
    {
      fetchFlow,
      loadFlowDefinition,
      createNewRevision,
      mergeEditorState,
      onOpenNodeEditor,
      handleLanguageChange,
      updateTranslationFilters,
    },
    dispatch,
  );

export const ConnectedFlowEditor = connect(
  mapStateToProps,
  mapDispatchToProps,
)(FlowEditor);

export default FlowEditorContainer;
