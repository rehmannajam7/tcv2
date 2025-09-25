/**
 * AnalyticsHelper class to initialize and track user analytics using Google Analytics 4
 * @class AnalyticsHelper
 */
export class AnalyticsHelper {
  /**
   * @constructor
   * @param {Object} [options={}] - options for analytics
   * @param {string} [options.trackingId] - Google Analytics tracking ID
   */
  constructor({ trackingId: gaTrackingId } = {}) {
    this.gaTrackingId = gaTrackingId;
    this.isInitialized = false;
    this.user = {};
  }

  /**
   * Initialize Google Analytics
   */
  async init() {
    if (!this.gaTrackingId) {
      this.isInitialized = false;
      return;
    }

    try {
      // Load Google Analytics script
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${this.gaTrackingId}`;
      document.head.appendChild(script);

      // Wait for script to load
      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
      });

      // Initialize gtag
      window.dataLayer = window.dataLayer || [];
      window.gtag = function gtag() {
        window.dataLayer.push(arguments);
      };

      // Configure Google Analytics
      window.gtag('js', new Date());
      window.gtag('config', this.gaTrackingId, {
        send_page_view: false, // We'll handle page views manually
      });

      this.isInitialized = true;
    } catch (error) {
      this.isInitialized = false;
    }
  }

  /**
   * Identify a user
   * @param {Object} user - user object
   */
  identify(user) {
    if (!this.isInitialized) {
      return;
    }

    this.user = user;

    // Track login event
    window.gtag('event', 'login', {
      method: 'chatwoot',
      user_id: user.id,
      user_email: user.email,
      user_name: user.name,
    });

    // Track group association if account exists
    if (user.accounts && user.account_id) {
      const currentAccount = user.accounts.find(
        account => account.id.toString() === user.account_id.toString()
      );

      if (currentAccount) {
        window.gtag('event', 'join_group', {
          group_id: currentAccount.id,
          group_name: currentAccount.name,
          user_id: user.id,
        });
      }
    }
  }

  /**
   * Track an event
   * @param {string} eventName - name of the event
   * @param {Object} properties - event properties
   */
  track(eventName, properties = {}) {
    if (!this.isInitialized) {
      return;
    }

    // Convert event name to snake_case for GA4
    const gaEventName = eventName.toLowerCase().replace(/\s+/g, '_');

    // Add user ID if available
    const eventProperties = {
      user_id: this.user?.id,
      ...properties,
    };

    window.gtag('event', gaEventName, eventProperties);
  }

  /**
   * Track a page view
   * @param {Object} params - page parameters
   */
  page(params = {}) {
    if (!this.isInitialized) {
      return;
    }

    const pageProperties = {
      page_title: params.title,
      page_location: params.url,
      page_path: params.path,
      user_id: this.user?.id,
      ...params,
    };

    window.gtag('event', 'page_view', pageProperties);
  }
}

// This object is shared across, the init is called in app/javascript/packs/application.js
export default new AnalyticsHelper(window.analyticsConfig || {});
