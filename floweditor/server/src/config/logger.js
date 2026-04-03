import winston from 'winston';
import path from 'path';

const logLevel = process.env.LOG_LEVEL || 'info';
const logFile = process.env.LOG_FILE || 'logs/floweditor.log';

// Create logs directory if it doesn't exist
import fs from 'fs';
const logDir = path.dirname(logFile);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Enhanced format with correlation ID and performance metrics
const enhancedFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
    const logEntry = {
      timestamp,
      level,
      message,
      service,
      ...meta,
    };

    // Add correlation ID if available
    if (meta.correlationId) {
      logEntry.correlationId = meta.correlationId;
    }

    // Add performance metrics if available
    if (meta.duration) {
      logEntry.performance = { duration: meta.duration };
    }

    // Add error context if available
    if (meta.error) {
      logEntry.error = {
        name: meta.error.name,
        message: meta.error.message,
        stack: meta.error.stack,
        code: meta.error.code,
      };
    }

    return JSON.stringify(logEntry);
  }),
);

const logger = winston.createLogger({
  level: logLevel,
  format: enhancedFormat,
  defaultMeta: { service: 'floweditor-server' },
  transports: [
    new winston.transports.File({ filename: logFile }),
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
    }),
    // Add performance log for slow operations
    new winston.transports.File({
      filename: path.join(logDir, 'performance.log'),
      level: 'warn',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
        winston.format.printf(info => {
          if (info.duration && info.duration > 1000) {
            return JSON.stringify(info);
          }
          return false;
        }),
      ),
    }),
  ],
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(
          ({
            timestamp,
            level,
            message,
            service,
            correlationId,
            duration,
            ...meta
          }) => {
            let output = `${timestamp} [${service}] ${level}: ${message}`;
            if (correlationId) output += ` [${correlationId}]`;
            if (duration) output += ` (${duration}ms)`;
            if (Object.keys(meta).length > 0) {
              output += ` ${JSON.stringify(meta)}`;
            }
            return output;
          },
        ),
      ),
    }),
  );
}

// Helper functions for structured logging
logger.logRequest = (req, res, duration) => {
  const correlationId =
    req.headers['x-correlation-id'] ||
    req.id ||
    Math.random()
      .toString(36)
      .substr(2, 9);
  logger.info('Request completed', {
    correlationId,
    method: req.method,
    url: req.url,
    statusCode: res.statusCode,
    duration,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    user_id: req.user?.id,
    account_id: req.headers['x-account-id'],
  });
};

logger.logError = (error, context = {}) => {
  logger.error('Application error', {
    error,
    context,
    correlationId:
      context.correlationId ||
      Math.random()
        .toString(36)
        .substr(2, 9),
  });
};

logger.logPerformance = (operation, duration, context = {}) => {
  const level = duration > 5000 ? 'error' : duration > 1000 ? 'warn' : 'info';
  logger[level](`Performance: ${operation}`, {
    operation,
    duration,
    ...context,
  });
};

export default logger;
