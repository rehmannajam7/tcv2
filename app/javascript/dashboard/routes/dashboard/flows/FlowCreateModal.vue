<template>
  <div v-if="show" class="modal-mask skip-context-menu">
    <div class="relative max-h-full overflow-auto bg-n-alpha-3 shadow-md modal-container rtl:text-right skip-context-menu rounded-xl w-[37.5rem]">
       <button
          @click="closeModal"
          class="absolute z-10 ltr:right-2 rtl:left-2 top-2 inline-flex items-center min-w-0 gap-2 transition-all duration-200 ease-in-out border-0 rounded-lg outline-1 outline disabled:opacity-50 text-n-slate-12 hover:enabled:bg-n-alpha-2 focus-visible:bg-n-alpha-2 outline-transparent h-10 w-10 p-0 text-sm font-medium justify-center"
        >
          <span class="i-lucide-x flex-shrink-0"></span>
        </button>
      
    <div class="flex flex-col h-auto overflow-auto">
      <!-- Modal Header -->
      <div class="flex flex-col items-start px-8 pt-8 pb-0">
        <h2 class="text-base font-semibold leading-6 text-n-slate-12">
          {{ $t('FLOWS.CREATE_MODAL.TITLE') }}
        </h2>
      </div>
      <!-- Modal Body -->
      <form @submit.prevent="createFlow" class="flex flex-col items-start w-full">
        <!-- Flow Name -->
        <div class="w-full">
          <label for="flowName" class="">
            {{ $t('FLOWS.CREATE_MODAL.FORM.NAME.LABEL') }}
            <span class="text-red-500">*</span>
          </label>
          <input
            id="flowName"
            v-model="formData.name"
            type="text"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-woot-500 focus:border-woot-500"
            :placeholder="$t('FLOWS.CREATE_MODAL.FORM.NAME.PLACEHOLDER')"
          />
          <p v-if="errors.name" class="mt-1 text-sm text-red-600">{{ errors.name }}</p>
        </div>

        <!-- Flow Type -->
        <div class="w-full">
          <label for="flowType" class="">
            {{ $t('FLOWS.CREATE_MODAL.FORM.TYPE.LABEL') }}
            <span class="text-red-500">*</span>
          </label>
          <select
            id="flowType"
            v-model="formData.type"
            required
            class=""
          >
            <option value="">{{ $t('FLOWS.CREATE_MODAL.FORM.TYPE.PLACEHOLDER') }}</option>
            <option value="conversation">{{ $t('FLOWS.CREATE_MODAL.FORM.TYPE.OPTIONS.CONVERSATION') }}</option>
            <option value="voice">{{ $t('FLOWS.CREATE_MODAL.FORM.TYPE.OPTIONS.VOICE') }}</option>
          </select>
          <p v-if="errors.type" class="mt-1 text-sm text-red-600">{{ errors.type }}</p>
        </div>

        <!-- Trigger Keyword (Optional) -->
        <div class="w-full">
          <label for="triggerKeyword" class="">
            {{ $t('FLOWS.CREATE_MODAL.FORM.TRIGGER_KEYWORD.LABEL') }}
            <span class="text-gray-500 text-xs">({{ $t('FLOWS.CREATE_MODAL.FORM.TRIGGER_KEYWORD.OPTIONAL') }})</span>
          </label>
          <input
            id="triggerKeyword"
            v-model="formData.triggerKeyword"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-woot-500 focus:border-woot-500"
            :placeholder="$t('FLOWS.CREATE_MODAL.FORM.TRIGGER_KEYWORD.PLACEHOLDER')"
          />
          <p class="mt-1 text-xs text-gray-500">
            {{ $t('FLOWS.CREATE_MODAL.FORM.TRIGGER_KEYWORD.HELP_TEXT') }}
          </p>
        </div>

        <!-- Modal Footer -->
        <div class="flex flex-row justify-end w-full gap-2 px-0 py-2 pt-10">
          <button
            type="button"
            @click="closeModal"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            {{ $t('FLOWS.CREATE_MODAL.BUTTONS.CANCEL') }}
          </button>
          <button
            type="submit"
            :disabled="isCreating || !isFormValid"
            class="px-4 py-2 text-sm font-medium text-white bg-woot-500 border border-transparent rounded-md hover:bg-woot-600 focus:outline-none focus:ring-2 focus:ring-woot-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="isCreating" class="flex items-center">
              <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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

<script>
import { mapGetters } from 'vuex';
import FlowsAPI from '../../../api/flows';

export default {
  name: 'FlowCreateModal',
  props: {
    show: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      formData: {
        name: '',
        type: '',
        triggerKeyword: '',
      },
      errors: {},
      isCreating: false,
    };
  },
  computed: {
    ...mapGetters({
      accountId: 'getCurrentAccountId',
    }),
    isFormValid() {
      return this.formData.name.trim() && this.formData.type;
    },
  },
  watch: {
    show(newVal) {
      if (newVal) {
        this.resetForm();
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
        triggerKeyword: '',
      };
      this.errors = {};
      this.isCreating = false;
    },
    validateForm() {
      this.errors = {};
      
      if (!this.formData.name.trim()) {
        this.errors.name = this.$t('FLOWS.CREATE_MODAL.VALIDATION.NAME_REQUIRED');
      }
      
      if (!this.formData.type) {
        this.errors.type = this.$t('FLOWS.CREATE_MODAL.VALIDATION.TYPE_REQUIRED');
      }
      
      return Object.keys(this.errors).length === 0;
    },
    generateUUID() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
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
          trigger_keyword: this.formData.triggerKeyword || null,
          active: true,
          flow_data: {},
          metadata: {}
        };

        const response = await FlowsAPI.create(flowData);
        
        // Use optional chaining and provide fallback values
        const responseData = response?.data || response;
        this.$emit('flow-created', responseData);
        this.closeModal();
        
        // Show success message
        this.$toast.success(this.$t('FLOWS.CREATE_MODAL.SUCCESS_MESSAGE'));
        
      } catch (error) {
        // Error creating flow
        this.$toast.error('Failed to create flow');
      } finally {
        this.isCreating = false;
      }
    },
  },
};
</script>