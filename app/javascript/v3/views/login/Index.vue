<script>
// utils and composables
import { login } from '../../api/auth';
import { mapGetters } from 'vuex';
import { parseBoolean } from '@chatwoot/utils';
import { useAlert } from 'dashboard/composables';
import { required, email } from '@vuelidate/validators';
import { useVuelidate } from '@vuelidate/core';
import { SESSION_STORAGE_KEYS } from 'dashboard/constants/sessionStorage';
import SessionStorage from 'shared/helpers/sessionStorage';
// mixins
import globalConfigMixin from 'shared/mixins/globalConfigMixin';

// components
import FormInput from '../../components/Form/Input.vue';
import GoogleOAuthButton from '../../components/GoogleOauth/Button.vue';
import Spinner from 'shared/components/Spinner.vue';
import NextButton from 'dashboard/components-next/button/Button.vue';

const ERROR_MESSAGES = {
  'no-account-found': 'LOGIN.OAUTH.NO_ACCOUNT_FOUND',
  'business-account-only': 'LOGIN.OAUTH.BUSINESS_ACCOUNTS_ONLY',
};

const IMPERSONATION_URL_SEARCH_KEY = 'impersonation';

export default {
  components: {
    FormInput,
    GoogleOAuthButton,
    Spinner,
    NextButton,
  },
  mixins: [globalConfigMixin],
  props: {
    ssoAuthToken: { type: String, default: '' },
    ssoAccountId: { type: String, default: '' },
    ssoConversationId: { type: String, default: '' },
    email: { type: String, default: '' },
    authError: { type: String, default: '' },
  },
  setup() {
    return { v$: useVuelidate() };
  },
  data() {
    return {
      // We need to initialize the component with any
      // properties that will be used in it
      credentials: {
        email: '',
        password: '',
      },
      rememberMe: false,
      loginApi: {
        message: '',
        showLoading: false,
        hasErrored: false,
      },
      error: '',
    };
  },
  validations() {
    return {
      credentials: {
        password: {
          required,
        },
        email: {
          required,
          email,
        },
      },
    };
  },
  computed: {
    ...mapGetters({ globalConfig: 'globalConfig/get' }),
    showGoogleOAuth() {
      return Boolean(window.chatwootConfig.googleOAuthClientId);
    },
    showSignupLink() {
      return parseBoolean(window.chatwootConfig.signupEnabled);
    },
  },
  created() {
    if (this.ssoAuthToken) {
      this.submitLogin();
    }
    if (this.authError) {
      const message = ERROR_MESSAGES[this.authError] ?? 'LOGIN.API.UNAUTH';
      useAlert(this.$t(message));
      // wait for idle state
      this.requestIdleCallbackPolyfill(() => {
        // Remove the error query param from the url
        const { query } = this.$route;
        this.$router.replace({ query: { ...query, error: undefined } });
      });
    }
    // Prefill remembered email if available
    this.requestIdleCallbackPolyfill(() => {
      try {
        const remembered = localStorage.getItem('remember_email');
        if (remembered) {
          this.credentials.email = remembered;
          this.rememberMe = true;
        }
      } catch (e) {
        // noop if storage is blocked
      }
    });
  },
  methods: {
    // TODO: Remove this when Safari gets wider support
    // Ref: https://caniuse.com/requestidlecallback
    //
    requestIdleCallbackPolyfill(callback) {
      if (window.requestIdleCallback) {
        window.requestIdleCallback(callback);
      } else {
        // Fallback for safari
        // Using a delay of 0 allows the callback to be executed asynchronously
        // in the next available event loop iteration, similar to requestIdleCallback
        setTimeout(callback, 0);
      }
    },
    showAlertMessage(message) {
      // Reset loading, current selected agent
      this.loginApi.showLoading = false;
      this.loginApi.message = message;
      useAlert(this.loginApi.message);
    },
    handleImpersonation() {
      // Detects impersonation mode via URL and sets a session flag to prevent user settings changes during impersonation.
      const urlParams = new URLSearchParams(window.location.search);
      const impersonation = urlParams.get(IMPERSONATION_URL_SEARCH_KEY);
      if (impersonation) {
        SessionStorage.set(SESSION_STORAGE_KEYS.IMPERSONATION_USER, true);
      }
    },
    submitLogin() {
      this.loginApi.hasErrored = false;
      this.loginApi.showLoading = true;

      const credentials = {
        email: this.email
          ? decodeURIComponent(this.email)
          : this.credentials.email,
        password: this.credentials.password,
        sso_auth_token: this.ssoAuthToken,
        ssoAccountId: this.ssoAccountId,
        ssoConversationId: this.ssoConversationId,
      };

      login(credentials)
        .then(() => {
          this.handleImpersonation();
          this.showAlertMessage(this.$t('LOGIN.API.SUCCESS_MESSAGE'));
        })
        .catch(response => {
          // Reset URL Params if the authentication is invalid
          if (this.email) {
            window.location = '/app/login';
          }
          this.loginApi.hasErrored = true;
          this.showAlertMessage(
            response?.message || this.$t('LOGIN.API.UNAUTH')
          );
        });
    },
    submitFormLogin() {
      if (this.v$.credentials.email.$invalid && !this.email) {
        this.showAlertMessage(this.$t('LOGIN.EMAIL.ERROR'));
        return;
      }

      try {
        if (this.rememberMe) {
          localStorage.setItem('remember_email', this.credentials.email);
        } else {
          localStorage.removeItem('remember_email');
        }
      } catch (e) {
        // ignore storage errors
      }

      this.submitLogin();
    },
  },
};
</script>

<template>
  <main class="min-h-screen bg-gray-50">
    <div class="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <!-- Left: Form and content -->
      <section
        class="flex flex-col justify-center px-6 py-8 sm:px-8 md:px-12 lg:px-16"
      >
        <div class="w-full max-w-md mx-auto">
          <!-- Logo -->
          <div class="flex justify-start mb-6 sm:mb-8">
            <img
              v-if="globalConfig.logo"
              :src="globalConfig.logo"
              :alt="globalConfig.installationName"
              class="block w-auto h-6 sm:h-8"
            />
          </div>

          <!-- Title -->
          <div class="mb-6 sm:mb-8">
            <p class="text-gray-600 text-sm sm:text-base leading-relaxed">
              {{
                $t('LOGIN.DESCRIPTION', {
                  installationName: globalConfig.installationName,
                })
              }}
            </p>
          </div>

          <!-- Login Form -->
          <div v-if="!email">
            <form
              class="space-y-5 sm:space-y-6"
              novalidate
              @submit.prevent="submitFormLogin"
            >
              <!-- Email Field -->
              <div>
                <label
                  for="email"
                  class="block text-sm font-medium text-gray-700 mb-2"
                >
                  {{ $t('LOGIN.EMAIL.LABEL') }}
                </label>
                <FormInput
                  v-model="credentials.email"
                  name="email_address"
                  type="text"
                  data-testid="email_input"
                  :tabindex="1"
                  required
                  autocomplete="username"
                  autocapitalize="none"
                  spellcheck="false"
                  inputmode="email"
                  :placeholder="$t('LOGIN.EMAIL.PLACEHOLDER')"
                  :has-error="v$.credentials.email.$error"
                  class="w-full px-3 py-2.5 sm:py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-base sm:text-sm"
                  @input="v$.credentials.email.$touch"
                />
              </div>

              <!-- Password Field -->
              <div>
                <label
                  for="password"
                  class="block text-sm font-medium text-gray-700 mb-2"
                >
                  {{ $t('LOGIN.PASSWORD.LABEL') }}
                </label>
                <FormInput
                  v-model="credentials.password"
                  type="password"
                  name="password"
                  data-testid="password_input"
                  required
                  :tabindex="2"
                  autocomplete="current-password"
                  :placeholder="$t('LOGIN.PASSWORD.PLACEHOLDER')"
                  :has-error="v$.credentials.password.$error"
                  class="w-full px-3 py-2.5 sm:py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-base sm:text-sm"
                  @input="v$.credentials.password.$touch"
                />
              </div>

              <!-- Remember me -->
              <div class="flex items-center">
                <input
                  id="remember_me"
                  v-model="rememberMe"
                  type="checkbox"
                  class="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500"
                />
                <label for="remember_me" class="ml-2 text-sm text-gray-700">
                  {{ $t('LOGIN.REMEMBER_ME') }}
                </label>
              </div>

              <!-- Login Button -->
              <div>
                <NextButton
                  lg
                  type="submit"
                  data-testid="submit_button"
                  class="w-full bg-n-alpha-black2 text-white font-medium py-3 sm:py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-base sm:text-sm"
                  :tabindex="3"
                  :label="$t('LOGIN.SUBMIT')"
                  :disabled="loginApi.showLoading"
                  :is-loading="loginApi.showLoading"
                />
              </div>

              <!-- Google OAuth Button -->
              <div v-if="showGoogleOAuth">
                <GoogleOAuthButton class="w-full" />
              </div>

              <!-- Footer links -->
              <div
                class="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-4 space-y-2 sm:space-y-0 text-sm"
              >
                <div v-if="showSignupLink">
                  <router-link
                    to="auth/signup"
                    class="text-blue-600 hover:text-blue-500 underline"
                  >
                    {{ $t('LOGIN.CREATE_NEW_ACCOUNT') }}
                  </router-link>
                </div>
                <div v-if="!globalConfig.disableUserProfileUpdate">
                  <router-link
                    to="auth/reset/password"
                    class="text-blue-600 hover:text-blue-500 underline"
                  >
                    {{ $t('LOGIN.FORGOT_PASSWORD') }}
                  </router-link>
                </div>
              </div>
            </form>
          </div>
          <div v-else class="flex items-center justify-center">
            <Spinner color-scheme="primary" size="" />
          </div>
        </div>
      </section>

      <!-- Right: Image placeholder - Hidden on mobile, visible on large screens -->
      <aside
        class="relative hidden lg:flex items-center justify-center bg-n-brand overflow-hidden"
      >
        <!-- Background gradient -->
        <div class="absolute inset-0" />

        <!-- Content -->
        <div
          class="relative z-10 max-w-sm xl:max-w-md px-6 xl:px-8 text-center"
        >
          <div class="mb-6 xl:mb-8">
            <h2 class="text-xl xl:text-2xl font-bold mb-3 xl:mb-4 text-white">
              {{ $t('LOGIN.HERO_TITLE') }}
            </h2>
            <p class="text-white mb-4 xl:mb-6 text-sm xl:text-base">
              {{ $t('LOGIN.HERO_DESCRIPTION') }}
            </p>
          </div>
        </div>
      </aside>
    </div>
  </main>
</template>
