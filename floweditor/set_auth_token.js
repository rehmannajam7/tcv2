// Script to set FlowEditor authentication token
const token = 'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoxNjcsImFjY291bnRfaWQiOjEsImVtYWlsIjoiam9obkBhY21lLmluYyIsInJvbGUiOiJhZG1pbmlzdHJhdG9yIiwidWlkIjoiam9obkBhY21lLmluYyIsImlhdCI6MTc2MjEwMzI0MywiZXhwIjoxNzYyMTg5NjQzfQ.zNiWg6ow8xks_csjWfckRaoRRSnLtrLv9taGmInl_xY';
const accountId = '1';

// Set in localStorage
localStorage.setItem('floweditor_auth_token', token);
localStorage.setItem('floweditor_account_id', accountId);

// Also set in the external module if it's available
if (window.setAuthToken) {
  window.setAuthToken(token);
}
if (window.setAccountContext) {
  window.setAccountContext(accountId);
}

console.log('FlowEditor authentication token set successfully!');
console.log('Token:', token.substring(0, 50) + '...');
console.log('Account ID:', accountId);