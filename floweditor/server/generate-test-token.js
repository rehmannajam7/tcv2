import jwt from 'jsonwebtoken';

const secret =
  'nYvGZfQCDBRpEb4EZVNbKCf7Mth2ed0A3AK8bNoqHZHXkls8qaWx8voShhsBCLW';

const payload = {
  user_id: 1,
  account_id: 1,
  email: 'user1@account1.com',
  role: 'admin',
  exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour from now
};

const token = jwt.sign(payload, secret, { algorithm: 'HS256' });
console.log('Generated JWT token:');
console.log(token);
