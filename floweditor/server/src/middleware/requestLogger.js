import logger from '../config/logger.js';

// Request logging middleware with performance tracking
export const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Generate correlation ID if not present
  const correlationId =
    req.headers['x-correlation-id'] ||
    req.headers['x-request-id'] ||
    Math.random()
      .toString(36)
      .substr(2, 9);

  // Add correlation ID to request for downstream use
  req.correlationId = correlationId;

  // Log incoming request
  logger.info('Incoming request', {
    correlationId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Override res.end to capture response details
  const originalEnd = res.end;
  res.end = function(...args) {
    const duration = Date.now() - startTime;

    // Log request completion
    logger.logRequest(req, res, duration);

    // Log performance warning for slow requests
    if (duration > 1000) {
      logger.logPerformance('HTTP Request', duration, {
        correlationId,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
      });
    }

    originalEnd.apply(this, args);
  };

  next();
};

// Error logging middleware
export const errorLogger = (err, req, res, next) => {
  const correlationId =
    req.correlationId ||
    Math.random()
      .toString(36)
      .substr(2, 9);

  logger.logError(err, {
    correlationId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    user_id: req.user?.id,
    account_id: req.headers['x-account-id'],
  });

  next(err);
};
