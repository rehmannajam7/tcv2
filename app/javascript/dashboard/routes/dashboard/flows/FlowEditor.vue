<template>
  <div class="flex flex-col justify-between flex-1 h-full m-0 overflow-auto bg-n-background">
    <!-- Header -->
    <div class="flex items-center justify-between p-4 border-b border-n-weak">
      <div class="flex items-center gap-3">
        <button
          class="p-2 hover:bg-n-alpha-2 rounded-lg"
          @click="goBack"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
          </svg>
        </button>
        <div>
          <h1 class="text-xl font-semibold text-n-slate-12">
            {{ flowId ? 'Edit Flow' : 'Create New Flow' }}
          </h1>
          <p class="text-sm text-n-slate-11">Design your conversation flow</p>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center flex-1">
      <div class="text-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-n-brand mx-auto mb-2"></div>
        <p class="text-n-slate-11">Loading Flow Editor...</p>
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

<script>
import { mapGetters } from 'vuex';
import { useAccount } from 'dashboard/composables/useAccount';

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
    };
  },
  computed: {
    ...mapGetters({
      currentUser: 'getCurrentUser',
    }),
    flowEditorUrl() {
      // Use the HTTPS proxy path instead of direct HTTP IP to avoid Mixed Content error
      // The nginx reverse proxy handles the routing to the actual FlowEditor server
      const baseUrl = `${window.location.origin}/floweditor`;
      
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
        // Add access token for API authentication (FlowEditor expects 'token' parameter)
        if (this.currentUser.access_token) {
          params.append('token', this.currentUser.access_token);
        }
      }
      
      // Add flow ID if editing (FlowEditor expects 'flow' parameter)
      if (this.flowId) {
        params.append('flow', this.flowId);
      }
      
      return `${baseUrl}?${params.toString()}`;
    },
    dashboardAppContext() {
      return {
        account: this.currentAccount,
        user: this.currentUser,
        flowId: this.flowId,
        mode: this.flowId ? 'edit' : 'create',
        // Add access token for API authentication
        accessToken: this.currentUser?.access_token,
      };
    },
  },
  mounted() {
    console.log('FlowEditor mounted, isLoading:', this.isLoading);
    console.log('FlowEditor URL:', this.flowEditorUrl);
    console.log('Current Account:', this.currentAccount);
    console.log('Account ID:', this.accountId);
    console.log('Flow ID from props:', this.flowId);
    window.addEventListener('message', this.handleMessage);
  },
  beforeUnmount() {
    window.removeEventListener('message', this.handleMessage);
  },
  methods: {
    onIframeLoad() {
      console.log('FlowEditor iframe loaded successfully');
      // Send context to the FlowEditor
      this.sendContextToFlowEditor();
      this.isLoading = false;
    },
    sendContextToFlowEditor() {
      if (this.$refs.flowEditorFrame && this.$refs.flowEditorFrame.contentWindow) {
        // Create proper FlowEditor configuration with endpoints
        const flowEditorConfig = {
          localStorage: true,
          endpoints: {
            // Use Chatwoot's API structure
            flows: `/api/v1/accounts/${this.currentAccount.id}/flow_editor/flows`,
            revisions: `/api/v1/accounts/${this.currentAccount.id}/flow_editor/flows`,
            activity: `/api/v1/accounts/${this.currentAccount.id}/flow_editor/activity`,
            groups: `/api/v1/accounts/${this.currentAccount.id}/flow_editor/groups`,
            contacts: `/api/v1/accounts/${this.currentAccount.id}/flow_editor/recipients`,
            recipients: `/api/v1/accounts/${this.currentAccount.id}/flow_editor/recipients`,
            fields: `/api/v1/accounts/${this.currentAccount.id}/flow_editor/fields`,
            labels: `/api/v1/accounts/${this.currentAccount.id}/flow_editor/labels`,
            channels: `/api/v1/accounts/${this.currentAccount.id}/flow_editor/channels`,
            languages: `/api/v1/accounts/${this.currentAccount.id}/flow_editor/languages`,
            templates: `/api/v1/accounts/${this.currentAccount.id}/flow_editor/templates`,
            completion: `/api/v1/accounts/${this.currentAccount.id}/flow_editor/completion`,
            resthooks: `/api/v1/accounts/${this.currentAccount.id}/flow_editor/resthooks`,
            ticketers: `/api/v1/accounts/${this.currentAccount.id}/flow_editor/ticketers`,
            classifiers: `/api/v1/accounts/${this.currentAccount.id}/flow_editor/classifiers`,
            editor: `/api/v1/accounts/${this.currentAccount.id}/flow_editor/editor`,
            environment: `/api/v1/accounts/${this.currentAccount.id}/flow_editor/environment`,
            simulate: `/api/v1/accounts/${this.currentAccount.id}/flow_editor/simulate_start`,
            simulate_start: `/api/v1/accounts/${this.currentAccount.id}/flow_editor/simulate_start`,
            simulate_resume: `/api/v1/accounts/${this.currentAccount.id}/flow_editor/simulate_resume`,
            attachments: `/api/v1/accounts/${this.currentAccount.id}/flow_editor/attachments`,
            globals: `/api/v1/accounts/${this.currentAccount.id}/flow_editor/globals`,
            brain: `/api/v1/accounts/${this.currentAccount.id}/flow_editor/brain`,
            external_services: `/api/v1/accounts/${this.currentAccount.id}/flow_editor/external_services`,
            external_services_calls: `/api/v1/accounts/${this.currentAccount.id}/flow_editor/external_services_calls`,
            external_services_calls_base: `/api/v1/accounts/${this.currentAccount.id}/flow_editor/external_services_calls`,
            whatsapp_products: `/api/v1/accounts/${this.currentAccount.id}/flow_editor/whatsapp_products`,
            whatsapp_flows: `/api/v1/accounts/${this.currentAccount.id}/flow_editor/whatsapp_flows`,
            knowledgeBases: `/api/v1/accounts/${this.currentAccount.id}/flow_editor/knowledge_bases`,
            ticketer_queues: `/api/v1/accounts/${this.currentAccount.id}/flow_editor/ticketer_queues`
          },
          flow: this.flowId || 'new',
          flowType: 'messaging',
          showTemplates: true,
          showDownload: true,
          mutable: true,
          debug: process.env.NODE_ENV === 'development',
          brand: 'Chatwoot',
          accountId: this.currentAccount.id,
          token: this.currentUser?.access_token,
          httpTimeout: 10000,
          help: {
            flows: 'https://docs.chatwoot.com/flows',
            actions: 'https://docs.chatwoot.com/flows/actions',
            expressions: 'https://docs.chatwoot.com/flows/expressions'
          },
          forceSaveOnLoad: false,
          showNewUpdates: true
        };

        const eventData = {
          event: 'appContext',
          data: {
            ...this.dashboardAppContext,
            flowEditorConfig: flowEditorConfig
          },
        };
        
        // Use the same origin for postMessage communication (HTTPS)
        let targetOrigin = window.location.origin;
        
        this.$refs.flowEditorFrame.contentWindow.postMessage(
          JSON.stringify(eventData),
          targetOrigin
        );
      }
    },
    handleMessage(event) {
      // Use the same origin for message validation (HTTPS)
      const allowedOrigin = window.location.origin;
      
      // Handle messages from FlowEditor - only allow from correct origin
      if (event.origin !== allowedOrigin) return;
      
      try {
        let data;
        
        // Handle both string and object data
        if (typeof event.data === 'string') {
          try {
            data = JSON.parse(event.data);
          } catch (parseError) {
            console.warn('Failed to parse message data as JSON:', event.data);
            return;
          }
        } else if (typeof event.data === 'object' && event.data !== null) {
          data = event.data;
        } else {
          console.warn('Invalid message data type:', typeof event.data);
          return;
        }
        
        switch (data.event || data.type) {
          case 'flowSaved':
            this.handleFlowSaved(data.data);
            break;
          case 'requestContext':
            this.sendContextToFlowEditor();
            break;
          case 'navigateBack':
            this.goBack();
            break;
          default:
            console.log('Unhandled message from FlowEditor:', data);
        }
      } catch (error) {
        console.error('Error handling message from FlowEditor:', error);
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
        params: { accountId: this.accountId }
      });
    },
  },
};
</script>