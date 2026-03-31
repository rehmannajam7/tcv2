import * as React from 'react';
import { applyVueInReact } from 'veaury';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
// @ts-ignore
import { debounce } from 'lodash';
import i18n from 'config/i18n';
import AppState from 'store/state';
import { FlowDefinition } from 'flowTypes';
import { DispatchWithState, triggerSave } from 'store/thunks';
import { updateDefinition } from 'store/flowContext';
import {
  startSync,
  endSync,
  failSync,
  monitorPostMessage,
} from 'utils/syncMonitor';

// @ts-ignore
import Unnnic from '@weni/unnnic-system';
// @ts-ignore
import styles from './KeywordsModal.module.scss';

const UnnnicModal = applyVueInReact(Unnnic.unnnicModal, {
  vue: {
    componentWrap: 'div',
    slotWrap: 'div',
    componentWrapAttrs: {
      style: {
        all: '',
        position: 'relative',
        zIndex: 10e2,
      },
    },
  },
  react: {
    componentWrap: 'div',
    slotWrap: 'div',
    componentWrapAttrs: {
      __use_react_component_wrap: '',
      style: {
        all: '',
      },
    },
  },
});

const UnnnicButton = applyVueInReact(Unnnic.unnnicButton, {
  vue: {
    componentWrap: 'div',
    slotWrap: 'div',
    componentWrapAttrs: {
      style: {
        display: 'flex',
        flex: 1,
      },
    },
  },
});

const UnnnicInput = applyVueInReact(Unnnic.unnnicInput, {
  vue: {
    componentWrap: 'div',
    slotWrap: 'div',
  },
});

export interface KeywordsModalStoreProps {
  definition: FlowDefinition;
}

export interface KeywordsModalDispatchProps {
  updateDefinition: (definition: FlowDefinition) => void;
  triggerSave: () => void;
}

export interface KeywordsModalPassedProps {
  show: boolean;
  onClose: () => void;
}

export type KeywordsModalProps = KeywordsModalStoreProps &
  KeywordsModalDispatchProps &
  KeywordsModalPassedProps;

interface KeywordsModalState {
  keywords: string[];
  newKeyword: string;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  syncError: string | null;
  lastSyncTime: number | null;
  validationError: string;
  // Performance optimizations
  visibleKeywords: string[];
  currentPage: number;
  keywordsPerPage: number;
  isLoading: boolean;
}

export class KeywordsModal extends React.Component<
  KeywordsModalProps,
  KeywordsModalState
> {
  constructor(props: KeywordsModalProps) {
    super(props);

    // Initialize keywords from current definition
    const currentKeywords = this.props.definition.keywords || [];

    this.state = {
      keywords: [...currentKeywords],
      newKeyword: '',
      syncStatus: 'idle',
      syncError: null,
      lastSyncTime: null,
      validationError: '',
      // Performance optimizations
      visibleKeywords: [...currentKeywords],
      currentPage: 1,
      keywordsPerPage: 50,
      isLoading: false,
    };
  }

  componentDidMount(): void {
    // Set up message listener for parent communication
    window.addEventListener('message', this.handleParentMessage);
    console.log('KeywordsModal: Message listener added');

    // Notify parent that modal is ready
    this.notifyParentKeywordsUpdate(
      this.state.keywords,
      'keywords_modal_ready',
    );
    this.updateVisibleKeywords();
  }

  componentWillUnmount(): void {
    // Clean up message listener
    window.removeEventListener('message', this.handleParentMessage);
    console.log('KeywordsModal: Message listener removed');
  }

  componentDidUpdate(
    prevProps: KeywordsModalProps,
    prevState: KeywordsModalState,
  ): void {
    // Handle external definition updates
    if (prevProps.definition !== this.props.definition) {
      const currentKeywords = this.props.definition.keywords || [];
      if (
        JSON.stringify(this.state.keywords) !== JSON.stringify(currentKeywords)
      ) {
        this.setState({ keywords: [...currentKeywords] });
        console.log('KeywordsModal: Keywords updated from definition');
      }
    }

    // Update visible keywords when keywords array changes
    if (prevState.keywords.length !== this.state.keywords.length) {
      this.updateVisibleKeywords();
    }
  }

  private handleNewKeywordChange = (value: string): void => {
    this.setState({ newKeyword: value });
  };

  // Coerce UnnnicInput payloads (string, event-like objects) into a string
  private coerceInputToString = (payload: any): string => {
    if (payload == null) {
      return '';
    }
    if (typeof payload === 'string') {
      return payload;
    }
    // Common shapes from veaury/Vue wrappers
    if (typeof payload.value === 'string') {
      return payload.value;
    }
    if (
      payload.currentTarget &&
      typeof payload.currentTarget.value === 'string'
    ) {
      return payload.currentTarget.value;
    }
    if (payload.target && typeof payload.target.value === 'string') {
      return payload.target.value;
    }
    if (payload.detail && typeof payload.detail.value === 'string') {
      return payload.detail.value;
    }
    // Fallback: stringify then trim
    try {
      return String(payload);
    } catch (e) {
      return '';
    }
  };

  private handleAddKeyword = (): void => {
    const { newKeyword, keywords } = this.state;

    // Start sync monitoring
    const syncId = startSync('KeywordsModal', 'addKeyword', { newKeyword });

    if (!newKeyword.trim()) {
      this.setState({
        validationError: 'Keyword cannot be empty',
        syncStatus: 'error',
      });
      failSync(syncId, 'Keyword cannot be empty');
      return;
    }

    const trimmedKeyword = newKeyword.trim().toLowerCase();

    if (keywords.includes(trimmedKeyword)) {
      this.setState({
        validationError: 'Keyword already exists',
        syncStatus: 'error',
      });
      failSync(syncId, 'Keyword already exists');
      return;
    }

    const updatedKeywords = [...keywords, trimmedKeyword];

    this.setState({
      keywords: updatedKeywords,
      newKeyword: '',
      validationError: '',
      syncStatus: 'success',
    });

    // End sync monitoring on success
    endSync(syncId, { updatedKeywords });

    this.debouncedKeywordUpdate(updatedKeywords);
  };

  private handleRemoveKeyword = (keywordToRemove: string): void => {
    // Start sync monitoring
    const syncId = startSync('KeywordsModal', 'removeKeyword', {
      keywordToRemove,
    });

    this.updateSyncStatus('syncing');

    const newKeywords = this.state.keywords.filter(
      keyword => keyword !== keywordToRemove,
    );
    this.setState({ keywords: newKeywords }, () => {
      // Notify parent about keyword removal
      this.notifyParentKeywordsUpdate(
        newKeywords,
        'keyword_removed',
        keywordToRemove,
      );

      // Use debounced update for better performance
      this.debouncedKeywordUpdate(newKeywords);

      // End sync monitoring on success
      endSync(syncId, { updatedKeywords: newKeywords });
      this.updateSyncStatus('success');
    });
  };

  private handleKeyPress = (event: React.KeyboardEvent): void => {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.handleAddKeyword();
    }
  };

  private handleSave = (): void => {
    // Update the definition with new keywords
    const updatedDefinition = {
      ...this.props.definition,
      keywords: this.state.keywords,
    };

    this.props.updateDefinition(updatedDefinition);
    this.props.triggerSave(); // Trigger save to mark flow as dirty

    // Notify parent about final keywords state
    this.notifyParentKeywordsUpdate(this.state.keywords, 'keywords_saved');

    this.props.onClose();
  };

  private handleCancel = (): void => {
    // Reset to original state
    const currentKeywords = this.props.definition.keywords || [];
    this.setState({
      keywords: [...currentKeywords],
      newKeyword: '',
    });
    this.props.onClose();
  };

  private notifyParentKeywordsUpdate = (
    keywords: string[],
    action: string,
    changedKeyword?: string,
  ): void => {
    // Send message to parent window (FlowEditor.vue)
    if (window.parent !== window) {
      // Get allowed origin from environment or use document referrer
      const allowedOrigin = this.getAllowedOrigin();

      const message = {
        type: action,
        keywords: keywords,
        changedKeyword: changedKeyword,
        timestamp: Date.now(),
        source: 'floweditor',
      };

      // Monitor postMessage communication
      const syncId = monitorPostMessage(allowedOrigin, action, message);

      try {
        // Use specific origin instead of '*' for better security
        window.parent.postMessage(message, allowedOrigin);
        console.log(
          `KeywordsModal: Sent ${action} message to parent`,
          message,
          'origin:',
          allowedOrigin,
        );

        // End sync monitoring on success
        endSync(syncId, message);
      } catch (error) {
        // Fail sync monitoring on error
        failSync(
          syncId,
          error instanceof Error ? error.message : 'Unknown error',
          message,
        );
        throw error;
      }
    }
  };

  private updateSyncStatus = (
    status: 'idle' | 'syncing' | 'success' | 'error',
    error: string | null = null,
  ): void => {
    this.setState({
      syncStatus: status,
      syncError: error,
      lastSyncTime: Date.now(),
    });

    // Auto-reset success status after 3 seconds
    if (status === 'success') {
      setTimeout(() => {
        this.setState({ syncStatus: 'idle' });
      }, 3000);
    }
  };

  private getSyncStatusText = (): string => {
    switch (this.state.syncStatus) {
      case 'syncing':
        return 'Synchronizing...';
      case 'success':
        return 'Synchronized';
      case 'error':
        return `Sync failed: ${this.state.syncError}`;
      default:
        return 'Ready';
    }
  };

  private updateVisibleKeywords = (): void => {
    const { keywords, currentPage, keywordsPerPage } = this.state;
    const startIndex = 0;
    const endIndex = currentPage * keywordsPerPage;
    const visibleKeywords = keywords.slice(startIndex, endIndex);

    this.setState({ visibleKeywords });
  };

  private loadMoreKeywords = (): void => {
    const { currentPage, keywords } = this.state;
    const nextPage = currentPage + 1;
    const startIndex = 0;
    const endIndex = nextPage * this.state.keywordsPerPage;

    if (endIndex <= keywords.length) {
      this.setState({
        currentPage: nextPage,
        visibleKeywords: keywords.slice(startIndex, endIndex),
      });
    }
  };

  private debouncedKeywordUpdate = debounce((keywords: string[]): void => {
    this.notifyParentKeywordsUpdate(keywords, 'keywords_update');
  }, 300);

  private getAllowedOrigin = (): string => {
    // Get allowed origin from environment variable or document referrer
    try {
      // Check for environment variable
      const envOrigin = (window as any).FLOWEDITOR_PARENT_ORIGIN;
      if (envOrigin) {
        return envOrigin;
      }

      // Fallback to document referrer
      if (document.referrer) {
        const referrerUrl = new URL(document.referrer);
        return referrerUrl.origin;
      }

      // Final fallback (use with caution in production)
      return '*';
    } catch (error) {
      console.warn('Error determining allowed origin:', error);
      return '*';
    }
  };

  private handleParentMessage = (event: MessageEvent): void => {
    // Handle messages from parent window (FlowEditor.vue)
    if (event.data && event.data.type) {
      console.log('KeywordsModal: Received message from parent', event.data);

      switch (event.data.type) {
        case 'keywords_sync_request':
          // Send current keywords to parent
          this.notifyParentKeywordsUpdate(
            this.state.keywords,
            'keywords_updated',
          );
          break;

        case 'keywords_update':
          // Update keywords from parent
          if (event.data.keywords && Array.isArray(event.data.keywords)) {
            this.setState({ keywords: [...event.data.keywords] });
          }
          break;

        case 'keyword_validation_error':
          // Handle validation errors
          console.error(
            'Keyword validation error from parent:',
            event.data.error,
          );
          break;
      }
    }
  };

  public render(): JSX.Element {
    if (!this.props.show) {
      return null;
    }

    return (
      <UnnnicModal className={styles.modal} closeIcon={false}>
        <div className={styles.content}>
          <div className={styles.header}>
            <div className={styles.header_content}>
              <h2 className={styles.title}>
                {i18n.t('keywords.title', 'Flow Keywords')}
              </h2>
              <div className={styles.sync_status}>
                <div
                  className={`${styles.sync_indicator} ${
                    styles[`sync_indicator--${this.state.syncStatus}`]
                  }`}
                >
                  <span className={styles.sync_text}>
                    {this.getSyncStatusText()}
                  </span>
                  {this.state.syncStatus === 'syncing' && (
                    <div className={styles.sync_spinner}></div>
                  )}
                </div>
              </div>
            </div>
            <p className={styles.description}>
              {i18n.t(
                'keywords.description',
                'Set trigger keywords that will start this flow when users send them.',
              )}
            </p>
          </div>

          <div className={styles.input_container}>
            <label className={styles.label}>
              {i18n.t('keywords.add_label', 'Add Keyword')}
            </label>
            <div className={styles.input_row}>
              <UnnnicInput
                value={
                  typeof this.state.newKeyword === 'string'
                    ? this.state.newKeyword
                    : ''
                }
                placeholder={i18n.t(
                  'keywords.placeholder',
                  'Enter a keyword...',
                )}
                onInput={(payload: any) =>
                  this.handleNewKeywordChange(this.coerceInputToString(payload))
                }
                onKeypress={this.handleKeyPress}
              />
              <UnnnicButton
                type="secondary"
                text={i18n.t('keywords.add', 'Add')}
                onClick={this.handleAddKeyword}
                disabled={
                  !(
                    typeof this.state.newKeyword === 'string' &&
                    this.state.newKeyword.trim()
                  )
                }
              />
            </div>
          </div>

          <div className={styles.keywords_container}>
            <label className={styles.label}>
              {i18n.t('keywords.current_label', 'Current Keywords')}
            </label>
            <div className={styles.keywords_list}>
              {this.state.visibleKeywords.length === 0 ? (
                <p className={styles.empty_message}>
                  {i18n.t('keywords.empty', 'No keywords set for this flow.')}
                </p>
              ) : (
                <>
                  {this.state.visibleKeywords.map((keyword, index) => (
                    <div key={index} className={styles.keyword_tag}>
                      <span className={styles.keyword_text}>{keyword}</span>
                      <button
                        className={styles.remove_button}
                        onClick={() => this.handleRemoveKeyword(keyword)}
                        title={i18n.t('keywords.remove', 'Remove keyword')}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {this.state.visibleKeywords.length <
                    this.state.keywords.length && (
                    <button
                      type="button"
                      onClick={this.loadMoreKeywords}
                      className={styles.load_more_button}
                      disabled={this.state.isLoading}
                    >
                      {this.state.isLoading
                        ? 'Loading...'
                        : `Load more (${this.state.keywords.length -
                            this.state.visibleKeywords.length} remaining)`}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          <div className={styles.buttons}>
            <UnnnicButton
              type="tertiary"
              text={i18n.t('keywords.cancel', 'Cancel')}
              onClick={this.handleCancel}
            />
            <UnnnicButton
              type="primary"
              text={i18n.t('keywords.save', 'Save')}
              onClick={this.handleSave}
            />
          </div>
        </div>
      </UnnnicModal>
    );
  }
}

const mapStateToProps = (state: AppState): KeywordsModalStoreProps => ({
  definition: state.flowContext.definition,
});

const mapDispatchToProps = (
  dispatch: DispatchWithState,
): KeywordsModalDispatchProps =>
  bindActionCreators(
    {
      updateDefinition,
      triggerSave,
    },
    dispatch,
  );

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(KeywordsModal);
