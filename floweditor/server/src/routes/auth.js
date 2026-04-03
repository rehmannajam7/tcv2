import express from 'express';
import jwt from 'jsonwebtoken';
import logger from '../config/logger.js';

const router = express.Router();

// JWT secret from environment
const JWT_SECRET =
  process.env.CHATWOOT_JWT_SECRET ||
  process.env.RAILS_SECRET_KEY_BASE ||
  process.env.JWT_SECRET ||
  'nYvGZfQCDBRpEb4EZVNbKCf7Mth2ed0A3AK8bNoqHZHXkls8qaWx8voShhsBCLW';

/**
 * Generate JWT token for testing/development purposes
 * POST /api/v1/auth/generate-token
 */
router.post('/generate-token', (req, res) => {
  try {
    const {
      user_id = 1,
      account_id = 1,
      email = 'test@test.com',
      role = 'admin',
    } = req.body;

    // Create JWT payload
    const payload = {
      user_id: parseInt(user_id),
      account_id: parseInt(account_id),
      sub: parseInt(user_id),
      aud: parseInt(account_id),
      email,
      role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24 hours
    };

    // Generate token
    const token = jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256' });

    logger.info('JWT token generated', {
      user_id: payload.user_id,
      account_id: payload.account_id,
      email: payload.email,
    });

    res.json({
      success: true,
      token,
      payload: {
        user_id: payload.user_id,
        account_id: payload.account_id,
        email: payload.email,
        role: payload.role,
        expires_at: new Date(payload.exp * 1000).toISOString(),
      },
    });
  } catch (error) {
    logger.error('Error generating JWT token', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to generate token',
    });
  }
});

/**
 * Get current token info
 * GET /api/v1/auth/token-info
 */
router.get('/token-info', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'No token provided',
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({
      success: true,
      payload: decoded,
      expires_at: new Date(decoded.exp * 1000).toISOString(),
      is_expired: decoded.exp < Math.floor(Date.now() / 1000),
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid token',
    });
  }
});

export default router;
