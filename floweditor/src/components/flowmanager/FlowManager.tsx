import * as React from 'react';
import { FlowEditorConfig } from 'flowTypes';
import { FlowEditorContainer } from 'components/index';
import { createUUID } from 'utils';

export interface FlowManagerProps {
  config: FlowEditorConfig;
}

interface FlowManagerState {
  currentView: 'list' | 'editor';
  editingFlowUuid: string | null;
}

export class FlowManager extends React.Component<
  FlowManagerProps,
  FlowManagerState
> {
  constructor(props: FlowManagerProps) {
    super(props);

    // Determine initial view based on URL parameters and path
    const urlParams = new URLSearchParams(window.location.search);
    let flowUuid = urlParams.get('flow'); // Check query parameter first

    // If no flow UUID in query params, check if it's in the path
    // Handle URLs like /flows/editor/110 or /editor/110
    if (!flowUuid) {
      const pathParts = window.location.pathname.split('/');
      const editorIndex = pathParts.findIndex(part => part === 'editor');
      if (editorIndex !== -1 && editorIndex + 1 < pathParts.length) {
        const pathFlowId = pathParts[editorIndex + 1];
        // Validate that it's not empty and looks like a flow ID
        if (pathFlowId && pathFlowId.trim() !== '') {
          flowUuid = pathFlowId;
        }
      }
    }

    const action = urlParams.get('action');
    const accountId = urlParams.get('accountId');
    const token = urlParams.get('token');

    // Always skip FlowList when coming from Chatwoot (accountId and token present)
    // This ensures single source of truth - all flow management through Chatwoot
    const shouldSkipList = accountId && token;

    this.state = {
      currentView:
        flowUuid || action === 'edit' || shouldSkipList ? 'editor' : 'list',
      editingFlowUuid: flowUuid,
    };

    this.handleEditFlow = this.handleEditFlow.bind(this);
    this.handleCreateFlow = this.handleCreateFlow.bind(this);
    this.handleBackToList = this.handleBackToList.bind(this);
  }

  private updateUrl(view: 'list' | 'editor', flowUuid?: string) {
    const urlParams = new URLSearchParams(window.location.search);

    if (view === 'list') {
      urlParams.delete('flow');
      urlParams.delete('action');
    } else if (view === 'editor') {
      if (flowUuid) {
        urlParams.set('flow', flowUuid);
        urlParams.delete('action');
      } else {
        urlParams.delete('flow');
        urlParams.set('action', 'new');
      }
    }

    const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
    window.history.pushState({}, '', newUrl);
  }

  private handleEditFlow(flowUuid: string) {
    this.setState({
      currentView: 'editor',
      editingFlowUuid: flowUuid,
    });
    this.updateUrl('editor', flowUuid);
  }

  private handleCreateFlow() {
    this.setState({
      currentView: 'editor',
      editingFlowUuid: null, // null indicates new flow
    });
    this.updateUrl('editor');
  }

  private handleBackToList() {
    this.setState({
      currentView: 'list',
      editingFlowUuid: null,
    });
    this.updateUrl('list');
  }

  componentDidMount() {
    // Listen for browser back/forward navigation
    window.addEventListener('popstate', this.handlePopState);
  }

  componentWillUnmount() {
    window.removeEventListener('popstate', this.handlePopState);
  }

  private handlePopState = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const flowUuid = urlParams.get('flow');
    const action = urlParams.get('action');

    if (flowUuid || action === 'edit') {
      this.setState({
        currentView: 'editor',
        editingFlowUuid: flowUuid,
      });
    } else {
      this.setState({
        currentView: 'list',
        editingFlowUuid: null,
      });
    }
  };

  render() {
    const { currentView, editingFlowUuid } = this.state;

    // Always render FlowEditorContainer since FlowList is deprecated
    // All flow management is now handled through Chatwoot's interface
    const editorConfig = {
      ...this.props.config,
      // Use the flow from config if available, otherwise use editingFlowUuid or create new UUID
      flow: this.props.config.flow || editingFlowUuid || createUUID(),
      onBackToList: this.handleBackToList, // Add callback for returning to list
    };

    return <FlowEditorContainer config={editorConfig} />;
  }
}

export default FlowManager;
