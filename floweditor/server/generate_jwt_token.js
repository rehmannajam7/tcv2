import jwt from 'jsonwebtoken';

// Use the same secret from Chatwoot's .env file
const secret =
  'nYvGZfQCDBRpEb4EZVNbKCf7Mth2ed0A3AK8bNoqHZHXkls8qaWx8voShhsBCLW';

// Create a test payload
const payload = {
  user_id: 1,
  account_id: 1,
  email: 'test@test.com',
  role: 'admin',
  uid: 'test-user-1',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
};

// Generate the token
const token = jwt.sign(payload, secret, { algorithm: 'HS256' });

console.log('Generated JWT Token:');
console.log(token);
console.log('\nPayload:');
console.log(JSON.stringify(payload, null, 2));
console.log('\nTest curl command:');
console.log(`curl -X POST http://localhost:8000/api/v1/flow-definitions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${token}" \\
  -H "X-Account-ID: 1" \\
  -d '{
    "name": "Test Flow",
    "description": "Test flow description",
    "definition_json": {
      "nodes": [
        {
          "id": "start",
          "type": "start",
          "position": { "x": 100, "y": 100 },
          "data": { "label": "Start" }
        }
      ],
      "edges": []
    }
  }'`);
