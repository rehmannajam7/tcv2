<script>
import { useAlert } from 'dashboard/composables';
import FlowsAPI from '../../../api/flows';
import InboxesAPI from '../../../api/inboxes';
import TagMultiSelectComboBox from 'dashboard/components-next/combobox/TagMultiSelectComboBox.vue';

export default {
  name: 'FlowCreateModal',
  components: {
    TagMultiSelectComboBox,
  },
  props: {
    show: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['close', 'flowCreated'],
  data() {
    return {
      formData: {
        name: '',
        type: '',
        status: 'active',
        triggerType: 'manual',
        triggerKeyword: '',
      },
      selectedInboxes: [],
      errors: {},
      isCreating: false,
      availableInboxes: [],
      isLoadingInboxes: false,
    };
  },
  computed: {
    isFormValid() {
      return this.formData.name.trim() && this.formData.type;
    },
    inboxOptions() {
      return this.availableInboxes.map(inbox => ({
        value: inbox.id,
        label: `${inbox.name} (${inbox.channel_type})`,
      }));
    },
  },
  watch: {
    show(newVal) {
      if (newVal) {
        this.resetForm();
        this.loadInboxes();
      }
    },
  },
  methods: {
    closeModal() {
      this.$emit('close');
    },
    resetForm() {
      this.formData = {
        name: '',
        type: '',
        status: 'active',
        triggerType: 'manual',
        triggerKeyword: '',
      };
      this.selectedInboxes = [];
      this.errors = {};
      this.isCreating = false;
    },
    async loadInboxes() {
      this.isLoadingInboxes = true;
      try {
        const response = await InboxesAPI.get();
        // Handle different response structures
        if (response.data && Array.isArray(response.data)) {
          this.availableInboxes = response.data;
        } else if (
          response.data &&
          response.data.payload &&
          Array.isArray(response.data.payload)
        ) {
          this.availableInboxes = response.data.payload;
        } else if (Array.isArray(response)) {
          this.availableInboxes = response;
        } else {
          this.availableInboxes = [];
        }
      } catch (error) {
        // Silent fail - availableInboxes will remain empty
        this.availableInboxes = [];
      } finally {
        this.isLoadingInboxes = false;
      }
    },
    onTriggerTypeChange() {
      // Clear trigger keyword when switching to manual
      if (this.formData.triggerType === 'manual') {
        this.formData.triggerKeyword = '';
      }
    },
    validateForm() {
      this.errors = {};

      if (!this.formData.name.trim()) {
        this.errors.name = this.$t(
          'FLOWS.CREATE_MODAL.VALIDATION.NAME_REQUIRED'
        );
      }

      if (!this.formData.type) {
        this.errors.type = this.$t(
          'FLOWS.CREATE_MODAL.VALIDATION.TYPE_REQUIRED'
        );
      }

      if (!this.formData.triggerType) {
        this.errors.triggerType = 'Trigger type is required';
      }

      // Inbox selection is now optional
      // No validation needed for inboxes

      return Object.keys(this.errors).length === 0;
    },

    generateUUID() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.floor(Math.random() * 16);
        const v = c === 'x' ? r : (r % 4) + 8;
        return v.toString(16);
      });
    },
    async createFlow() {
      if (!this.validateForm()) {
        return;
      }

      this.isCreating = true;

      try {
        const flowData = {
          name: this.formData.name,
          description: `${this.formData.type} flow`,
          flow_type: this.formData.type,
          status: this.formData.status,
          trigger_type: this.formData.triggerType,
          trigger_keyword: this.formData.triggerKeyword || null,
          active: this.formData.status === 'active',
          flow_data: {},
          metadata: {},
          inbox_ids: this.selectedInboxes,
        };

        const response = await FlowsAPI.create(flowData);

        // Use optional chaining and provide fallback values
        const responseData = response?.data || response;
        this.$emit('flowCreated', responseData);
        this.closeModal();

        useAlert(this.$t('FLOWS.CREATE_MODAL.SUCCESS_MESSAGE'));
      } catch (error) {
        console.error('Flow creation error:', error);

        let errorMessage = this.$t('FLOWS.CREATE_MODAL.ERROR_MESSAGE');
        const data = error?.response?.data;
        if (data?.errors) {
          const errors = data.errors;
          if (typeof errors === 'object' && !Array.isArray(errors)) {
            errorMessage =
              Object.values(errors)
                .flat()
                .filter(Boolean)
                .join(', ') || errorMessage;
          } else if (typeof errors === 'string') {
            errorMessage = errors;
          }
        } else if (data?.message) {
          errorMessage = data.message;
        } else if (error?.message) {
          errorMessage = error.message;
        }

        useAlert(errorMessage);
      } finally {
        this.isCreating = false;
      }
    },
  },
};
</script>

<template>
  <div v-show="show" class="modal-mask skip-context-menu">
    <div
      class="relative bg-n-alpha-3 shadow-md modal-container rtl:text-right skip-context-menu rounded-xl w-[45rem]"
    >
      <button
        class="absolute z-10 ltr:right-2 rtl:left-2 top-2 inline-flex items-center min-w-0 gap-2 transition-all duration-200 ease-in-out border-0 rounded-lg outline-1 outline disabled:opacity-50 text-n-slate-12 hover:enabled:bg-n-alpha-2 focus-visible:bg-n-alpha-2 outline-transparent h-10 w-10 p-0 text-sm font-medium justify-center"
        @click="closeModal"
      >
        <span class="i-lucide-x flex-shrink-0" />
      </button>

      <div class="flex flex-col h-auto">
        <!-- Modal Header -->
        <div class="flex flex-col items-start px-8 pt-8 pb-0">
          <h2 class="text-base font-semibold leading-6 text-n-slate-12">
            {{ $t('FLOWS.CREATE_MODAL.TITLE') }}
          </h2>
        </div>
        <!-- Modal Body -->
        <form
          class="flex flex-col items-start w-full"
          @submit.prevent="createFlow"
        >
          <!-- Flow Name -->
          <div class="w-full">
            <label
              for="flowName"
              class="block text-sm font-medium text-gray-700 mb-2"
            >
              {{ $t('FLOWS.CREATE_MODAL.FORM.NAME.LABEL') }}
              <span class="text-red-500">
                {{ $t('FLOWS.CREATE_MODAL.FORM.NAME.REQUIRED') }}
              </span>
            </label>
            <input
              id="flowName"
              v-model="formData.name"
              type="text"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-woot-500 focus:border-woot-500"
              :placeholder="$t('FLOWS.CREATE_MODAL.FORM.NAME.PLACEHOLDER')"
            />
            <p v-if="errors.name" class="mt-1 text-sm text-red-600">
              {{ errors.name }}
            </p>
          </div>

          <!-- Flow Type -->
          <div class="w-full">
            <label
              for="flowType"
              class="block text-sm font-medium text-gray-700 mb-2"
            >
              {{ $t('FLOWS.CREATE_MODAL.FORM.TYPE.LABEL') }}
              <span class="text-red-500">
                {{ $t('FLOWS.CREATE_MODAL.FORM.TYPE.REQUIRED') }}
              </span>
            </label>
            <select id="flowType" v-model="formData.type" required class="">
              <option value="">
                {{ $t('FLOWS.CREATE_MODAL.FORM.TYPE.PLACEHOLDER') }}
              </option>
              <option value="conversation">
                {{ $t('FLOWS.CREATE_MODAL.FORM.TYPE.OPTIONS.CONVERSATION') }}
              </option>
              <option value="voice">
                {{ $t('FLOWS.CREATE_MODAL.FORM.TYPE.OPTIONS.VOICE') }}
              </option>
            </select>
            <p v-if="errors.type" class="mt-1 text-sm text-red-600">
              {{ errors.type }}
            </p>
          </div>

          <!-- Trigger Type Selection (Required) -->
          <div class="w-full mb-4">
            <label
              for="triggerType"
              class="block text-sm font-medium text-gray-700 mb-2"
            >
              {{ $t('FLOWS.CREATE_MODAL.FORM.TRIGGER_TYPE.LABEL') }}
              <span class="text-red-500">
                {{ $t('FLOWS.CREATE_MODAL.FORM.TRIGGER_TYPE.REQUIRED') }}
              </span>
            </label>
            <select
              id="triggerType"
              v-model="formData.triggerType"
              required
              class="w-full py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-woot-500 focus:border-woot-500"
              @change="onTriggerTypeChange"
            >
              <option value="">
                {{ $t('FLOWS.CREATE_MODAL.FORM.TRIGGER_TYPE.PLACEHOLDER') }}
              </option>
              <option value="manual">
                {{ $t('FLOWS.CREATE_MODAL.FORM.TRIGGER_TYPE.OPTIONS.MANUAL') }}
              </option>
              <option value="automatic">
                {{ $t('FLOWS.CREATE_MODAL.FORM.TRIGGER_TYPE.OPTIONS.AUTOMATIC') }}
              </option>
            </select>
            <p class="mt-1 text-xs text-gray-500">
              {{ $t('FLOWS.CREATE_MODAL.FORM.TRIGGER_TYPE.HELP_TEXT') }}
            </p>
            <p v-if="errors.triggerType" class="mt-1 text-sm text-red-600">
              {{ errors.triggerType }}
            </p>
          </div>

          <!-- Trigger Keyword (Conditional - Only for Automatic) -->
          <div v-if="formData.triggerType === 'automatic'" class="w-full mb-4">
            <label
              for="triggerKeyword"
              class="block text-sm font-medium text-gray-700 mb-2"
            >
              {{ $t('FLOWS.CREATE_MODAL.FORM.TRIGGER_KEYWORD.LABEL') }}
              <span class="text-gray-500 text-xs">
                {{
                  $t('FLOWS.CREATE_MODAL.FORM.TRIGGER_KEYWORD.OPTIONAL_PREFIX')
                }}
                {{ $t('FLOWS.CREATE_MODAL.FORM.TRIGGER_KEYWORD.OPTIONAL') }}
                {{
                  $t('FLOWS.CREATE_MODAL.FORM.TRIGGER_KEYWORD.OPTIONAL_SUFFIX')
                }}
              </span>
            </label>
            <input
              id="triggerKeyword"
              v-model="formData.triggerKeyword"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-woot-500 focus:border-woot-500"
              :placeholder="
                $t('FLOWS.CREATE_MODAL.FORM.TRIGGER_KEYWORD.PLACEHOLDER')
              "
            />
            <p class="mt-1 text-xs text-gray-500">
              {{ $t('FLOWS.CREATE_MODAL.FORM.TRIGGER_KEYWORD.HELP_TEXT') }}
            </p>
          </div>

          <!-- Channel/Inbox Selection (Optional) -->
          <div class="w-full mb-2">
            <label
              for="inboxSelection"
              class="block text-sm font-medium text-gray-700 mb-2"
            >
              {{ $t('FLOWS.CREATE_MODAL.FORM.INBOXES.LABEL') }}
              <span class="text-gray-500 text-xs">
                {{ $t('FLOWS.CREATE_MODAL.FORM.INBOXES.OPTIONAL_PREFIX') }}
                {{ $t('FLOWS.CREATE_MODAL.FORM.INBOXES.OPTIONAL') }}
                {{ $t('FLOWS.CREATE_MODAL.FORM.INBOXES.OPTIONAL_SUFFIX') }}
              </span>
            </label>
            <div
              v-if="isLoadingInboxes"
              class="text-sm text-gray-500 bg-blue-50 p-3 rounded-md"
            >
              <svg
                class="animate-spin -ml-1 mr-3 h-4 w-4 text-blue-500 inline"
                xmlns="http://www.w3.org/2000/svg"
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
              {{ $t('FLOWS.CREATE_MODAL.FORM.INBOXES.LOADING') }}
            </div>
            <div
              v-else-if="availableInboxes.length === 0"
              class="text-sm text-gray-500 bg-yellow-50 p-3 rounded-md border border-yellow-200"
            >
              <svg
                class="h-4 w-4 text-yellow-500 inline mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              {{ $t('FLOWS.CREATE_MODAL.FORM.INBOXES.NO_INBOXES') }}
            </div>
            <TagMultiSelectComboBox
              v-else
              v-model="selectedInboxes"
              :options="inboxOptions"
              :placeholder="
                $t('FLOWS.CREATE_MODAL.FORM.INBOXES.PLACEHOLDER') ||
                'Select channels/inboxes...'
              "
              :has-error="!!errors.inboxes"
              :message="errors.inboxes"
              class="[&>div>button]:bg-white [&>div>button]:border [&>div>button]:border-gray-300"
            />
            <p class="mt-1 text-xs text-gray-500">
              {{ $t('FLOWS.CREATE_MODAL.FORM.INBOXES.HELP_TEXT') }}
              <span
                v-if="selectedInboxes.length > 0"
                class="text-blue-600 font-medium"
              >
                {{
                  $t('FLOWS.CREATE_MODAL.FORM.INBOXES.SELECTED_COUNT', {
                    count: selectedInboxes.length,
                  })
                }}
              </span>
            </p>
          </div>

          <!-- Modal Footer -->
          <div class="flex flex-row justify-end w-full gap-2 px-0 py-2 pt-10">
            <button
              type="button"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              @click="closeModal"
            >
              {{ $t('FLOWS.CREATE_MODAL.BUTTONS.CANCEL') }}
            </button>
            <button
              type="submit"
              :disabled="isCreating || !isFormValid"
              class="px-4 py-2 text-sm font-medium text-white bg-woot-500 border border-transparent rounded-md hover:bg-woot-600 focus:outline-none focus:ring-2 focus:ring-woot-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span v-if="isCreating" class="flex items-center">
                <svg
                  class="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
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
                {{ $t('FLOWS.CREATE_MODAL.BUTTONS.CREATING') }}
              </span>
              <span v-else>{{ $t('FLOWS.CREATE_MODAL.BUTTONS.CREATE') }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
