const http = require('http');

// Test the knowledge_bases endpoint
function testEndpoint(path, expectedStatus = 200) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 8000,
      path: path,
      method: 'GET',
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        console.log(`Testing ${path}:`);
        console.log(`  Status: ${res.statusCode}`);
        console.log(`  Content-Type: ${res.headers['content-type']}`);
        console.log(`  Data: ${data.substring(0, 200)}${data.length > 200 ? '...' : ''}`);
        console.log('---');
        resolve({ statusCode: res.statusCode, data });
      });
    });

    req.on('error', (error) => {
      console.error(`Error testing ${path}: ${error.message}`);
      reject(error);
    });

    req.end();
  });
}

async function runTests() {
  console.log('Testing FlowEditor endpoints...\n');
  
  try {
    await testEndpoint('/api/v1/accounts/1/flow_editor/knowledge_bases');
    await testEndpoint('/flow_editor/knowledge_bases');
    await testEndpoint('/captain/assistants');
    console.log('All endpoint tests completed!');
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

runTests();