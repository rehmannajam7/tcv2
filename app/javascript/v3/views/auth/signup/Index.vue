<script>
import { mapGetters } from 'vuex';
import globalConfigMixin from 'shared/mixins/globalConfigMixin';
import SignupForm from './components/Signup/Form.vue';
import Testimonials from './components/Testimonials/Index.vue';
import Spinner from 'shared/components/Spinner.vue';

export default {
  components: {
    SignupForm,
    Spinner,
    Testimonials,
  },
  mixins: [globalConfigMixin],
  data() {
    return { isLoading: false };
  },
  computed: {
    ...mapGetters({ globalConfig: 'globalConfig/get' }),
    isAChatwootInstance() {
      return this.globalConfig.installationName === 'ThumbCrowd';
    },
  },
  beforeMount() {
    this.isLoading = this.isAChatwootInstance;
  },
  mounted() {
    // Force light theme for signup page
    document.body.classList.remove('dark');
    document.documentElement.style.setProperty('color-scheme', 'light');
    document.documentElement.classList.remove('dark');
    document.body.classList.add('light-theme-forced');
  },
  beforeUnmount() {
    // Clean up forced light theme
    document.body.classList.remove('light-theme-forced');
  },
  methods: {
    resizeContainers() {
      this.isLoading = false;
    },
  },
};
</script>

<template>
  <div class="w-full h-full min-h-screen bg-gray-50">
    <div v-show="!isLoading" class="flex h-full min-h-screen flex-col lg:flex-row">
      <!-- Left Column - Signup Form -->
      <div class="flex-1 lg:w-1/2 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8 lg:py-12 bg-white">
        <div class="w-full max-w-md space-y-8">
          <!-- Logo and Header -->
          <div class="text-left">
            <img
              :src="globalConfig.logo"
              :alt="globalConfig.installationName"
              class="h-8 sm:h-8 w-auto"
            />
            <p class="mt-2 text-sm text-gray-600">
              Create your account to get started
            </p>
          </div>

          <!-- Signup Form -->
          <div class="mt-6 sm:mt-8">
            <SignupForm />
          </div>

          <!-- Login Link -->
          <div class="text-center">
            <p class="text-xs text-gray-600">
              {{ $t('REGISTER.HAVE_AN_ACCOUNT') }}
              <router-link 
                class="font-small text-blue-600 hover:text-blue-500 ml-1" 
                to="/app/login"
              >
                {{
                  useInstallationName(
                    $t('LOGIN.TITLE'),
                    globalConfig.installationName
                  )
                }}
              </router-link>
            </p>
          </div>
        </div>
      </div>

      <!-- Right Column - Testimonials (Hidden on mobile and tablet) -->
      <div class="hidden lg:flex lg:w-1/3 bg-gradient-to-br from-blue-600 to-blue-800 relative overflow-hidden">
        <!-- Background Pattern -->
        <div class="absolute inset-0 opacity-10">
          <svg class="w-full h-full" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" stroke-width="0.5"/>
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#grid)" />
          </svg>
        </div>

        <!-- Content -->
        <div class="relative z-10 flex flex-col justify-center px-8 xl:px-12 py-12 text-white bg-n-brand">
          <div class="max-w-md xl:max-w-lg">
            <h3 class="text-sm xl:text-2xl font-bold mb-4 xl:mb-6">
              Get 2x More Sales Using Triggers
            </h3>
            <p class="text-sm xl:text-sm text-blue-100 mb-6 xl:mb-8 leading-relaxed">
              Send automated messages that create a proactive customer service which converts visitors into opportunities.
            </p>
            
            <!-- Testimonials Component -->
            <Testimonials
              v-if="isAChatwootInstance"
              @resize-containers="resizeContainers"
            />
          </div>
        </div>

        <!-- Decorative Elements -->
        <div class="absolute top-0 right-0 -mt-4 -mr-4">
          <div class="w-24 xl:w-32 h-24 xl:h-32 bg-white opacity-5 rounded-full"></div>
        </div>
        <div class="absolute bottom-0 left-0 -mb-6 xl:-mb-8 -ml-6 xl:-ml-8">
          <div class="w-20 xl:w-24 h-20 xl:h-24 bg-white opacity-5 rounded-full"></div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div
      v-show="isLoading"
      class="flex items-center min-h-screen justify-center w-full h-full"
    >
      <Spinner color-scheme="primary" size="" />
    </div>
  </div>
</template>

<style scoped>
/* Force light theme styles */
:global(body.light-theme-forced) {
  background-color: #ffffff !important;
  color: #1f2937 !important;
}

:global(body.light-theme-forced *) {
  color-scheme: light !important;
}

/* Override any dark theme classes */
:global(.dark) {
  background-color: #ffffff !important;
  color: #1f2937 !important;
}

:global(.text-slate-600) {
  color: #475569 !important;
}

:global(.bg-gray-50) {
  background-color: #f9fafb !important;
}
</style>
