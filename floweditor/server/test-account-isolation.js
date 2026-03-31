import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:8000/api/v1';

// Test tokens for different accounts
const testTokens = {
  account1_user1:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJhY2NvdW50X2lkIjoxLCJlbWFpbCI6InVzZXIxQGFjY291bnQxLmNvbSIsInJvbGUiOiJhZG1pbiIsImV4cCI6MTc1OTA2MDc5MywiaWF0IjoxNzU5MDU3MTkzfQ.Mcn-fUBpQ8amuLGGk_FzrCG5NGSKF8IYJBZToq4Qi1s',
  account1_user2:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoyLCJhY2NvdW50X2lkIjoxLCJlbWFpbCI6InVzZXIyQGFjY291bnQxLmNvbSIsInJvbGUiOiJhZ2VudCIsImV4cCI6MTc1OTA1NjA5Nn0.nYvGZfQCDBRpEb4EZVNbKCf7Mth2ed0A3AK8bNoqHZHXkls8qaWx8voShhsBCLW',
  account2_user3:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjozLCJhY2NvdW50X2lkIjoyLCJlbWFpbCI6InVzZXIzQGFjY291bnQyLmNvbSIsInJvbGUiOiJhZG1pbiIsImV4cCI6MTc1OTA1NjA5Nn0.nYvGZfQCDBRpEb4EZVNbKCf7Mth2ed0A3AK8bNoqHZHXkls8qaWx8voShhsBCLW',
  account3_user4:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjo0LCJhY2NvdW50X2lkIjozLCJlbWFpbCI6InVzZXI0QGFjY291bnQzLmNvbSIsInJvbGUiOiJhZG1pbiIsImV4cCI6MTc1OTA1NjA5Nn0.nYvGZfQCDBRpEb4EZVNbKCf7Mth2ed0A3AK8bNoqHZHXkls8qaWx8voShhsBCLW',
};

// Helper function to make API requests
async function apiRequest(
  endpoint,
  method = 'GET',
  token,
  body = null,
  accountId = null,
) {
  const options = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };

  // Add X-Account-ID header if provided
  if (accountId) {
    options.headers['X-Account-ID'] = accountId.toString();
  }

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await response.json();
    return { status: response.status, data };
  } catch (error) {
    return { status: 'ERROR', error: error.message };
  }
}

// Test flow creation for different accounts
async function testFlowCreation() {
  console.log('\n🔧 Testing Flow Creation for Different Accounts');
  console.log('='.repeat(60));

  const flowData = {
    name: 'Test Flow',
    description: 'Test flow for account isolation',
    definition_json: {
      nodes: [
        {
          id: 'start',
          type: 'start',
          position: { x: 100, y: 100 },
          data: { label: 'Start' },
        },
      ],
      edges: [],
    },
  };

  const createdFlows = {};

  for (const [accountUser, token] of Object.entries(testTokens)) {
    console.log(`\nCreating flow for ${accountUser}...`);
    const accountId = accountUser.includes('account1')
      ? 1
      : accountUser.includes('account2')
      ? 2
      : 3;

    const result = await apiRequest(
      '/flow-definitions',
      'POST',
      token,
      {
        ...flowData,
        name: `${flowData.name} - ${accountUser}`,
      },
      accountId,
    );

    if (result.status === 201) {
      createdFlows[accountUser] = result.data.data; // Extract data from success response
      console.log(`✅ Flow created successfully: ID ${result.data.data.uuid}`);
    } else {
      console.log(`❌ Failed to create flow: ${result.status}`, result.data);
    }
  }

  return createdFlows;
}

// Test flow listing and verify account isolation
async function testFlowListing(createdFlows) {
  console.log('\n📋 Testing Flow Listing and Account Isolation');
  console.log('='.repeat(60));

  for (const [accountUser, token] of Object.entries(testTokens)) {
    console.log(`\nListing flows for ${accountUser}...`);
    const accountId = accountUser.includes('account1')
      ? 1
      : accountUser.includes('account2')
      ? 2
      : 3;

    const result = await apiRequest(
      '/flow-definitions',
      'GET',
      token,
      null,
      accountId,
    );

    if (result.status === 200) {
      const flows = result.data.data || []; // Extract flows from success response
      console.log(`✅ Retrieved ${flows.length} flows`);

      // Check if user can only see their own account's flows
      const ownFlows = flows.filter(flow => flow.account_id === accountId);
      const otherFlows = flows.filter(flow => flow.account_id !== accountId);

      console.log(`   - Own account flows: ${ownFlows.length}`);
      console.log(`   - Other account flows: ${otherFlows.length}`);

      if (otherFlows.length === 0) {
        console.log(`   ✅ Account isolation working: Only seeing own flows`);
      } else {
        console.log(
          `   ❌ Account isolation FAILED: Seeing other accounts' flows`,
        );
        otherFlows.forEach(flow => {
          console.log(
            `      - Flow ID ${flow.uuid} from account ${flow.account_id}`,
          );
        });
      }
    } else {
      console.log(`❌ Failed to list flows: ${result.status}`, result.data);
    }
  }
}

// Test cross-account access attempts
async function testCrossAccountAccess(createdFlows) {
  console.log('\n🔒 Testing Cross-Account Access Prevention');
  console.log('='.repeat(60));

  const flowIds = Object.values(createdFlows).map(flow => ({
    id: flow.uuid,
    account: flow.account_id,
  }));

  for (const [accountUser, token] of Object.entries(testTokens)) {
    const userAccountId = accountUser.includes('account1')
      ? 1
      : accountUser.includes('account2')
      ? 2
      : 3;

    console.log(
      `\nTesting ${accountUser} (account ${userAccountId}) access to other flows...`,
    );

    for (const flowInfo of flowIds) {
      if (flowInfo.account !== userAccountId) {
        console.log(
          `  Attempting to access flow ${flowInfo.id} from account ${flowInfo.account}...`,
        );

        // Test GET access - try with wrong account ID
        const getResult = await apiRequest(
          `/flow-definitions/${flowInfo.id}`,
          'GET',
          token,
          null,
          userAccountId,
        );
        if (getResult.status === 403 || getResult.status === 404) {
          console.log(`    ✅ GET blocked: ${getResult.status}`);
        } else {
          console.log(
            `    ❌ GET allowed: ${getResult.status} - SECURITY ISSUE!`,
          );
        }

        // Test PUT access - try with wrong account ID
        const putResult = await apiRequest(
          `/flow-definitions/${flowInfo.id}`,
          'PUT',
          token,
          {
            name: 'Unauthorized Update Attempt',
          },
          userAccountId,
        );
        if (putResult.status === 403 || putResult.status === 404) {
          console.log(`    ✅ PUT blocked: ${putResult.status}`);
        } else {
          console.log(
            `    ❌ PUT allowed: ${putResult.status} - SECURITY ISSUE!`,
          );
        }

        // Test DELETE access - try with wrong account ID
        const deleteResult = await apiRequest(
          `/flow-definitions/${flowInfo.id}`,
          'DELETE',
          token,
          null,
          userAccountId,
        );
        if (deleteResult.status === 403 || deleteResult.status === 404) {
          console.log(`    ✅ DELETE blocked: ${deleteResult.status}`);
        } else {
          console.log(
            `    ❌ DELETE allowed: ${deleteResult.status} - SECURITY ISSUE!`,
          );
        }
      }
    }
  }
}

// Test cleanup - delete created flows
async function testCleanup(createdFlows) {
  console.log('\n🧹 Cleaning Up Test Flows');
  console.log('='.repeat(60));

  for (const [accountUser, flow] of Object.entries(createdFlows)) {
    if (flow && flow.uuid) {
      console.log(`Deleting flow ${flow.uuid} for ${accountUser}...`);
      const token = testTokens[accountUser];
      const accountId = accountUser.includes('account1')
        ? 1
        : accountUser.includes('account2')
        ? 2
        : 3;

      const result = await apiRequest(
        `/flow-definitions/${flow.uuid}`,
        'DELETE',
        token,
        null,
        accountId,
      );

      if (result.status === 200 || result.status === 204) {
        console.log(`✅ Flow deleted successfully`);
      } else {
        console.log(`❌ Failed to delete flow: ${result.status}`, result.data);
      }
    }
  }
}

// Main test execution
async function runAccountIsolationTests() {
  console.log('🚀 Starting Account Isolation Tests');
  console.log('='.repeat(60));
  console.log('Testing with the following accounts:');
  Object.keys(testTokens).forEach(key => {
    const accountId = key.includes('account1')
      ? 1
      : key.includes('account2')
      ? 2
      : 3;
    const userId = key.includes('user1')
      ? 1
      : key.includes('user2')
      ? 2
      : key.includes('user3')
      ? 3
      : 4;
    console.log(`  - ${key}: Account ${accountId}, User ${userId}`);
  });

  try {
    // Step 1: Create flows for each account
    const createdFlows = await testFlowCreation();

    // Step 2: Test flow listing and isolation
    await testFlowListing(createdFlows);

    // Step 3: Test cross-account access prevention
    await testCrossAccountAccess(createdFlows);

    // Step 4: Cleanup
    await testCleanup(createdFlows);

    console.log('\n🎉 Account Isolation Tests Completed');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('❌ Test execution failed:', error);
  }
}

// Run the tests
runAccountIsolationTests();
