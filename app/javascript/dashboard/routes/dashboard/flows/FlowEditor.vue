<script>
import { mapGetters } from 'vuex';
import { useAccount } from 'dashboard/composables/useAccount';
import axios from 'axios';
import Auth from 'dashboard/api/auth';

export default {
  name: 'FlowEditor',
  props: {
    flowId: {
      type: [String, Number],
      default: null,
    },
  },
  setup() {
    const { currentAccount, accountId } = useAccount();
    return {
      currentAccount,
      accountId,
    };
  },
  data() {
    return {
      isLoading: false, // Start with false so iframe can render immediately
      flowEditorToken: null, // JWT token for FlowEditor API authentication
    };
  },
  computed: {
    ...mapGetters({
      currentUser: 'getCurrentUser',
    }),
    flowEditorUrl() {
      // Point to local FlowEditor UI server for development
      const baseUrl = `http://localhost:3001`;

      const params = new URLSearchParams();

      // Add account context
      if (this.currentAccount) {
        params.append('account_id', this.currentAccount.id);
        params.append('account_name', this.currentAccount.name);
        // FlowEditor also expects 'accountId' parameter
        params.append('accountId', this.currentAccount.id);
      }

      // Add user context
      if (this.currentUser) {
        params.append('user_id', this.currentUser.id);
        params.append('user_name', this.currentUser.name);
        params.append('user_email', this.currentUser.email);
        // Add JWT token for API authentication (FlowEditor expects 'token' parameter)
        if (this.flowEditorToken) {
          params.append('token', this.flowEditorToken);
        }
      }

      // Add flow ID if editing (FlowEditor expects 'flow' parameter)
      if (this.flowId) {
        params.append('flow', this.flowId);
      }

      return `${baseUrl}?${params.toString()}`;
    },
    dashboardAppContext() {
      // Create a completely safe, serializable version of the context
      const safeSerialize = (obj) => {
        if (obj === null || obj === undefined) return null;
        if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
          return obj;
        }
        if (Array.isArray(obj)) {
          return obj.map(item => safeSerialize(item));
        }
        if (typeof obj === 'object') {
          const result = {};
          for (const [key, value] of Object.entries(obj)) {
            if (typeof value !== 'function' && typeof value !== 'symbol' && typeof value !== 'undefined') {
              try {
                result[key] = safeSerialize(value);
              } catch (e) {
                // Skip properties that can't be serialized
                console.warn(`Skipping property ${key} due to serialization error:`, e);
              }
            }
          }
          return result;
        }
        return null;
      };

      const cleanAccount = this.currentAccount ? safeSerialize({
        id: this.currentAccount.id,
        name: this.currentAccount.name,
        locale: this.currentAccount.locale,
        domain: this.currentAccount.domain,
        support_email: this.currentAccount.support_email,
        // Only include primitive values from features and custom_attributes
        features: this.currentAccount.features ? Object.keys(this.currentAccount.features).reduce((acc, key) => {
          const value = this.currentAccount.features[key];
          if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            acc[key] = value;
          }
          return acc;
        }, {}) : {},
        custom_attributes: this.currentAccount.custom_attributes ? Object.keys(this.currentAccount.custom_attributes).reduce((acc, key) => {
          const value = this.currentAccount.custom_attributes[key];
          if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            acc[key] = value;
          }
          return acc;
        }, {}) : {}
      }) : null;

      const cleanUser = this.currentUser ? safeSerialize({
        id: this.currentUser.id,
        name: this.currentUser.name,
        email: this.currentUser.email,
        avatar_url: this.currentUser.avatar_url,
        role: this.currentUser.role,
        accounts: this.currentUser.accounts ? this.currentUser.accounts.map(acc => ({
          id: acc.id,
          name: acc.name,
          role: acc.role
        })) : []
      }) : null;

      return {
        account: cleanAccount,
        user: cleanUser,
        flowId: this.flowId,
        mode: this.flowId ? 'edit' : 'create',
        accessToken: this.flowEditorToken,
      };
    },
  },
  watch: {
    currentAccount: {
      immediate: true,
      handler(newAccount) {
        if (newAccount && newAccount.id && !this.flowEditorToken) {
          this.fetchFlowEditorToken();
        }
      },
    },
  },
  mounted() {
    // FlowEditor iframe loaded successfully
    this.setupMessageListener();
    
    // Send context to FlowEditor after a short delay to ensure iframe is ready
    setTimeout(() => {
      this.sendContextToFlowEditor();
    }, 1000);
  },
  beforeUnmount() {
    window.removeEventListener('message', this.handleMessage);
  },
  methods: {
    async fetchFlowEditorToken() {
      try {
        // Ensure currentAccount is available
        if (!this.currentAccount || !this.currentAccount.id) {
          console.warn('Current account not available for token fetch');
          return;
        }
        
        // Create axios instance with proper authentication headers
        const { apiHost = '' } = window.chatwootConfig || {};
        const authHeaders = {};
        
        if (Auth.hasAuthCookie()) {
          const {
            'access-token': accessToken,
            'token-type': tokenType,
            client,
            expiry,
            uid,
          } = Auth.getAuthData();
          Object.assign(authHeaders, {
            'access-token': accessToken,
            'token-type': tokenType,
            client,
            expiry,
            uid,
          });
        }

        const response = await axios.get(
          `${apiHost}/api/v1/accounts/${this.currentAccount.id}/flow_editor/tokens`,
          { headers: authHeaders }
        );
        this.flowEditorToken = response.data.token;
        console.log('FlowEditor JWT token fetched successfully');
      } catch (error) {
        console.error('Failed to fetch FlowEditor token:', error);
        if (error.response) {
          this.$toast.error(`Failed to authenticate with FlowEditor: ${error.response.data?.message || error.response.statusText}`);
        } else {
          this.$toast.error('Failed to authenticate with FlowEditor');
        }
      }
    },
    setupMessageListener() {
      window.addEventListener('message', this.handleMessage);
    },
    onIframeLoad() {
      // FlowEditor iframe loaded successfully
      this.isLoading = false;
    },
    sendContextToFlowEditor() {
      if (!this.$refs.flowEditorFrame?.contentWindow) {
        console.warn('FlowEditor iframe not ready yet');
        return;
      }

      // Create clean, serializable config object
      const cleanFlowEditorConfig = {
        flowId: this.flowId,
        flowType: this.flowType,
        accountId: this.accountId,
        token: this.flowEditorToken,
        apiBaseUrl: this.apiBaseUrl,
        endpoints: {
          flows: `${this.apiBaseUrl}/api/v1/accounts/${this.accountId}/flows`,
          contacts: `${this.apiBaseUrl}/api/v1/accounts/${this.accountId}/contacts`,
          conversations: `${this.apiBaseUrl}/api/v1/accounts/${this.accountId}/conversations`,
          messages: `${this.apiBaseUrl}/api/v1/accounts/${this.accountId}/messages`,
        },
      };

      // Create the event data with safe serialization
      const eventData = {
        type: 'chatwoot_context',
        data: {
          dashboardAppContext: this.dashboardAppContext,
          flowEditorConfig: cleanFlowEditorConfig,
        },
      };

      // Double-check serialization before sending
      try {
        // First, test if the data can be JSON serialized
        const testSerialization = JSON.stringify(eventData);
        
        // If that works, parse it back to ensure it's clean
        const serializableData = JSON.parse(testSerialization);
        
        // Send the verified serializable data
        this.$refs.flowEditorFrame.contentWindow.postMessage(
          serializableData,
          'http://localhost:8000'
        );
        console.log('Context sent to FlowEditor successfully');
      } catch (error) {
        console.error('Failed to serialize context data:', error);
        
        // Ultimate fallback: send only essential data
        const minimalEventData = {
          type: 'chatwoot_context',
          data: {
            dashboardAppContext: {
              account: { 
                id: String(this.accountId || ''),
                name: String(this.currentAccount?.name || '')
              },
              user: { 
                id: String(this.currentUser?.id || ''),
                name: String(this.currentUser?.name || ''),
                email: String(this.currentUser?.email || '')
              },
              flowId: String(this.flowId || ''),
              mode: this.flowId ? 'edit' : 'create',
              accessToken: String(this.flowEditorToken || ''),
            },
            flowEditorConfig: {
              flowId: String(this.flowId || ''),
              accountId: String(this.accountId || ''),
              token: String(this.flowEditorToken || ''),
            },
          },
        };
        
        try {
          this.$refs.flowEditorFrame.contentWindow.postMessage(
            minimalEventData,
            'http://localhost:8000'
          );
          console.log('Minimal context sent to FlowEditor as fallback');
        } catch (fallbackError) {
          console.error('Even minimal context failed to serialize:', fallbackError);
        }
      }
    },
    handleMessage(event) {
      // Only accept messages from FlowEditor origins
      if (
        event.origin !== 'http://localhost:8000' &&
        event.origin !== 'https://floweditor.chatwoot.com'
      ) {
        return;
      }

      // Send context to FlowEditor when it's ready
      if (event.data && event.data.type === 'floweditor_ready') {
        this.sendContextToFlowEditor();
        return;
      }

      const { type, data } = event.data;

      switch (type) {
        case 'flow_saved':
          this.handleFlowSaved(data);
          break;
        case 'flow_loaded':
          console.log('Flow loaded in FlowEditor:', data);
          break;
        default:
          console.log('Unknown message type from FlowEditor:', type);
          break;
      }
    },
    handleFlowSaved(flowData) {
      // Show success message
      this.$toast.success('Flow saved successfully');

      // Optionally navigate back to flows list
      if (flowData.navigateToList) {
        this.goBack();
      }
    },
    goBack() {
      // Navigate back to the flows list page
      this.$router.push({
        name: 'flows_list',
        params: { accountId: this.accountId },
      });
    },
  },
};
</script>

<template>
  <div
    class="flex flex-col justify-between flex-1 h-full m-0 overflow-auto bg-n-background"
  >
    <!-- Header -->
    <div class="flex items-center justify-between p-4 border-b border-n-weak">
      <div class="flex items-center gap-3">
        <button class="p-2 hover:bg-n-alpha-2 rounded-lg" @click="goBack">
          <svg
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <div>
          <h1 class="text-xl font-semibold text-n-slate-12">
            {{ flowId ? $t('FLOWS.EDIT_FLOW') : $t('FLOWS.CREATE_NEW_FLOW') }}
          </h1>
          <p class="text-sm text-n-slate-11">
            {{ $t('FLOWS.DESIGN_DESCRIPTION') }}
          </p>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center flex-1">
      <div class="text-center">
        <div
          class="animate-spin rounded-full h-8 w-8 border-b-2 border-n-brand mx-auto mb-2"
        />
        <p class="text-n-slate-11">{{ $t('FLOWS.LOADING_EDITOR') }}</p>
      </div>
    </div>

    <!-- FlowEditor Iframe -->
    <div v-else class="flex-1 relative">
      <iframe
        ref="flowEditorFrame"
        :src="flowEditorUrl"
        class="w-full h-full border-0"
        @load="onIframeLoad"
      />
    </div>
  </div>
</template>
