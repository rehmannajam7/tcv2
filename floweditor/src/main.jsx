// Global polyfills for Node.js compatibility - must be first
// Set up global object immediately before any other code
(function() {
  'use strict';

  // Ensure window exists (for web workers or other environments)
  if (typeof window === 'undefined' && typeof globalThis !== 'undefined') {
    globalThis.window = globalThis;
  }

  const rootObject = typeof window !== 'undefined' ? window : globalThis;

  // Set up global polyfill
  if (typeof global === 'undefined') {
    rootObject.global = rootObject;
    if (typeof globalThis !== 'undefined') {
      globalThis.global = rootObject;
    }
  }

  // Set up _global polyfill for temba-components
  if (typeof rootObject._global === 'undefined') {
    rootObject._global = rootObject;
  }

  // Ensure global and _global are available on globalThis
  if (typeof globalThis !== 'undefined') {
    globalThis.global = rootObject;
    globalThis._global = rootObject;
  }

  // Set up timer functions on global and _global
  const timerFunctions = [
    'setTimeout',
    'clearTimeout',
    'setInterval',
    'clearInterval',
    'setImmediate',
    'clearImmediate',
  ];
  timerFunctions.forEach(fn => {
    if (typeof rootObject[fn] === 'function') {
      if (typeof global !== 'undefined' && typeof global[fn] === 'undefined') {
        global[fn] = rootObject[fn];
      }
      if (typeof rootObject._global[fn] === 'undefined') {
        rootObject._global[fn] = rootObject[fn];
      }
    }
  });

  // Ensure Object, Array, Function constructors are available
  ['Object', 'Array', 'Function', 'String', 'Number', 'Boolean'].forEach(
    constructor => {
      if (typeof rootObject[constructor] === 'undefined') {
        rootObject[constructor] = globalThis[constructor];
      }
    },
  );

  console.log('Global polyfills initialized:', {
    global: typeof global,
    _global: typeof rootObject._global,
    window: typeof window,
    globalThis: typeof globalThis,
  });
})();

// Fix constructor property access issues
if (typeof window.Object === 'undefined') {
  window.Object = Object;
}
if (typeof window.Array === 'undefined') {
  window.Array = Array;
}
if (typeof window.Function === 'undefined') {
  window.Function = Function;
}

// Immediately expose showFlowEditor to window object BEFORE imports
console.log('main.jsx: Exposing showFlowEditor function immediately');

window.showFlowEditor = async function(element, config) {
  console.log('showFlowEditor called with config:', config);

  try {
    // Use configuration from parent window if available, otherwise use provided config
    const finalConfigInput = window.flowEditorConfig || config || {};
    console.log('Using configuration:', finalConfigInput);

    // Dynamic imports for better code splitting
    const [
      React,
      ReactDOM,
      { FlowManager },
      endpointsModule,
    ] = await Promise.all([
      import('react'),
      import('react-dom'),
      import('./components/flowmanager/FlowManager'),
      import('./config/endpoints.js'),
    ]);

    console.log('React, FlowManager, and endpoints loaded');

    // Load temba-components dynamically
    const loadTembaComponents = async () => {
      try {
        console.log('Loading temba-components...');
        await import('@nyaruka/temba-components');
        console.log('Temba components loaded successfully');
      } catch (error) {
        console.warn('Failed to load temba-components:', error);
        // Continue without temba-components if it fails to load
      }
    };

    // Load external module for authentication and HTTP configuration
    console.log('Loading external module...');
    const externalModule = await import('./external');
    console.log('External module loaded:', Object.keys(externalModule));

    const {
      setHTTPTimeout,
      setAccountContext,
      initializeAuthFromUrl,
      extractTokenFromUrl,
      setAuthToken,
    } = externalModule;

    // Load temba components first
    await loadTembaComponents();
    console.log('Temba components loaded, initializing FlowEditor');

    // Create proper endpoints configuration
    let finalConfig;
    if (
      finalConfigInput.endpoints &&
      Object.keys(finalConfigInput.endpoints).length > 0
    ) {
      // Use the configuration passed from parent window (Chatwoot) as-is
      console.log(
        'Using endpoints configuration from parent window:',
        finalConfigInput.endpoints,
      );
      finalConfig = finalConfigInput;
    } else {
      // Fallback to creating default configuration
      console.log('No endpoints provided, creating default configuration');
      finalConfig = endpointsModule.createFlowEditorConfig(finalConfigInput);
      console.log('Created FlowEditor config with endpoints:', finalConfig);
    }

        // Ensure `mutable` has a sane default when embed config omits it
    if (typeof finalConfig.mutable === 'undefined') {
      finalConfig.mutable = true;
      console.log('FlowEditor config.mutable was undefined; defaulting to true to enable editing');
    } else {
      console.log('FlowEditor config.mutable explicitly set to:', finalConfig.mutable);
    }

// Set HTTP timeout if provided
    if (finalConfig.httpTimeout) {
      setHTTPTimeout(finalConfig.httpTimeout);
    }

    // Set account context if provided
    if (finalConfig.accountId) {
      console.log('Setting account context:', finalConfig.accountId);
      setAccountContext(finalConfig.accountId);
    }

    // Initialize authentication from URL parameters or stored values
    console.log('Initializing authentication...');
    const authResult = initializeAuthFromUrl();
    console.log('Authentication initialized:', authResult);

    // Also handle legacy token parameter for backward compatibility
    const legacyToken = extractTokenFromUrl();
    if (legacyToken) {
      console.log('Found legacy token parameter, setting auth token');
      setAuthToken(legacyToken);
    }

    // Store reference to FlowEditor instance
    window.flowEditorInstance = { config: finalConfig, element };

    // Render the FlowManager
    ReactDOM.render(
      React.createElement(FlowManager, { config: finalConfig }),
      element,
    );
    console.log('FlowEditor rendered successfully with config:', finalConfig);
  } catch (error) {
    console.error('Error during FlowEditor initialization:', error);
    if (element) {
      element.innerHTML =
        '<div style="padding: 20px; text-align: center; color: #e74c3c;"><h3>FlowEditor Failed to Load</h3><p>Error: ' +
        error.message +
        '</p></div>';
    }
  }
};

// Create FlowEditorExternal object with authentication functions
window.FlowEditorExternal = {
  initializeAuthFromUrl: () => {
    console.log('FlowEditorExternal.initializeAuthFromUrl called');
    return import('./external').then(({ initializeAuthFromUrl }) => {
      return initializeAuthFromUrl();
    });
  },
};

// Listen for messages from parent window (Chatwoot)
// Enhanced PostMessage handler for better communication with Chatwoot
window.addEventListener('message', (event) => {
  try {
    // Enhanced security check for allowed origins
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001', // FlowEditor itself
      'https://stage.thumb-crowd.com', 'https://stage.thumb-crowd.com:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001', // FlowEditor itself (127.0.0.1)
      'http://localhost:8081', // Development Chatwoot
      'http://127.0.0.1:8081',
      'http://10.20.4.131:3000', // IP-based Chatwoot
      'http://10.20.4.131:3001'  // IP-based FlowEditor
    ];

    if (!allowedOrigins.includes(event.origin)) {
      console.warn('FlowEditor: Rejected message from unauthorized origin:', event.origin);
      return;
    }

    // Validate message structure
    if (!event.data || typeof event.data !== 'object') {
      console.warn('FlowEditor: Invalid message format received');
      return;
    }

    const { type, data, messageId, timestamp, source } = event.data;

    // Log incoming messages for debugging
    console.log('FlowEditor: Received message from Chatwoot:', { 
      type, 
      data, 
      messageId, 
      timestamp, 
      source, 
      origin: event.origin 
    });

    // Handle different message types
    switch (type) {
      case 'chatwoot_context':
        handleChatwootContext(data, messageId);
        break;
      case 'auth_token_updated':
        handleAuthTokenUpdate(data, messageId);
        break;
      case 'flow_execution_request':
        handleFlowExecutionRequest(data, messageId);
        break;
      case 'message_acknowledged':
        handleMessageAcknowledged(data, messageId);
        break;
      case 'message_error':
        handleMessageError(data, messageId);
        break;
      default:
        console.warn('FlowEditor: Unknown message type received:', type);
        break;
    }

    // Send acknowledgment if messageId is provided
    if (messageId && type !== 'message_acknowledged' && type !== 'message_error') {
      sendMessageToChatwoot('message_acknowledged', { messageId });
    }

  } catch (error) {
    console.error('FlowEditor: Error processing message:', error);
  }
});

// Enhanced function to send messages to Chatwoot parent window
function sendMessageToChatwoot(type, data = {}, options = {}) {
  const { requireAck = false } = options;
  
  const messageId = generateMessageId();
  const message = {
    type,
    data,
    messageId,
    timestamp: Date.now(),
    source: 'floweditor'
  };

  try {
    console.log('FlowEditor: Sending message to Chatwoot:', message);
    window.parent.postMessage(message, '*');

    if (requireAck) {
      return waitForAcknowledgment(messageId);
    }
    
    return Promise.resolve();
  } catch (error) {
    console.error('FlowEditor: Error sending message to Chatwoot:', error);
    return Promise.reject(error);
  }
}

// Generate unique message IDs
function generateMessageId() {
  return `floweditor_msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Wait for message acknowledgment
function waitForAcknowledgment(messageId, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      window.pendingAcks?.delete(messageId);
      reject(new Error('Message acknowledgment timeout'));
    }, timeout);

    if (!window.pendingAcks) {
      window.pendingAcks = new Map();
    }
    window.pendingAcks.set(messageId, { resolve, reject, timeoutId });
  });
}

// Message handlers
function handleChatwootContext(contextData, messageId) {
  console.log('FlowEditor: Received Chatwoot context:', contextData);
  
  try {
    const { dashboardAppContext, flowEditorConfig } = contextData;
    
    // Update authentication context
    if (flowEditorConfig?.token) {
      import('/src/external/index.js').then(({ setAuthToken }) => {
        setAuthToken(flowEditorConfig.token);
        console.log('FlowEditor: Auth token updated from context');
      });
    }
    
    if (flowEditorConfig?.accountId) {
      import('/src/external/index.js').then(({ setAccountContext }) => {
        setAccountContext(flowEditorConfig.accountId);
        console.log('FlowEditor: Account context updated from context');
      });
    }

    // Store context globally for FlowEditor components
    window.chatwootContext = {
      dashboardAppContext,
      flowEditorConfig,
      receivedAt: Date.now()
    };

    // Notify FlowEditor components that context is available
    window.dispatchEvent(new CustomEvent('chatwoot-context-updated', {
      detail: contextData
    }));

    console.log('FlowEditor: Context processed successfully');
    
  } catch (error) {
    console.error('FlowEditor: Error processing Chatwoot context:', error);
    sendMessageToChatwoot('floweditor_error', {
      message: 'Failed to process context',
      error: error.message
    });
  }
}

function handleAuthTokenUpdate(authData, messageId) {
  console.log('FlowEditor: Received auth token update');
  
  try {
    if (authData.token) {
      import('/src/external/index.js').then(({ setAuthToken }) => {
        setAuthToken(authData.token);
        console.log('FlowEditor: Auth token refreshed');
      });
    }
    
    if (authData.accountId) {
      import('/src/external/index.js').then(({ setAccountContext }) => {
        setAccountContext(authData.accountId);
        console.log('FlowEditor: Account context refreshed');
      });
    }
  } catch (error) {
    console.error('FlowEditor: Error updating auth token:', error);
  }
}

// Token refresh mechanism
function requestTokenRefresh() {
  // Skip token refresh in development mode
  const isDevelopmentMode = window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1' ||
                           window.location.hostname.includes('10.20.4.131');
  
  if (isDevelopmentMode) {
    console.log('FlowEditor: Skipping token refresh request in development mode');
    return Promise.resolve();
  }

  console.log('FlowEditor: Requesting token refresh from Chatwoot');
  return sendMessageToChatwoot('request_token_refresh', {
    timestamp: Date.now()
  }, { requireAck: true });
}

// Check token expiration and refresh if needed
function checkAndRefreshToken() {
  // Skip token refresh in development mode
  const isDevelopmentMode = window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1' ||
                           window.location.hostname.includes('10.20.4.131');
  
  if (isDevelopmentMode) {
    console.log('FlowEditor: Skipping token refresh in development mode');
    return;
  }

  import('/src/external/index.js').then(({ getAuthToken }) => {
    const token = getAuthToken();
    if (!token) {
      console.log('FlowEditor: No token found, requesting refresh');
      requestTokenRefresh();
      return;
    }

    try {
      // Decode JWT token to check expiration
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = payload.exp - currentTime;
      
      // Refresh token if it expires within 5 minutes
      if (timeUntilExpiry < 300) {
        console.log('FlowEditor: Token expires soon, requesting refresh');
        requestTokenRefresh();
      }
    } catch (error) {
      console.error('FlowEditor: Error checking token expiration:', error);
      requestTokenRefresh();
    }
  });
}

// Set up periodic token refresh check (every 10 minutes)
setInterval(checkAndRefreshToken, 10 * 60 * 1000);

// Initial token check after 30 seconds
setTimeout(checkAndRefreshToken, 30000);

function handleFlowExecutionRequest(executionData, messageId) {
  console.log('FlowEditor: Received flow execution request:', executionData);
  // TODO: Implement flow execution testing
  sendMessageToChatwoot('flow_execution_result', {
    success: false,
    message: 'Flow execution testing not yet implemented'
  });
}

function handleMessageAcknowledged(ackData, messageId) {
  const { messageId: ackedMessageId } = ackData;
  if (window.pendingAcks?.has(ackedMessageId)) {
    const { resolve, timeoutId } = window.pendingAcks.get(ackedMessageId);
    clearTimeout(timeoutId);
    window.pendingAcks.delete(ackedMessageId);
    resolve();
  }
}

function handleMessageError(errorData, messageId) {
  const { messageId: errorMessageId, error } = errorData;
  if (window.pendingAcks?.has(errorMessageId)) {
    const { reject, timeoutId } = window.pendingAcks.get(errorMessageId);
    clearTimeout(timeoutId);
    window.pendingAcks.delete(errorMessageId);
    reject(new Error(error));
  }
}

// Notify Chatwoot that FlowEditor is ready
function notifyFlowEditorReady() {
  console.log('FlowEditor: Notifying Chatwoot that FlowEditor is ready');
  sendMessageToChatwoot('floweditor_ready', {
    version: '1.0.0',
    capabilities: [
      'flow_creation',
      'flow_editing',
      'flow_validation',
      'context_aware_editing'
    ]
  });
}

// Call ready notification after a short delay to ensure everything is initialized
setTimeout(notifyFlowEditorReady, 500);

console.log('showFlowEditor exposed to window:', typeof window.showFlowEditor);

// Load static imports after function is exposed
import('./global.module.scss');
import('./static/fonts/floweditor/style.css');
import('@weni/unnnic-system/dist/style.css');
import('setimmediate');

// Service worker registration
import('./serviceWorker').then(serviceWorker => {
  if (serviceWorker && typeof serviceWorker.unregister === 'function') {
    serviceWorker.unregister();
  }
}).catch(error => {
  console.warn('Service worker import failed:', error);
});
