import jwt from 'jsonwebtoken';
import logger from '../config/logger.js';

const JWT_SECRET =
  process.env.CHATWOOT_JWT_SECRET ||
  process.env.RAILS_SECRET_KEY_BASE ||
  process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error(
    'CHATWOOT_JWT_SECRET or RAILS_SECRET_KEY_BASE environment variable is required',
  );
}

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    logger.warn('Authentication failed: No token provided', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
    return res.status(401).json({
      error: 'Access token required',
      code: 'TOKEN_REQUIRED',
    });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      logger.warn('Authentication failed: Invalid token', {
        error: err.message,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
      return res.status(403).json({
        error: 'Invalid or expired token',
        code: 'TOKEN_INVALID',
      });
    }

    // Validate required token fields
    if (!decoded.account_id || !decoded.user_id) {
      logger.warn('Authentication failed: Invalid token payload', {
        payload: decoded,
        ip: req.ip,
      });
      return res.status(403).json({
        error: 'Invalid token payload',
        code: 'TOKEN_PAYLOAD_INVALID',
      });
    }

    req.user = {
      id: decoded.user_id,
      account_id: decoded.account_id,
      email: decoded.email,
      role: decoded.role,
    };

    logger.info('User authenticated successfully', {
      user_id: req.user.id,
      account_id: req.user.account_id,
      ip: req.ip,
    });

    next();
  });
};

export const requireAccountAccess = (req, res, next) => {
  const accountIdHeader = req.headers['x-account-id'];

  if (!accountIdHeader) {
    logger.warn('Account access denied: No account ID header', {
      user_id: req.user?.id,
      ip: req.ip,
    });
    return res.status(400).json({
      error: 'X-Account-ID header required',
      code: 'ACCOUNT_ID_REQUIRED',
    });
  }

  const requestedAccountId = parseInt(accountIdHeader);

  if (req.user.account_id !== requestedAccountId) {
    logger.warn('Account access denied: Account ID mismatch', {
      user_id: req.user.id,
      user_account_id: req.user.account_id,
      requested_account_id: requestedAccountId,
      ip: req.ip,
    });
    return res.status(403).json({
      error: 'Access denied to requested account',
      code: 'ACCOUNT_ACCESS_DENIED',
    });
  }

  req.account_id = requestedAccountId;
  next();
};
