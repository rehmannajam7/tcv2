import jwt from 'jsonwebtoken';

// JWT secret from .env file
const JWT_SECRET =
  'nYvGZfQCDBRpEb4EZVNbKCf7Mth2ed0A3AK8bNoqHZHXkls8qaWx8voShhsBCLW';

// Generate JWT tokens for different accounts
function generateTestTokens() {
  const tokens = {};

  // Account 1 - User 1
  tokens.account1_user1 = jwt.sign(
    {
      user_id: 1,
      account_id: 1,
      sub: 1,
      aud: 1,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24 hours
    },
    JWT_SECRET,
  );

  // Account 1 - User 2
  tokens.account1_user2 = jwt.sign(
    {
      user_id: 2,
      account_id: 1,
      sub: 2,
      aud: 1,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24 hours
    },
    JWT_SECRET,
  );

  // Account 2 - User 3
  tokens.account2_user3 = jwt.sign(
    {
      user_id: 3,
      account_id: 2,
      sub: 3,
      aud: 2,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24 hours
    },
    JWT_SECRET,
  );

  // Account 3 - User 4
  tokens.account3_user4 = jwt.sign(
    {
      user_id: 4,
      account_id: 3,
      sub: 4,
      aud: 3,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24 hours
    },
    JWT_SECRET,
  );

  return tokens;
}

// Generate and display tokens
const tokens = generateTestTokens();

console.log('Generated JWT Tokens for Testing Account Isolation:');
console.log('='.repeat(60));

Object.entries(tokens).forEach(([name, token]) => {
  console.log(`\n${name.toUpperCase()}:`);
  console.log(token);

  // Decode and display payload for verification
  const decoded = jwt.decode(token);
  console.log(
    `Payload: user_id=${decoded.user_id}, account_id=${decoded.account_id}`,
  );
});

console.log('\n' + '='.repeat(60));
console.log(
  'Usage: Copy the tokens above and use them in Authorization headers',
);
console.log('Example: Authorization: Bearer <token>');
