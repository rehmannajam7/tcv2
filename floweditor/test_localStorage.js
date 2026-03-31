// Simple test script to clear localStorage and test flow loading
console.log('Testing localStorage behavior...');

// First, let's see what's currently in localStorage
console.log('Current localStorage keys:', Object.keys(localStorage));

// Look for flow-related keys
Object.keys(localStorage).forEach(key => {
  if (key.includes('flow') || key.includes('Flow')) {
    console.log(`Found flow key: ${key}`);
    try {
      const value = JSON.parse(localStorage.getItem(key));
      console.log(`  - nodes count: ${value.nodes?.length || 0}`);
      console.log(`  - _ui.nodes keys: ${Object.keys(value._ui?.nodes || {}).length}`);
    } catch (e) {
      console.log(`  - value: ${localStorage.getItem(key)}`);
    }
  }
});

// Clear localStorage and reload
console.log('Clearing localStorage...');
localStorage.clear();
console.log('localStorage cleared. Reloading page...');
window.location.reload();