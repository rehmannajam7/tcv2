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
      pendingAcks: new Map(), // Track pending message acknowledgments
    };
  },
  computed: {
    ...mapGetters({
      currentUser: 'getCurrentUser',
      isFeatureEnabledonAccount: 'accounts/isFeatureEnabledonAccount',
    }),
    isFlowEditorEnabled() {
      return this.isFeatureEnabledonAccount(this.accountId, 'flow_editor');
    },
    flowEditorUrl() {
      // Determine FlowEditor UI base dynamically
      const configuredBase = (window.chatwootConfig && window.chatwootConfig.flowEditorUiBaseUrl) ? window.chatwootConfig.flowEditorUiBaseUrl : '';
      const protocol = window.location.protocol || 'http:';
      const hostname = window.location.hostname || 'localhost';
      const defaultBase = `${protocol}//${hostname}:3001`;
      const baseUrl = configuredBase || defaultBase;

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
      const safeSerialize = obj => {
        if (obj === null || obj === undefined) return null;
        if (
          typeof obj === 'string' ||
          typeof obj === 'number' ||
          typeof obj === 'boolean'
        ) {
          return obj;
        }
        if (Array.isArray(obj)) {
          return obj.map(item => safeSerialize(item));
        }
        if (typeof obj === 'object') {
          const result = {};
          Object.entries(obj).forEach(([key, value]) => {
            if (
              typeof value !== 'function' &&
              typeof value !== 'symbol' &&
              typeof value !== 'undefined'
            ) {
              try {
                result[key] = safeSerialize(value);
              } catch (e) {
                // Skip properties that can't be serialized
              }
            }
          });
          return result;
        }
        return null;
      };

      const cleanAccount = this.currentAccount
        ? safeSerialize({
            id: this.currentAccount.id,
            name: this.currentAccount.name,
            locale: this.currentAccount.locale,
            domain: this.currentAccount.domain,
            support_email: this.currentAccount.support_email,
            // Only include primitive values from features and custom_attributes
            features: this.currentAccount.features
              ? Object.keys(this.currentAccount.features).reduce((acc, key) => {
                  const value = this.currentAccount.features[key];
                  if (
                    typeof value === 'string' ||
                    typeof value === 'number' ||
                    typeof value === 'boolean'
                  ) {
                    acc[key] = value;
                  }
                  return acc;
                }, {})
              : {},
            custom_attributes: this.currentAccount.custom_attributes
              ? Object.keys(this.currentAccount.custom_attributes).reduce(
                  (acc, key) => {
                    const value = this.currentAccount.custom_attributes[key];
                    if (
                      typeof value === 'string' ||
                      typeof value === 'number' ||
                      typeof value === 'boolean'
                    ) {
                      acc[key] = value;
                    }
                    return acc;
                  },
                  {}
                )
              : {},
          })
        : null;

      const cleanUser = this.currentUser
        ? safeSerialize({
            id: this.currentUser.id,
            name: this.currentUser.name,
            email: this.currentUser.email,
            avatar_url: this.currentUser.avatar_url,
            role: this.currentUser.role,
            accounts: this.currentUser.accounts
              ? this.currentUser.accounts.map(acc => ({
                  id: acc.id,
                  name: acc.name,
                  role: acc.role,
                }))
              : [],
          })
        : null;

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
          // Current account not available for token fetch
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
      } catch (error) {
        // Failed to fetch FlowEditor token
        if (error.response) {
          this.$toast.error(
            `Failed to authenticate with FlowEditor: ${error.response.data?.message || error.response.statusText}`
          );
        } else {
          this.$toast.error(
            'Failed to authenticate with FlowEditor. Please try again.'
          );
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
    handleMessage(event) {
      // Enhanced security check for allowed origins
      const configuredOrigin = (window.chatwootConfig && window.chatwootConfig.flowEditorUiBaseUrl) ? window.chatwootConfig.flowEditorUiBaseUrl : '';
      const protocol = window.location.protocol || 'http:';
      const hostname = window.location.hostname || 'localhost';
      const dynamicOrigin = `${protocol}//${hostname}:3001`;
      const allowedOrigins = [configuredOrigin || dynamicOrigin, `${protocol}//${hostname}:8080`, 'http://127.0.0.1:3001', 'http://127.0.0.1:8080'];
      
      if (!allowedOrigins.includes(event.origin)) {
        console.warn('FlowEditor: Rejected message from unauthorized origin:', event.origin);
        return;
      }

      // Validate message structure
      if (!event.data || typeof event.data !== 'object') {
        console.warn('FlowEditor: Invalid message format received');
        return;
      }

      const { type, data, messageId } = event.data;

      // Log incoming messages for debugging
      console.log('FlowEditor: Received message:', { type, data, messageId, origin: event.origin });

      // Handle different message types with enhanced error handling
      try {
        switch (type) {
          case 'floweditor_ready':
            this.handleFlowEditorReady(data);
            break;
          case 'flow_saved':
            this.handleFlowSaved(data);
            break;
          case 'flow_loaded':
            this.handleFlowLoaded(data);
            break;
          case 'flow_validation_error':
            this.handleFlowValidationError(data);
            break;
          case 'request_auth_refresh':
            this.handleAuthRefreshRequest(data);
            break;
          case 'request_token_refresh':
            this.handleTokenRefreshRequest(data);
            break;
          case 'flow_execution_test':
            this.handleFlowExecutionTest(data);
            break;
          case 'floweditor_error':
            this.handleFlowEditorError(data);
            break;
          case 'floweditor_resize':
            this.handleFlowEditorResize(data);
            break;
          case 'flow_save_error':
            this.handleFlowSaveError(data);
            break;
          default:
            console.warn('FlowEditor: Unknown message type received:', type);
            break;
        }

        // Send acknowledgment if messageId is provided
        if (messageId) {
          this.sendMessageToFlowEditor('message_acknowledged', { messageId });
        }
      } catch (error) {
        console.error('FlowEditor: Error handling message:', error);
        this.$toast.error('An error occurred while processing FlowEditor message');
        
        // Send error acknowledgment
        if (messageId) {
          this.sendMessageToFlowEditor('message_error', { 
            messageId, 
            error: error.message 
          });
        }
      }
    },

    // Enhanced method to send messages to FlowEditor with retry logic
    sendMessageToFlowEditor(type, data = {}, options = {}) {
      const { 
        retry = true, 
        maxRetries = 3, 
        retryDelay = 1000,
        requireAck = false 
      } = options;

      const messageId = this.generateMessageId();
      const message = {
        type,
        data,
        messageId,
        timestamp: Date.now(),
        source: 'chatwoot'
      };

      const sendMessage = (attempt = 1) => {
        if (!this.$refs.flowEditorFrame || !this.$refs.flowEditorFrame.contentWindow) {
          if (attempt <= maxRetries && retry) {
            console.warn(`FlowEditor: Iframe not ready, retrying (${attempt}/${maxRetries})`);
            setTimeout(() => sendMessage(attempt + 1), retryDelay);
            return;
          }
          console.error('FlowEditor: Cannot send message - iframe not available');
          return Promise.reject(new Error('FlowEditor iframe not available'));
        }

        try {
          console.log('FlowEditor: Sending message:', message);
          const configuredOrigin = (window.chatwootConfig && window.chatwootConfig.flowEditorUiBaseUrl) ? window.chatwootConfig.flowEditorUiBaseUrl : '';
          const protocol = window.location.protocol || 'http:';
          const hostname = window.location.hostname || 'localhost';
          const dynamicOrigin = `${protocol}//${hostname}:3001`;
          const targetOrigin = configuredOrigin || dynamicOrigin;
          this.$refs.flowEditorFrame.contentWindow.postMessage(
            message,
            targetOrigin
          );

          if (requireAck) {
            return this.waitForAcknowledgment(messageId);
          }
          
          return Promise.resolve();
        } catch (error) {
          console.error('FlowEditor: Error sending message:', error);
          if (attempt <= maxRetries && retry) {
            setTimeout(() => sendMessage(attempt + 1), retryDelay);
          } else {
            return Promise.reject(error);
          }
        }
      };

      return sendMessage();
    },

    // Generate unique message IDs
    generateMessageId() {
      return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

    // Wait for message acknowledgment
    waitForAcknowledgment(messageId, timeout = 5000) {
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          this.pendingAcks.delete(messageId);
          reject(new Error('Message acknowledgment timeout'));
        }, timeout);

        this.pendingAcks.set(messageId, { resolve, reject, timeoutId });
      });
    },

    // Enhanced message handlers
    handleFlowEditorReady(data) {
      console.log('FlowEditor: FlowEditor is ready, sending context');
      this.sendContextToFlowEditor();
      this.$toast.success('FlowEditor loaded successfully');
    },

    handleFlowSaved(data) {
      console.log('FlowEditor: Flow saved successfully', data);
      this.$toast.success('Flow saved successfully');
      
      // Emit event for parent components
      this.$emit('flow-saved', data);
      
      // Navigate back to flows list if requested
      if (data && data.navigateToList) {
        this.goBack();
      }
    },

    handleFlowLoaded(data) {
      console.log('FlowEditor: Flow loaded successfully', data);
      this.isLoading = false;
    },

    handleFlowValidationError(data) {
      console.error('FlowEditor: Flow validation error', data);
      this.$toast.error(`Flow validation error: ${data.message || 'Unknown error'}`);
    },

    handleAuthRefreshRequest(data) {
      console.log('FlowEditor: Auth refresh requested');
      this.fetchFlowEditorToken().then(() => {
        this.sendMessageToFlowEditor('auth_token_updated', {
          token: this.flowEditorToken,
          accountId: this.accountId
        });
      });
    },

    // Handle token refresh requests from FlowEditor
    handleTokenRefreshRequest(data) {
      console.log('FlowEditor: Token refresh requested by FlowEditor');
      this.refreshFlowEditorToken().then(() => {
        this.sendMessageToFlowEditor('auth_token_updated', {
          token: this.flowEditorToken,
          accountId: this.accountId,
          timestamp: Date.now()
        });
      }).catch(error => {
        console.error('FlowEditor: Failed to refresh token:', error);
        this.sendMessageToFlowEditor('auth_token_error', {
          error: 'Failed to refresh authentication token',
          timestamp: Date.now()
        });
      });
    },

    // New method to refresh token using the refresh endpoint
    async refreshFlowEditorToken() {
      try {
        const response = await axios.post(
          `/api/v1/accounts/${this.accountId}/flow_editor/tokens_refresh`,
          {},
          {
            headers: {
              Authorization: `Bearer ${Auth.getAuthData().access_token}`,
            },
          }
        );

        if (response.data && response.data.token) {
          this.flowEditorToken = response.data.token;
          console.log('FlowEditor: Token refreshed successfully');
          return response.data;
        } else {
          throw new Error('Invalid token response');
        }
      } catch (error) {
        console.error('FlowEditor: Failed to refresh token:', error);
        throw error;
      }
    },

    handleFlowExecutionTest(data) {
      console.log('FlowEditor: Flow execution test requested', data);
      // TODO: Implement flow execution testing
      this.$toast.info('Flow execution test feature coming soon');
    },

    handleFlowEditorError(data) {
      console.error('FlowEditor: Error reported by FlowEditor', data);
      this.$toast.error(`FlowEditor error: ${data.message || 'Unknown error'}`);
    },

    handleFlowEditorResize(data) {
      if (data && data.height) {
        const iframe = this.$refs.flowEditorFrame;
        if (iframe) {
          iframe.style.height = `${data.height}px`;
        }
      }
    },

    handleFlowSaveError(data) {
      console.error('FlowEditor: Flow save error reported', data);
      this.$toast.error(`Flow save failed: ${data.message || data.error || 'Unknown error'}`);
      
      // Emit event for parent components
      this.$emit('flow-save-error', data);
    },

    // Enhanced context sending with better error handling
    sendContextToFlowEditor() {
      if (!this.$refs.flowEditorFrame || !this.$refs.flowEditorFrame.contentWindow) {
        console.warn('FlowEditor: Iframe not ready for context sending');
        return;
      }

      // Create comprehensive context object
      const contextData = {
        dashboardAppContext: {
          account: {
            id: String(this.accountId || ''),
            name: String(this.currentAccount?.name || ''),
          },
          user: {
            id: String(this.currentUser?.id || ''),
            name: String(this.currentUser?.name || ''),
            email: String(this.currentUser?.email || ''),
          },
          flowId: String(this.flowId || ''),
          mode: this.flowId ? 'edit' : 'create',
          accessToken: String(this.flowEditorToken || ''),
        },
        flowEditorConfig: {
          flowId: String(this.flowId || ''),
          flowType: String(this.flowType || 'conversation'),
          accountId: String(this.accountId || ''),
          token: String(this.flowEditorToken || ''),
          apiBaseUrl: String(this.apiBaseUrl || ''),
          endpoints: {
            flows: `${this.apiBaseUrl}/api/v1/accounts/${this.accountId}/flow_editor/flows`,
            saveRevision: `${this.apiBaseUrl}/api/v1/accounts/${this.accountId}/flow_editor/flows`,
            contacts: `${this.apiBaseUrl}/api/v1/accounts/${this.accountId}/contacts`,
            conversations: `${this.apiBaseUrl}/api/v1/accounts/${this.accountId}/conversations`,
            messages: `${this.apiBaseUrl}/api/v1/accounts/${this.accountId}/messages`,
          },
        },
      };

      // Send context with retry logic
      this.sendMessageToFlowEditor('chatwoot_context', contextData, {
        retry: true,
        maxRetries: 3,
        retryDelay: 1000
      }).catch(error => {
        console.error('FlowEditor: Failed to send context after retries:', error);
        this.$toast.error('Failed to initialize FlowEditor. Please refresh the page.');
      });
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

    <!-- Feature Not Enabled State -->
    <div v-if="!isFlowEditorEnabled" class="flex items-center justify-center flex-1">
      <div class="text-center max-w-md">
        <div class="mb-4">
          <svg
            class="w-16 h-16 text-n-slate-8 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        <h3 class="text-lg font-semibold text-n-slate-12 mb-2">
          {{ $t('FLOWS.FEATURE_NOT_ENABLED_TITLE') }}
        </h3>
        <p class="text-n-slate-11 mb-4">
          {{ $t('FLOWS.FEATURE_NOT_ENABLED_MESSAGE') }}
        </p>
        <p class="text-sm text-n-slate-10">
          {{ $t('FLOWS.CONTACT_ADMIN_MESSAGE') }}
        </p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-else-if="isLoading" class="flex items-center justify-center flex-1">
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
