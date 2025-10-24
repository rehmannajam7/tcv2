<template>
  <div class="flex flex-col justify-between flex-1 h-full m-0 overflow-auto bg-n-background px-6">
    <!-- Header -->
    <div class="flex items-center justify-between p-6 border-b border-n-weak">
      <div>
        <h1 class="text-xl font-medium text-n-slate-12">{{ $t('FLOWS.HEADER') }}</h1>
        <p class="text-sm text-n-slate-11 mt-1">{{ $t('FLOWS.DESCRIPTION') }}</p>
      </div>
      <button
        class="flex items-center gap-2 px-4 py-2 bg-n-brand text-white rounded-lg hover:bg-n-brand-hover transition-colors"
        @click="createNewFlow"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
        </svg>
        {{ $t('FLOWS.CREATE.BUTTON') }}
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-12">
        <div class="text-center">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-woot-500 mx-auto mb-4"></div>
          <p class="text-n-slate-11">{{ $t('FLOWS.LOADING') }}</p>
        </div>
      </div>

    <!-- Empty State -->
    <div v-else-if="flows.length === 0" class="flex items-center justify-center py-16">
      <div class="text-center">
        <div class="w-16 h-16 mx-auto mb-4 text-n-slate-8">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
        </div>
        <h3 class="text-lg font-medium text-n-slate-12 mb-2">{{ $t('FLOWS.EMPTY_STATE.TITLE') }}</h3>
        <p class="text-n-slate-11 mb-4">{{ $t('FLOWS.EMPTY_STATE.MESSAGE') }}</p>
        <button
          @click="createNewFlow"
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-woot-500 hover:bg-woot-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-woot-500"
        >
          {{ $t('FLOWS.EMPTY_STATE.CREATE_BUTTON') }}
        </button>
      </div>
    </div>

    <!-- Flows Grid -->
    <div v-else class="flex-1 p-6">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="flow in flows"
          :key="flow.id"
          class="bg-white border border-n-weak rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer group"
          @click="navigateToFlowEditor(flow.id)"
        >
          <!-- Flow Header -->
          <div class="flex items-start justify-between mb-4">
            <div class="flex-1">
              <h3 class="text-lg font-medium text-n-slate-12 group-hover:text-n-brand transition-colors">
                {{ flow.name }}
              </h3>
              <p v-if="flow.description" class="text-sm text-n-slate-11 mt-1 line-clamp-2">
                {{ flow.description }}
              </p>
            </div>
            <div class="flex items-center gap-2 ml-4">
              <button
                class="p-2 text-n-slate-8 hover:text-n-slate-12 hover:bg-n-alpha-2 rounded-lg transition-colors"
                @click.stop="editFlow(flow.id)"
                :title="$t('FLOWS.LIST.ACTIONS.EDIT')"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
              </button>
              <button
                class="p-2 text-n-slate-8 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                @click.stop="confirmDeleteFlow(flow)"
                :title="$t('FLOWS.LIST.ACTIONS.DELETE')"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
              </button>
            </div>
          </div>

          <!-- Flow Metadata -->
          <div class="flex items-center justify-between text-xs text-n-slate-10 mb-2">
            <span>Created {{ formatDate(flow.created_at) }}</span>
            <span v-if="flow.updated_at !== flow.created_at">
              Updated {{ formatDate(flow.updated_at) }}
            </span>
          </div>

          <!-- Flow Type and Keyword -->
          <div class="flex items-center gap-4 mb-3">
            <div class="flex items-center gap-1">
              <span class="text-xs font-medium text-n-slate-12">Type:</span>
              <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {{ flow.flow_type || 'conversation' }}
              </span>
            </div>
            <div v-if="flow.trigger_keyword" class="flex items-center gap-1">
              <span class="text-xs font-medium text-n-slate-12">Keyword:</span>
              <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                {{ flow.trigger_keyword }}
              </span>
            </div>
          </div>

          <!-- Flow Status Indicator -->
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 bg-green-500 rounded-full"></div>
            <span class="text-xs text-n-slate-11">Active</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div
      v-if="showDeleteModal"
      class="modal-mask skip-context-menu"
      @click="cancelDelete"
    >
      <div
        class="bg-white rounded-lg p-6 max-w-md w-full mx-4"
        @click.stop
      >
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
            </svg>
          </div>
          <div>
            <h3 class="text-lg font-medium text-n-slate-12">{{ $t('FLOWS.DELETE.CONFIRM_TITLE') }}</h3>
            <p class="text-sm text-n-slate-11">{{ $t('FLOWS.DELETE.CONFIRM_MESSAGE') }}</p>
          </div>
        </div>
        
        <p class="text-n-slate-11 mb-6">
          Are you sure you want to delete "<strong>{{ flowToDelete?.name }}</strong>"?
        </p>
        
        <div class="flex gap-3 justify-end">
          <button
            class="px-4 py-2 text-n-slate-11 hover:text-n-slate-12 transition-colors"
            @click="cancelDelete"
          >
            {{ $t('FLOWS.DELETE.CONFIRM_NO') }}
          </button>
          <button
            class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            @click="deleteFlow"
            :disabled="isDeleting"
          >
            <span v-if="isDeleting">Deleting...</span>
            <span v-else>{{ $t('FLOWS.DELETE.CONFIRM_YES') }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Flow Create Modal -->
    <FlowCreateModal
      :show="showCreateModal"
      @close="closeCreateModal"
      @flow-created="onFlowCreated"
    />
  </div>
</template>

<script>
import { mapGetters } from 'vuex';
import { useAccount } from 'dashboard/composables/useAccount';
import FlowsAPI from 'dashboard/api/flows';
import FlowCreateModal from './FlowCreateModal.vue';

export default {
  name: 'FlowsList',
  components: {
    FlowCreateModal,
  },
  setup() {
    const { accountId } = useAccount();
    return {
      accountId,
    };
  },
  data() {
    return {
      flows: [],
      isLoading: true,
      showDeleteModal: false,
      showCreateModal: false,
      flowToDelete: null,
      isDeleting: false,
    };
  },
  computed: {
    ...mapGetters({
      currentUser: 'getCurrentUser',
    }),
  },
  async mounted() {
    // Wait for authentication to be established before loading flows
    await this.waitForAuthentication();
    await this.loadFlows();
  },
  methods: {
    async waitForAuthentication() {
      // Wait for authentication to be established
      return new Promise((resolve) => {
        const checkAuth = () => {
          if (this.$store.getters.isLoggedIn && this.$store.getters.getCurrentUser.id) {
            resolve();
          } else {
            // If not authenticated after a reasonable time, redirect to login
            setTimeout(() => {
              if (!this.$store.getters.isLoggedIn) {
                window.location.assign('/app/login');
              } else {
                checkAuth();
              }
            }, 100);
          }
        };
        checkAuth();
      });
    },
    async loadFlows() {
      try {
        this.isLoading = true;
        const response = await FlowsAPI.getFlows();
        this.flows = response.data || [];
      } catch (error) {
        // Error loading flows
        this.isLoading = false;
      }
    },
    createNewFlow() {
      this.showCreateModal = true;
    },
    navigateToFlowEditor(flowId = null) {
      // Navigate to flow editor with flowId
      this.$router.push({
        name: 'flow_editor',
        params: { 
          accountId: this.accountId, 
          flowId: flowId || undefined 
        },
      });
    },
    confirmDeleteFlow(flow) {
      this.flowToDelete = flow;
      this.showDeleteModal = true;
    },
    cancelDelete() {
      this.showDeleteModal = false;
      this.flowToDelete = null;
      this.isDeleting = false;
    },
    async deleteFlow() {
      if (!this.flowToDelete) return;
      
      try {
        this.isDeleting = true;
        await FlowsAPI.deleteFlow(this.flowToDelete.id);
        
        // Remove from local list
        this.flows = this.flows.filter(flow => flow.id !== this.flowToDelete.id);
        
        this.$toast.success('Flow deleted successfully');
      } catch (error) {
        // Error deleting flow
        this.$toast.error('Failed to delete flow');
      } finally {
        // Always reset the modal state regardless of success or failure
        this.cancelDelete();
      }
    },
    formatDate(dateString) {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now - date);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        return 'today';
      } else if (diffDays <= 7) {
        return `${diffDays} days ago`;
      } else {
        return date.toLocaleDateString();
      }
    },
    closeCreateModal() {
      this.showCreateModal = false;
    },
    onFlowCreated(newFlow) {
      // Add the new flow to the list
      this.flows.unshift(newFlow);
      
      // Navigate to the flow editor to edit the new flow
      this.$router.push({
        name: 'flow_editor',
        params: { 
          accountId: this.accountId,
          flowId: newFlow.id
        }
      });
    },
  },
};
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>