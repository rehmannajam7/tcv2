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
      // Point to local FlowEditor server for development
      const baseUrl = `http://localhost:8000`;

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
    // FlowEditor iframe loaded successfully
    this.setupMessageListener();
  },
  beforeUnmount() {
    window.removeEventListener('message', this.handleMessage);
  },
  methods: {
    setupMessageListener() {
      window.addEventListener('message', this.handleMessage);
    },
    onIframeLoad() {
      // FlowEditor iframe loaded successfully
      this.isLoading = false;
    },
    sendContextToFlowEditor() {
      if (
        this.$refs.flowEditorFrame &&
        this.$refs.flowEditorFrame.contentWindow
      ) {
        // Create proper FlowEditor configuration with endpoints
        const flowEditorConfig = {
          localStorage: true,
          endpoints: {
            // Use FlowEditor's own backend API which will proxy to Chatwoot
            flows: `http://localhost:8000/api/v1/accounts/${this.currentAccount.id}/flow_editor/flows`,
            revisions: `http://localhost:8000/api/v1/accounts/${this.currentAccount.id}/flow_editor/flows`,
            activity: `http://localhost:8000/api/v1/accounts/${this.currentAccount.id}/flow_editor/activity`,
            groups: `http://localhost:8000/api/v1/accounts/${this.currentAccount.id}/flow_editor/groups`,
            contacts: `http://localhost:8000/api/v1/accounts/${this.currentAccount.id}/flow_editor/recipients`,
            recipients: `http://localhost:8000/api/v1/accounts/${this.currentAccount.id}/flow_editor/recipients`,
            fields: `http://localhost:8000/api/v1/accounts/${this.currentAccount.id}/flow_editor/fields`,
            labels: `http://localhost:8000/api/v1/accounts/${this.currentAccount.id}/flow_editor/labels`,
            channels: `http://localhost:8000/api/v1/accounts/${this.currentAccount.id}/flow_editor/channels`,
            languages: `http://localhost:8000/api/v1/accounts/${this.currentAccount.id}/flow_editor/languages`,
            templates: `http://localhost:8000/api/v1/accounts/${this.currentAccount.id}/flow_editor/templates`,
            completion: `http://localhost:8000/api/v1/accounts/${this.currentAccount.id}/flow_editor/completion`,
            resthooks: `http://localhost:8000/api/v1/accounts/${this.currentAccount.id}/flow_editor/resthooks`,
            ticketers: `http://localhost:8000/api/v1/accounts/${this.currentAccount.id}/flow_editor/ticketers`,
            classifiers: `http://localhost:8000/api/v1/accounts/${this.currentAccount.id}/flow_editor/classifiers`,
            editor: `http://localhost:8000/api/v1/accounts/${this.currentAccount.id}/flow_editor/editor`,
            environment: `http://localhost:8000/api/v1/accounts/${this.currentAccount.id}/flow_editor/environment`,
            simulate: `http://localhost:8000/api/v1/accounts/${this.currentAccount.id}/flow_editor/simulate_start`,
            simulate_start: `http://localhost:8000/api/v1/accounts/${this.currentAccount.id}/flow_editor/simulate_start`,
            simulate_resume: `http://localhost:8000/api/v1/accounts/${this.currentAccount.id}/flow_editor/simulate_resume`,
            attachments: `http://localhost:8000/api/v1/accounts/${this.currentAccount.id}/flow_editor/attachments`,
            globals: `http://localhost:8000/api/v1/accounts/${this.currentAccount.id}/flow_editor/globals`,
            brain: `http://localhost:8000/api/v1/accounts/${this.currentAccount.id}/flow_editor/brain`,
            external_services: `http://localhost:8000/api/v1/accounts/${this.currentAccount.id}/flow_editor/external_services`,
            external_services_calls: `http://localhost:8000/api/v1/accounts/${this.currentAccount.id}/flow_editor/external_services_calls`,
            external_services_calls_base: `http://localhost:8000/api/v1/accounts/${this.currentAccount.id}/flow_editor/external_services_calls`,
            whatsapp_products: `http://localhost:8000/api/v1/accounts/${this.currentAccount.id}/flow_editor/whatsapp_products`,
            whatsapp_flows: `http://localhost:8000/api/v1/accounts/${this.currentAccount.id}/flow_editor/whatsapp_flows`,
            knowledgeBases: `http://localhost:8000/api/v1/accounts/${this.currentAccount.id}/flow_editor/knowledge_bases`,
            ticketer_queues: `http://localhost:8000/api/v1/accounts/${this.currentAccount.id}/flow_editor/ticketer_queues`,
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
            expressions: 'https://docs.chatwoot.com/flows/expressions',
          },
          forceSaveOnLoad: false,
          showNewUpdates: true,
        };

        const eventData = {
          event: 'appContext',
          data: {
            ...this.dashboardAppContext,
            flowEditorConfig: flowEditorConfig,
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
      // Only accept messages from the FlowEditor origin
      const allowedOrigins = [
        'http://localhost:8000',
        'https://floweditor.chatwoot.com',
      ];
      if (!allowedOrigins.includes(event.origin)) {
        return;
      }

      let data;
      try {
        data =
          typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      } catch (error) {
        // Failed to parse message data as JSON
        return;
      }

      if (typeof data !== 'object' || data === null) {
        // Invalid message data type
        return;
      }

      // Handle different message types from FlowEditor
      switch (data.type) {
        case 'flow_saved':
          this.handleFlowSaved(data);
          break;
        case 'flow_loaded':
          // Flow loaded successfully in FlowEditor
          break;
        default:
          // Unhandled message from FlowEditor
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
