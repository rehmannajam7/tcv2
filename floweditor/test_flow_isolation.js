// Test script to verify flow isolation between accounts
console.log('=== Flow Isolation Test ===');

// Mock URL parameters for different accounts
const testAccounts = [
  { accountId: '1', name: 'Account 1' },
  { accountId: '2', name: 'Account 2' },
  { accountId: '3', name: 'Account 3' },
];

// Clear localStorage before testing
localStorage.clear();
console.log('Cleared localStorage');

// Test FlowStore functionality
class FlowStoreTest {
  constructor() {
    this.testResults = [];
  }

  // Simulate FlowStore.getAccountId() method
  getAccountId(mockUrl) {
    const url = new URL(mockUrl);
    return (
      url.searchParams.get('accountId') ||
      url.searchParams.get('account_id') ||
      null
    );
  }

  // Simulate FlowStore.getStorageKey() method
  getStorageKey(accountId, uuid = 'demo-flow-id') {
    return accountId ? `flow_${accountId}` : 'flow';
  }

  // Test account-specific storage
  testAccountStorage() {
    console.log('\n--- Testing Account-Specific Storage ---');

    testAccounts.forEach(account => {
      const mockUrl = `http://localhost:3001/?account_id=${account.accountId}`;
      const accountId = this.getAccountId(mockUrl);
      const storageKey = this.getStorageKey(accountId);

      // Create a mock flow for this account
      const mockFlow = {
        definition: {
          uuid: 'demo-flow-id',
          name: `Flow for ${account.name}`,
          nodes: [
            {
              uuid: 'node-1',
              actions: [
                {
                  type: 'send_msg',
                  text: `Welcome to ${account.name}!`,
                },
              ],
            },
          ],
        },
        metadata: { dependencies: [] },
        issues: [],
      };

      // Store the flow
      localStorage.setItem(storageKey, JSON.stringify(mockFlow));
      console.log(`✓ Stored flow for ${account.name} with key: ${storageKey}`);

      // Verify retrieval
      const retrieved = JSON.parse(localStorage.getItem(storageKey));
      const isCorrect = retrieved.definition.name === mockFlow.definition.name;

      this.testResults.push({
        account: account.name,
        storageKey,
        stored: true,
        retrieved: isCorrect,
        flowName: retrieved.definition.name,
      });
    });
  }

  // Test isolation between accounts
  testIsolation() {
    console.log('\n--- Testing Flow Isolation ---');

    const keys = Object.keys(localStorage).filter(key =>
      key.startsWith('flow'),
    );
    console.log('Storage keys found:', keys);

    // Verify each account has its own storage
    testAccounts.forEach(account => {
      const expectedKey = `flow_${account.accountId}`;
      const hasKey = keys.includes(expectedKey);
      console.log(
        `${account.name}: ${
          hasKey ? '✓' : '✗'
        } Has isolated storage (${expectedKey})`,
      );
    });

    // Test cross-account isolation
    const flow1 = JSON.parse(localStorage.getItem('flow_1'));
    const flow2 = JSON.parse(localStorage.getItem('flow_2'));
    const flow3 = JSON.parse(localStorage.getItem('flow_3'));

    const isolated =
      flow1.definition.name !== flow2.definition.name &&
      flow2.definition.name !== flow3.definition.name &&
      flow1.definition.name !== flow3.definition.name;

    console.log(`Cross-account isolation: ${isolated ? '✓ PASS' : '✗ FAIL'}`);

    return isolated;
  }

  // Display test results
  displayResults() {
    console.log('\n--- Test Results Summary ---');
    console.table(this.testResults);

    const allPassed = this.testResults.every(
      result => result.stored && result.retrieved,
    );
    console.log(
      `\nOverall Result: ${
        allPassed ? '✓ ALL TESTS PASSED' : '✗ SOME TESTS FAILED'
      }`,
    );

    return allPassed;
  }

  // Run all tests
  runTests() {
    this.testAccountStorage();
    const isolationPassed = this.testIsolation();
    const allPassed = this.displayResults();

    console.log('\n=== Test Complete ===');
    return allPassed && isolationPassed;
  }
}

// Run the tests
const tester = new FlowStoreTest();
const testsPassed = tester.runTests();

// Export results for external verification
window.flowIsolationTestResults = {
  passed: testsPassed,
  results: tester.testResults,
  storageKeys: Object.keys(localStorage).filter(key => key.startsWith('flow')),
};

console.log('Test results available in window.flowIsolationTestResults');
