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
      keywords: [], // Current keywords for synchronization
      lastKeywordsSync: null, // Timestamp of last successful keywords sync
      syncInProgress: false,
      syncStatus: 'idle', // 'idle', 'syncing', 'success', 'error'
      syncError: null,
      syncLastUpdate: null,
      showSyncIndicator: true, // Flag to prevent concurrent sync operations
      allowedOrigins: [], // Whitelist of allowed origins for postMessage
      messageRateLimit: new Map(), // Track message rates for DoS protection
      maxMessagesPerSecond: 10, // Rate limiting threshold
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
    apiBaseUrl() {
      // Use the same base URL as the main application
      const { hostURL } = window.chatwootConfig || {};
      return hostURL || `${window.location.protocol}//${window.location.host}`;
    },
    flowEditorUrl() {
      // Determine FlowEditor UI base dynamically
      const configuredBase =
        window.chatwootConfig && window.chatwootConfig.flowEditorUiBaseUrl
          ? window.chatwootConfig.flowEditorUiBaseUrl
          : '';
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
    // Configure security settings
    this.configureSecurity();

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
    extractOrigin(url) {
      try {
        return new URL(url).origin;
      } catch {
        return url;
      }
    },
    handleMessage(event) {
      const configuredUrl =
        window.chatwootConfig && window.chatwootConfig.flowEditorUiBaseUrl
          ? window.chatwootConfig.flowEditorUiBaseUrl
          : '';
      const protocol = window.location.protocol || 'http:';
      const hostname = window.location.hostname || 'localhost';
      const dynamicOrigin = `${protocol}//${hostname}:3001`;
      const sameOrigin = `${protocol}//${hostname}`;
      const allowedOrigins = [
        this.extractOrigin(configuredUrl) || dynamicOrigin,
        sameOrigin,
        `${protocol}//${hostname}:8080`,
        'http://127.0.0.1:3001',
        'http://127.0.0.1:8080',
      ];

      if (!allowedOrigins.includes(event.origin)) {
        console.warn(
          'FlowEditor: Rejected message from unauthorized origin:',
          event.origin
        );
        return;
      }

      // Validate message structure
      if (!event.data || typeof event.data !== 'object') {
        console.warn('FlowEditor: Invalid message format received');
        return;
      }

      const { type, data, messageId } = event.data;

      // Log incoming messages for debugging
      console.log('FlowEditor: Received message:', {
        type,
        data,
        messageId,
        origin: event.origin,
      });

      // Enhanced message validation
      const validation = this.validateMessage({ type, data, messageId });
      if (!validation.valid) {
        console.warn(
          'FlowEditor: Message validation failed:',
          validation.error
        );
        this.sendMessageToFlowEditor('message_validation_error', {
          error: validation.error,
          originalMessage: { type, data, messageId },
          timestamp: Date.now(),
        });
        return;
      }

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
          case 'keywords_updated':
            this.handleKeywordsUpdated(data);
            break;
          case 'keyword_added':
            this.handleKeywordAdded(data);
            break;
          case 'keyword_removed':
            this.handleKeywordRemoved(data);
            break;
          case 'keyword_validation_error':
            this.handleKeywordValidationError(data);
            break;
          case 'keywords_modal_ready':
            this.handleKeywordsModalReady(data);
            break;
          case 'keywords_saved':
            this.handleKeywordsSaved(data);
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
        this.$toast.error(
          'An error occurred while processing FlowEditor message'
        );

        // Send error acknowledgment
        if (messageId) {
          this.sendMessageToFlowEditor('message_error', {
            messageId,
            error: error.message,
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
        requireAck = false,
      } = options;

      const messageId = this.generateMessageId();
      const message = {
        type,
        data,
        messageId,
        timestamp: Date.now(),
        source: 'chatwoot',
      };

      const sendMessage = (attempt = 1) => {
        if (
          !this.$refs.flowEditorFrame ||
          !this.$refs.flowEditorFrame.contentWindow
        ) {
          if (attempt <= maxRetries && retry) {
            console.warn(
              `FlowEditor: Iframe not ready, retrying (${attempt}/${maxRetries})`
            );
            setTimeout(() => sendMessage(attempt + 1), retryDelay);
            return;
          }
          console.error(
            'FlowEditor: Cannot send message - iframe not available'
          );
          return Promise.reject(new Error('FlowEditor iframe not available'));
        }

        try {
          console.log('FlowEditor: Sending message:', message);
          const configuredUrl =
            window.chatwootConfig && window.chatwootConfig.flowEditorUiBaseUrl
              ? window.chatwootConfig.flowEditorUiBaseUrl
              : '';
          const protocol = window.location.protocol || 'http:';
          const hostname = window.location.hostname || 'localhost';
          const dynamicOrigin = `${protocol}//${hostname}:3001`;
          const targetOrigin = this.extractOrigin(configuredUrl) || dynamicOrigin;
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
      try {
        this.sendContextToFlowEditor();
        if (this.$toast && typeof this.$toast.success === 'function') {
          this.$toast.success('FlowEditor loaded successfully');
        }
      } catch (e) {
        console.error('FlowEditor: Error in ready handler', e);
      }
    },

    handleFlowSaved(data) {
      console.log('FlowEditor: Flow saved successfully', data);
      if (this.$toast && typeof this.$toast.success === 'function') {
        this.$toast.success('Flow saved successfully');
      }

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
      if (this.$toast && typeof this.$toast.error === 'function') {
        this.$toast.error(
          `Flow validation error: ${data?.message || 'Unknown error'}`
        );
      }
    },

    handleAuthRefreshRequest(data) {
      console.log('FlowEditor: Auth refresh requested');
      this.fetchFlowEditorToken().then(() => {
        this.sendMessageToFlowEditor('auth_token_updated', {
          token: this.flowEditorToken,
          accountId: this.accountId,
        });
      });
    },

    // Handle token refresh requests from FlowEditor
    handleTokenRefreshRequest(data) {
      console.log('FlowEditor: Token refresh requested by FlowEditor');
      this.refreshFlowEditorToken()
        .then(() => {
          this.sendMessageToFlowEditor('auth_token_updated', {
            token: this.flowEditorToken,
            accountId: this.accountId,
            timestamp: Date.now(),
          });
        })
        .catch(error => {
          console.error('FlowEditor: Failed to refresh token:', error);
          this.sendMessageToFlowEditor('auth_token_error', {
            error: 'Failed to refresh authentication token',
            timestamp: Date.now(),
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
        }
        throw new Error('Invalid token response');
      } catch (error) {
        console.error('FlowEditor: Failed to refresh token:', error);
        throw error;
      }
    },

    // Keyword synchronization utility methods
    detectKeywordChanges(oldKeywords, newKeywords) {
      // Deep comparison of keyword arrays
      if (oldKeywords.length !== newKeywords.length) {
        return true;
      }

      const oldSet = new Set(
        oldKeywords.map(k =>
          typeof k === 'string'
            ? k.trim().toLowerCase()
            : String(k).trim().toLowerCase()
        )
      );
      const newSet = new Set(
        newKeywords.map(k =>
          typeof k === 'string'
            ? k.trim().toLowerCase()
            : String(k).trim().toLowerCase()
        )
      );

      if (oldSet.size !== newSet.size) {
        return true;
      }

      for (const keyword of oldSet) {
        if (!newSet.has(keyword)) {
          return true;
        }
      }

      return false;
    },

    validateKeywords(keywords) {
      // Validate keyword data structure and content
      if (!Array.isArray(keywords)) {
        return { valid: false, error: 'Keywords must be an array' };
      }

      const normalizedKeywords = [];
      const seen = new Set();

      for (let i = 0; i < keywords.length; i++) {
        const keyword = keywords[i];

        if (typeof keyword !== 'string') {
          return {
            valid: false,
            error: `Keyword at index ${i} must be a string`,
          };
        }

        const trimmed = keyword.trim();
        if (trimmed.length === 0) {
          return {
            valid: false,
            error: `Keyword at index ${i} cannot be empty`,
          };
        }

        if (seen.has(trimmed.toLowerCase())) {
          return {
            valid: false,
            error: `Duplicate keyword detected: "${trimmed}"`,
          };
        }

        seen.add(trimmed.toLowerCase());
        normalizedKeywords.push(trimmed);
      }

      return { valid: true, keywords: normalizedKeywords };
    },

    getSyncStatus() {
      // Return current synchronization status
      return {
        synced: this.lastKeywordsSync !== null,
        lastSync: this.lastKeywordsSync,
        keywordsCount: this.keywords.length,
        syncInProgress: this.syncInProgress,
        hasKeywords: this.keywords.length > 0,
        syncStatus: this.syncStatus,
        syncError: this.syncError,
        syncLastUpdate: this.syncLastUpdate,
      };
    },

    syncIndicatorClass() {
      // Return CSS class for sync indicator based on status
      return {
        'sync-indicator': true,
        'sync-indicator--idle': this.syncStatus === 'idle',
        'sync-indicator--syncing': this.syncStatus === 'syncing',
        'sync-indicator--success': this.syncStatus === 'success',
        'sync-indicator--error': this.syncStatus === 'error',
      };
    },

    syncStatusText() {
      // Return human-readable sync status text
      switch (this.syncStatus) {
        case 'syncing':
          return 'Synchronizing...';
        case 'success':
          return 'Synchronized';
        case 'error':
          return `Sync failed: ${this.syncError}`;
        default:
          return 'Ready';
      }
    },

    resetKeywords() {
      // Reset keywords state
      this.keywords = [];
      this.lastKeywordsSync = null;
      this.syncInProgress = false;
    },

    updateSyncStatus(status, error = null) {
      // Update synchronization status with visual feedback
      this.syncStatus = status;
      this.syncError = error;
      this.syncLastUpdate = Date.now();

      // Auto-reset success status after 3 seconds
      if (status === 'success') {
        setTimeout(() => {
          if (this.syncStatus === 'success') {
            this.syncStatus = 'idle';
          }
        }, 3000);
      }

      // Emit sync status event for parent components
      this.$emit('sync-status-changed', {
        status: this.syncStatus,
        error: this.syncError,
        timestamp: this.syncLastUpdate,
        keywords: this.keywords,
      });

      console.log(
        `FlowEditor: Sync status updated to ${status}`,
        error ? `Error: ${error}` : ''
      );
    },

    configureSecurity() {
      // Configure security settings from environment or config
      try {
        // Get allowed origins from environment or use defaults
        const envOrigins = process.env.VUE_APP_FLOWEDITOR_ALLOWED_ORIGINS;
        if (envOrigins) {
          this.allowedOrigins = envOrigins
            .split(',')
            .map(origin => origin.trim());
        }

        // Get rate limit settings from environment
        const envRateLimit = process.env.VUE_APP_FLOWEDITOR_RATE_LIMIT;
        if (envRateLimit && !isNaN(parseInt(envRateLimit))) {
          this.maxMessagesPerSecond = parseInt(envRateLimit);
        }

        console.log('FlowEditor: Security configured with', {
          allowedOrigins:
            this.allowedOrigins.length > 0
              ? this.allowedOrigins
              : 'default validation',
          maxMessagesPerSecond: this.maxMessagesPerSecond,
        });
      } catch (error) {
        console.warn('FlowEditor: Error configuring security settings:', error);
      }
    },

    // Security utility methods
    isAllowedOrigin(origin) {
      // Enhanced origin validation
      if (!origin || typeof origin !== 'string') {
        return false;
      }

      // If no allowed origins configured, use default validation
      if (this.allowedOrigins.length === 0) {
        return this.isDefaultAllowedOrigin(origin);
      }

      return this.allowedOrigins.includes(origin);
    },

    isDefaultAllowedOrigin(origin) {
      // Default origin validation based on flow editor URL
      try {
        const flowEditorOrigin = new URL(this.flowEditorUrl).origin;
        const messageOrigin = new URL(origin).origin;
        return flowEditorOrigin === messageOrigin;
      } catch (error) {
        console.warn('Error validating origin:', error);
        return false;
      }
    },

    checkRateLimit(messageType) {
      // Rate limiting to prevent DoS attacks
      const now = Date.now();
      const windowStart = now - 1000; // 1 second window

      if (!this.messageRateLimit.has(messageType)) {
        this.messageRateLimit.set(messageType, []);
      }

      const timestamps = this.messageRateLimit.get(messageType);

      // Remove old timestamps outside the window
      const validTimestamps = timestamps.filter(
        timestamp => timestamp > windowStart
      );

      // Check if rate limit exceeded
      if (validTimestamps.length >= this.maxMessagesPerSecond) {
        console.warn(`Rate limit exceeded for message type: ${messageType}`);
        return false;
      }

      // Add current timestamp
      validTimestamps.push(now);
      this.messageRateLimit.set(messageType, validTimestamps);

      return true;
    },

    validateMessage(message) {
      // Enhanced message validation
      if (!message || typeof message !== 'object') {
        return { valid: false, error: 'Message must be an object' };
      }

      if (!message.type || typeof message.type !== 'string') {
        return { valid: false, error: 'Message must have a valid type' };
      }

      // Check rate limiting
      if (!this.checkRateLimit(message.type)) {
        return { valid: false, error: 'Rate limit exceeded' };
      }

      // Validate message content based on type
      switch (message.type) {
        case 'keywords_updated':
        case 'keyword_added':
        case 'keyword_removed':
          if (!Array.isArray(message.keywords)) {
            return { valid: false, error: 'Keywords must be an array' };
          }
          break;

        case 'flow_saved':
        case 'flow_loaded':
          if (!message.flowId || typeof message.flowId !== 'string') {
            return { valid: false, error: 'Flow ID must be a string' };
          }
          break;
      }

      return { valid: true };
    },

    handleFlowExecutionTest(data) {
      console.log('FlowEditor: Flow execution test requested', data);
      // TODO: Implement flow execution testing
      this.$toast.info('Flow execution test feature coming soon');
    },

    handleFlowEditorError(data) {
      console.error('FlowEditor: Error reported by FlowEditor', data);
      if (this.$toast && typeof this.$toast.error === 'function') {
        this.$toast.error(
          `FlowEditor error: ${data?.message || 'Unknown error'}`
        );
      }
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
      if (this.$toast && typeof this.$toast.error === 'function') {
        this.$toast.error(
          `Flow save failed: ${data?.message || data?.error || 'Unknown error'}`
        );
      }

      // Emit event for parent components
      this.$emit('flow-save-error', data);
    },

    // Keyword synchronization handlers
    handleKeywordsUpdated(data) {
      console.log('FlowEditor: Keywords updated', data);
      this.updateSyncStatus('syncing');
      const { keywords = [] } = data;

      // Validate keywords data
      if (!Array.isArray(keywords)) {
        console.error('FlowEditor: Invalid keywords data received', data);
        this.updateSyncStatus('error', 'Invalid keywords format');
        this.sendMessageToFlowEditor('keyword_validation_error', {
          error: 'Invalid keywords format',
          expected: 'array',
          received: typeof keywords,
        });
        return;
      }

      // Check for actual changes to avoid unnecessary updates
      const hasChanges = this.detectKeywordChanges(this.keywords, keywords);
      if (!hasChanges) {
        console.log('No keyword changes detected, skipping update');
        this.updateSyncStatus('success');
        return;
      }

      // Update local state
      this.keywords = [...keywords];
      this.lastKeywordsSync = Date.now();

      // Update sync status to success
      this.updateSyncStatus('success');

      // Emit event for parent components
      this.$emit('keywords-updated', { keywords });

      // Send acknowledgment back to iframe
      this.sendMessageToFlowEditor('keywords_sync_acknowledged', {
        keywords,
        timestamp: this.lastKeywordsSync,
      });
    },

    handleKeywordAdded(data) {
      console.log('FlowEditor: Keyword added', data);
      const { keyword } = data;

      // Validate keyword data
      if (!keyword || typeof keyword !== 'string') {
        console.error('FlowEditor: Invalid keyword data received', data);
        this.sendMessageToFlowEditor('keyword_validation_error', {
          error: 'Invalid keyword format',
          expected: 'string',
          received: typeof keyword,
        });
        return;
      }

      // Emit event for parent components
      this.$emit('keyword-added', { keyword });

      // Send acknowledgment back to iframe
      this.sendMessageToFlowEditor('keyword_add_acknowledged', {
        keyword,
        timestamp: Date.now(),
      });
    },

    handleKeywordRemoved(data) {
      console.log('FlowEditor: Keyword removed', data);
      const { keyword } = data;

      // Validate keyword data
      if (!keyword || typeof keyword !== 'string') {
        console.error('FlowEditor: Invalid keyword data received', data);
        this.sendMessageToFlowEditor('keyword_validation_error', {
          error: 'Invalid keyword format',
          expected: 'string',
          received: typeof keyword,
        });
        return;
      }

      // Emit event for parent components
      this.$emit('keyword-removed', { keyword });

      // Send acknowledgment back to iframe
      this.sendMessageToFlowEditor('keyword_remove_acknowledged', {
        keyword,
        timestamp: Date.now(),
      });
    },

    handleKeywordValidationError(data) {
      console.error('FlowEditor: Keyword validation error', data);
      if (this.$toast && typeof this.$toast.error === 'function') {
        this.$toast.error(
          `Keyword validation error: ${data?.error || 'Unknown error'}`
        );
      }

      // Emit event for parent components
      this.$emit('keyword-validation-error', data);
    },

    handleKeywordsModalReady(data) {
      // Handle keywords modal ready event
      console.log('Keywords modal is ready:', data);

      // Send current keywords to modal if available
      if (this.keywords.length > 0) {
        this.sendMessageToFlowEditor('keywords_update', {
          keywords: this.keywords,
          timestamp: Date.now(),
        });
      }

      this.$emit('keywords-modal-ready', {
        keywords: this.keywords,
        timestamp: Date.now(),
      });
    },

    handleKeywordsSaved(data) {
      // Handle keywords saved event
      console.log('Keywords saved in modal:', data);

      // Update local state
      if (data.keywords && Array.isArray(data.keywords)) {
        this.keywords = [...data.keywords];
        this.lastKeywordsSync = Date.now();
      }

      // Emit saved event
      this.$emit('keywords-saved', {
        keywords: this.keywords,
        timestamp: this.lastKeywordsSync,
      });
    },

    // Method to send keyword updates to iframe
    sendKeywordsUpdate(keywords) {
      console.log('FlowEditor: Sending keywords update', keywords);

      // Validate keywords before sending
      if (!Array.isArray(keywords)) {
        console.error(
          'FlowEditor: Cannot send invalid keywords format',
          keywords
        );
        return Promise.reject(new Error('Invalid keywords format'));
      }

      // Filter out empty strings and normalize
      const normalizedKeywords = keywords
        .filter(k => k && typeof k === 'string')
        .map(k => k.trim().toLowerCase())
        .filter(k => k.length > 0);

      return this.sendMessageToFlowEditor(
        'keywords_update',
        {
          keywords: normalizedKeywords,
          timestamp: Date.now(),
        },
        {
          requireAck: true,
          maxRetries: 3,
          retryDelay: 500,
        }
      ).catch(error => {
        console.error('FlowEditor: Failed to send keywords update:', error);
        if (this.$toast && typeof this.$toast.error === 'function') {
          this.$toast.error('Failed to synchronize keywords with FlowEditor');
        }
        throw error;
      });
    },

    // Method to request keywords from iframe
    requestKeywords() {
      console.log('FlowEditor: Requesting keywords from iframe');

      return this.sendMessageToFlowEditor(
        'request_keywords',
        {
          timestamp: Date.now(),
        },
        {
          requireAck: true,
          maxRetries: 2,
          retryDelay: 300,
        }
      ).catch(error => {
        console.error('FlowEditor: Failed to request keywords:', error);
        throw error;
      });
    },

    // Enhanced context sending with better error handling
    sendContextToFlowEditor() {
      if (
        !this.$refs.flowEditorFrame ||
        !this.$refs.flowEditorFrame.contentWindow
      ) {
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
            custom_attribute_definitions: `${this.apiBaseUrl}/api/v1/accounts/${this.accountId}/flow_editor/fields`,
            groups: `${this.apiBaseUrl}/api/v1/accounts/${this.accountId}/flow_editor/groups`,
          },
        },
      };

      // Send context with retry logic
      this.sendMessageToFlowEditor('chatwoot_context', contextData, {
        retry: true,
        maxRetries: 3,
        retryDelay: 1000,
      }).catch(error => {
        console.error(
          'FlowEditor: Failed to send context after retries:',
          error
        );
        if (this.$toast && typeof this.$toast.error === 'function') {
          this.$toast.error(
            'Failed to initialize FlowEditor. Please refresh the page.'
          );
        }
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

      <!-- Sync Status Indicator -->
      <div v-if="showSyncIndicator" class="flex items-center gap-2">
        <div
          :class="syncIndicatorClass"
          class="flex items-center gap-2 px-3 py-1 rounded-full text-sm"
        >
          <div class="sync-indicator__icon">
            <svg
              v-if="syncStatus === 'syncing'"
              class="animate-spin h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              />
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <svg
              v-else-if="syncStatus === 'success'"
              class="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
            <svg
              v-else-if="syncStatus === 'error'"
              class="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <div v-else class="h-4 w-4 rounded-full bg-current opacity-50" />
          </div>
          <span class="sync-indicator__text">{{ syncStatusText }}</span>
        </div>
      </div>
    </div>

    <!-- Feature Not Enabled State -->
    <div
      v-if="!isFlowEditorEnabled"
      class="flex items-center justify-center flex-1"
    >
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

<style scoped>
.sync-indicator {
  transition: all 0.3s ease;
  font-size: 0.875rem;
  font-weight: 500;
}

.sync-indicator--idle {
  background-color: rgba(107, 114, 128, 0.1);
  color: rgb(107, 114, 128);
}

.sync-indicator--syncing {
  background-color: rgba(59, 130, 246, 0.1);
  color: rgb(59, 130, 246);
  animation: pulse 1.5s infinite;
}

.sync-indicator--success {
  background-color: rgba(34, 197, 94, 0.1);
  color: rgb(34, 197, 94);
}

.sync-indicator--error {
  background-color: rgba(239, 68, 68, 0.1);
  color: rgb(239, 68, 68);
}

.sync-indicator__icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.sync-indicator__text {
  font-size: 0.75rem;
  font-weight: 500;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>
