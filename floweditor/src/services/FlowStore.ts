/* istanbul ignore file */
import axios, { AxiosResponse } from 'axios';
import { FlowDefinition } from 'flowTypes';

// @ts-ignore
import storage from 'local-storage';

export class FlowStore {
  private static singleton: FlowStore = new FlowStore();

  static get(): FlowStore {
    return FlowStore.singleton;
  }

  private constructor() {
    // Expose debug methods globally for testing
    if (typeof window !== 'undefined') {
      (window as any).debugFlowStore = {
        clearAllStorage: () => this.clearAllFlowStorage(),
        getStorageKey: () => this.getStorageKey(),
        getAllFlows: () => this.getAllFlows(),
        getAccountId: () => this.getAccountId(),
      };
    }
  }

  private getAccountId(): string | null {
    const urlParams = new URLSearchParams(window.location.search);
    // Check both 'accountId' (from Chatwoot) and 'account_id' (fallback)
    // Accept 'accountid' as well
    let accountId =
      urlParams.get('accountId') ||
      urlParams.get('account_id') ||
      urlParams.get('accountid');

    // If not found in URL, try to get from stored context
    if (!accountId) {
      try {
        const { getStoredAccountId } = require('../external');
        accountId = getStoredAccountId();
      } catch (error) {
        console.warn('Failed to get stored account ID:', error);
      }
    }

    // If still not found, try to extract from current URL path
    if (!accountId) {
      const pathMatch = window.location.pathname.match(/\/accounts\/(\d+)/);
      if (pathMatch) {
        accountId = pathMatch[1];
      }
    }

    console.log('URL params:', Object.fromEntries(urlParams.entries()));
    console.log('Extracted accountId:', accountId);
    return accountId;
  }

  private getStorageKey(): string {
    const accountId = this.getAccountId();
    const token = this.getAuthToken();

    if (!accountId) {
      console.warn('No accountId found in URL params, using default key');
      return 'flow';
    }

    // Include a hash of the token to ensure different tokens for the same account
    // create separate storage spaces (for security and proper isolation)
    let key = `flow_${accountId}`;
    if (token) {
      // Create a simple hash of the token for storage key uniqueness
      const tokenHash = this.simpleHash(token);
      key = `flow_${accountId}_${tokenHash}`;
    }

    console.log('Using storage key:', key);
    return key;
  }

  private getAuthToken(): string | null {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('token');
  }

  private simpleHash(str: string): string {
    let hash = 0;
    if (str.length === 0) return hash.toString();
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  reset() {
    const key = this.getStorageKey();
    console.log('Resetting flow storage for key:', key);
    storage.remove(key);
  }

  // Debug method to clear all flow storage and force API loading
  clearAllFlowStorage() {
    try {
      const accountId = this.getAccountId();
      console.log('Clearing all flow storage for account:', accountId);

      // Clear all possible storage keys for this account
      const keysToCheck = [
        `flow_${accountId}`,
        `flow_${accountId}_*`, // Pattern for token-based keys
        'flow', // Default key
      ];

      // Get all localStorage keys and remove flow-related ones
      const allKeys = Object.keys(localStorage);
      const flowKeys = allKeys.filter(
        key =>
          key.startsWith('flow_') ||
          key === 'flow' ||
          key.includes(`_${accountId}_`) ||
          key.includes('floweditor'),
      );

      flowKeys.forEach(key => {
        console.log('Removing storage key:', key);
        localStorage.removeItem(key);
      });

      console.log('Cleared flow storage keys:', flowKeys);
      return flowKeys;
    } catch (error) {
      console.error('Error clearing flow storage:', error);
      return [];
    }
  }

  getFlowFromStore(uuid: string): FlowDefinition | undefined {
    try {
      const flows = this.getAllFlows();
      const flow = flows.find(f => f.uuid === uuid);

      if (flow) {
        console.log('Flow loaded from storage:', {
          accountId: this.getAccountId(),
          flowName: flow.name,
          flowUuid: flow.uuid,
          nodeCount: flow.nodes ? flow.nodes.length : 0,
          hasUI: !!flow._ui,
          hasLocalization: !!flow.localization,
        });

        // Debug: Log the actual flow structure
        console.log('Full flow structure from storage:', {
          uuid: flow.uuid,
          name: flow.name,
          nodes: flow.nodes,
          _ui: flow._ui,
          revision: flow.revision,
        });

        // Validate flow structure before returning
        if (!flow.nodes) {
          console.warn('Flow missing nodes array, initializing empty array');
          flow.nodes = [];
        }
        if (!flow.localization) {
          console.warn('Flow missing localization, initializing empty object');
          flow.localization = {};
        }
        if (!flow._ui) {
          console.warn('Flow missing _ui, initializing default structure');
          flow._ui = {
            nodes: {},
            stickies: {},
            languages: [],
          };
        }

        return flow;
      } else {
        console.log('No flow found in storage for UUID:', uuid);
        console.log(
          'Available flows in storage:',
          flows.map(f => ({ uuid: f.uuid, name: f.name })),
        );
        return undefined;
      }
    } catch (error) {
      console.error('Error loading flow from storage:', error);
      return undefined;
    }
  }

  getAllFlows(): FlowDefinition[] {
    const key = this.getStorageKey();
    const accountId = this.getAccountId();
    console.log('Loading all flows for account:', accountId);

    const flows = storage.get(key);
    if (flows && Array.isArray(flows)) {
      console.log(`Found ${flows.length} flows in storage`);
      return flows as FlowDefinition[];
    } else if (flows && !Array.isArray(flows)) {
      // Migration: convert single flow to array format
      console.log('Migrating single flow to array format');
      const flowArray = [flows as FlowDefinition];
      storage.set(key, flowArray);
      return flowArray;
    } else {
      console.log('No flows found in storage');
      return [];
    }
  }

  deleteFlow(uuid: string): boolean {
    const flows = this.getAllFlows();
    const initialLength = flows.length;
    const updatedFlows = flows.filter(f => f.uuid !== uuid);

    if (updatedFlows.length < initialLength) {
      const key = this.getStorageKey();
      storage.set(key, updatedFlows);
      console.log('Flow deleted:', uuid);
      return true;
    }

    console.log('Flow not found for deletion:', uuid);
    return false;
  }

  loadFromUrl(
    url: string,
    token: string,
    onLoad: (definition: FlowDefinition) => void,
  ) {
    const accountId = this.getAccountId();
    console.log('Loading flow from URL:', { accountId, url });

    return axios.get(url).then((response: AxiosResponse) => {
      let definition: FlowDefinition;

      try {
        // Try to parse as JSON first
        if (typeof response.data === 'string') {
          definition = JSON.parse(response.data);
        } else {
          // If it's already an object, use it directly
          definition = response.data as FlowDefinition;
        }

        // Ensure localization is an object, not a string
        if (typeof definition.localization === 'string') {
          try {
            definition.localization = JSON.parse(definition.localization);
          } catch (e) {
            console.warn(
              'Failed to parse localization string, using empty object:',
              e,
            );
            definition.localization = {};
          }
        } else if (!definition.localization) {
          definition.localization = {};
        }

        console.log('Flow loaded from URL:', {
          accountId,
          flowName: definition.name,
          flowUuid: definition.uuid,
          localizationType: typeof definition.localization,
        });

        onLoad(definition);
      } catch (error) {
        console.error('Failed to parse flow definition:', error);
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Invalid flow definition format: ${errorMessage}`);
      }
    });
  }

  save(flow: FlowDefinition): void {
    try {
      const accountId = this.getAccountId();
      if (!accountId) {
        console.warn('No account ID available, saving to default storage');
      }

      const storageKey = this.getStorageKey();
      const flows = this.getAllFlows();

      // Find existing flow or add new one
      const existingIndex = flows.findIndex(f => f.uuid === flow.uuid);

      // Ensure flow has required structure
      const flowToSave = {
        ...flow,
        nodes: flow.nodes || [],
        localization: flow.localization || {},
        _ui: flow._ui || {
          nodes: {},
          stickies: {},
          languages: [],
        },
        // Add timestamp for tracking
        lastModified: new Date().toISOString(),
      };

      if (existingIndex >= 0) {
        flows[existingIndex] = flowToSave;
        console.log('Updated existing flow in storage:', {
          accountId,
          flowName: flow.name,
          flowUuid: flow.uuid,
          storageKey,
        });
      } else {
        flows.push(flowToSave);
        console.log('Added new flow to storage:', {
          accountId,
          flowName: flow.name,
          flowUuid: flow.uuid,
          storageKey,
        });
      }

      storage.set(storageKey, flows);
      console.log('Flow saved successfully to localStorage');
    } catch (error) {
      console.error('Error saving flow to storage:', error);
      throw error; // Re-throw the error to let the caller handle it
    }
  }
}
