// Utility for loading temba-components with proper error handling
let tembaComponentsLoaded = false;
let tembaLoadingPromise = null;

export async function loadTembaComponents() {
  // Return existing promise if already loading
  if (tembaLoadingPromise) {
    return tembaLoadingPromise;
  }

  // Return immediately if already loaded
  if (tembaComponentsLoaded) {
    console.log('Temba components already loaded');
    return Promise.resolve();
  }

  console.log('Loading temba-components...');

  tembaLoadingPromise = new Promise(async (resolve, reject) => {
    try {
      // Ensure global polyfills are set up before loading temba-components
      if (typeof window !== 'undefined') {
        // Ensure _global is properly set up for temba-components
        if (!window._global) {
          window._global = window;
        }

        // Ensure timer functions are available on _global
        const timerFunctions = [
          'setTimeout',
          'clearTimeout',
          'setInterval',
          'clearInterval',
        ];
        timerFunctions.forEach(fn => {
          if (typeof window._global[fn] !== 'function') {
            window._global[fn] = window[fn];
          }
        });
      }

      // Dynamic import of temba-components
      const tembaComponents = await import('@nyaruka/temba-components');
      console.log('Temba components imported successfully');

      // Register components if needed
      if (tembaComponents.registerComponents) {
        await tembaComponents.registerComponents();
        console.log('Temba components registered');
      }

      tembaComponentsLoaded = true;
      resolve();
    } catch (error) {
      console.error('Failed to load temba-components:', error);
      // Don't reject - allow FlowEditor to continue without temba-components
      // This prevents the entire module from failing if temba-components has issues
      console.warn('Continuing without temba-components...');
      tembaComponentsLoaded = true; // Mark as "loaded" to prevent retry loops
      resolve();
    }
  });

  return tembaLoadingPromise;
}

export function isTembaComponentsLoaded() {
  return tembaComponentsLoaded;
}
