// Load environment variables FIRST before any other imports
import dotenv from 'dotenv';
dotenv.config();

// Add error handling for uncaught exceptions
process.on('uncaughtException', error => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './config/logger.js';
import { requestLogger, errorLogger } from './middleware/requestLogger.js';
import routes from './routes/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8000;
const API_BASE_URL = process.env.API_BASE_URL || '/api/v1';

// Path to the built FlowEditor files
const BUILD_PATH = path.join(__dirname, '../../build');

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: [
          "'self'",
          'http://localhost:3000',
          'https://stage.thumb-crowd.com',
        ],
        styleSrc: ["'self'", "'unsafe-inline'", 'https:', 'http:'],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          'https:',
          'http:',
        ],
        imgSrc: ["'self'", 'data:', 'https:', 'http:'],
        fontSrc: ["'self'", 'https:', 'http:', 'data:'],
        connectSrc: [
          "'self'",
          'http://localhost:3000',
          'https://stage.thumb-crowd.com',
          'http:',
          'https:',
          'ws:',
          'wss:',
        ],
        frameSrc: [
          "'self'",
          'http://localhost:3000',
          'http://localhost:3001',
          'http://10.20.4.131:3000',
          'https://stage.thumb-crowd.com',
        ],
        frameAncestors: [
          "'self'",
          'http://localhost:3000',
          'http://10.20.4.131:3000',
          'https://stage.thumb-crowd.com',
        ],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'", 'https:', 'http:', 'data:'],
        workerSrc: ["'self'", 'blob:'],
        childSrc: ["'self'", 'blob:'],
        manifestSrc: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false, // Disable CORP to allow cross-origin requests
    crossOriginOpenerPolicy: false, // Disable COOP to allow cross-origin requests
    // Disable X-Frame-Options to allow frameAncestors CSP directive to work
    frameguard: false, // Disable X-Frame-Options to allow frameAncestors CSP directive to work
  }),
);

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:3000', // Chatwoot
    'http://localhost:3001', // FlowEditor Frontend
    'http://localhost:8000', // FlowEditor API
    'http://localhost:8080',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:8000',
    'http://127.0.0.1:8080',
    'http://10.20.4.131:3000', // Additional Chatwoot instance
    'https://stage.thumb-crowd.com', // Production Chatwoot instance
    ...(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : []),
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Account-ID',
    'X-Frame-Options',
    'Access-Control-Allow-Origin',
    // DeviseTokenAuth headers
    'access-token',
    'client',
    'uid',
    'token-type',
    'expiry',
    // API access token header
    'api_access_token',
    'api-access-token',
    'x-api-access-token',
  ],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
};

app.use(cors(corsOptions));

// Handle CORS preflight globally to ensure proper headers for all routes
app.options('*', (req, res) => {
  const origin = req.headers.origin || '*';
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Vary', 'Origin');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
  res.header('Access-Control-Allow-Headers', corsOptions.allowedHeaders.join(', '));
  return res.status(204).end();
});

// Rate limiting - Increased for FlowEditor initial load
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000, // Increased from 100 to 1000
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Body parsing middleware
// Accept JSON strings at the top level to avoid body-parser strict errors
app.use(express.json({ limit: '10mb', strict: false }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Normalize JSON bodies when a raw JSON string slips through.
// Keep a copy of the original string for downstream proxying if needed.
app.use((req, res, next) => {
  try {
    const contentType = req.headers['content-type'] || '';
    if (
      req.method !== 'GET' &&
      contentType.includes('application/json') &&
      typeof req.body === 'string'
    ) {
      req.rawBody = req.body;
      try {
        req.body = JSON.parse(req.body);
      } catch (err) {
        // If parsing fails, leave body as string; handlers will guard accordingly.
      }
    }
  } catch (e) {
    // Non-fatal, proceed with current body.
  }
  next();
});

// Compression middleware
app.use(compression());

// Request logging middleware (before routes)
app.use(requestLogger);

// Request logging middleware
app.use((req, res, next) => {
  logger.info('Incoming request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });
  next();
});

// Remove local mock endpoints for knowledge bases and captain assistants; these are proxied.

// Chatwoot-style API routes with accounts path (must come BEFORE generic API routes)
// Extract account ID from URL and add it to request for downstream middleware
app.use(
  '/accounts/:accountId',
  (req, res, next) => {
    // Store account ID from URL params for use in authentication middleware
    req.accountId = req.params.accountId;
    req.account_id = parseInt(req.params.accountId); // Add underscore version for consistency

    // Strip the account prefix from the URL for the routes to match
    // Transform /accounts/123/flow_editor/flows/111/save_revision to /flow_editor/flows/111/save_revision
    const accountPrefix = `/accounts/${req.params.accountId}`;
    if (req.originalUrl.startsWith(accountPrefix)) {
      req.url = req.originalUrl.substring(accountPrefix.length) || '/';
      logger.info('Account URL transformed (root mount)', {
        originalUrl: req.originalUrl,
        transformedUrl: req.url,
        account_id: req.account_id,
        mount: 'root',
      });
    }

    next();
  },
  routes,
);

// Chatwoot-style API routes with accounts path under API_BASE_URL
// Needed when requests arrive via a reverse proxy like Nginx rewriting to /api/v1
app.use(
  `${API_BASE_URL}/accounts/:accountId`,
  (req, res, next) => {
    // Store account ID from URL params for downstream middleware
    req.accountId = req.params.accountId;
    req.account_id = parseInt(req.params.accountId);

    // Strip the /api/v1/accounts/:accountId prefix so downstream routers match /flow_editor/*
    const apiAccountPrefix = `${API_BASE_URL}/accounts/${req.params.accountId}`;
    if (req.originalUrl.startsWith(apiAccountPrefix)) {
      req.url = req.originalUrl.substring(apiAccountPrefix.length) || '/';
      logger.info('Account URL transformed (API_BASE_URL mount)', {
        originalUrl: req.originalUrl,
        transformedUrl: req.url,
        account_id: req.account_id,
        mount: 'api_base_url',
      });
    }

    next();
  },
  routes,
);

// FlowEditor API routes with floweditor-api prefix
// This handles requests from the frontend that use /floweditor-api/api/v1/accounts/:accountId
app.use(
  '/floweditor-api/api/v1/accounts/:accountId',
  (req, res, next) => {
    // Store account ID from URL params for downstream middleware
    req.accountId = req.params.accountId;
    req.account_id = parseInt(req.params.accountId);

    // Strip the /floweditor-api/api/v1/accounts/:accountId prefix so downstream routers match /flow_editor/*
    const floweditorApiPrefix = `/floweditor-api/api/v1/accounts/${req.params.accountId}`;
    if (req.originalUrl.startsWith(floweditorApiPrefix)) {
      req.url = req.originalUrl.substring(floweditorApiPrefix.length) || '/';
      logger.info('Account URL transformed (floweditor-api mount)', {
        originalUrl: req.originalUrl,
        transformedUrl: req.url,
        account_id: req.account_id,
        mount: 'floweditor_api',
      });
    }

    next();
  },
  routes,
);

// API routes (generic, must come AFTER specific account routes)
app.use(API_BASE_URL, routes);

// Netlify Functions compatibility layer
app.use('/.netlify/functions', routes);

// Additional API routes for FlowEditor compatibility
app.use('/api', routes);

// Serve static files from the build directory with proper MIME types
app.use(
  express.static(BUILD_PATH, {
    setHeaders: (res, path) => {
      // Set proper MIME types for JavaScript modules
      if (path.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      } else if (path.endsWith('.mjs')) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      } else if (path.endsWith('.ts')) {
        // Treat .ts files as JavaScript modules (they should be compiled to JS)
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      } else if (path.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
      } else if (path.endsWith('.json')) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
      } else if (path.endsWith('.html')) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
      }
    },
  }),
);

// Serve FlowEditor UI for all non-API routes
app.get('*', (req, res, next) => {
  // Skip API routes, Netlify functions, flow editor routes, and captain routes
  if (req.path.startsWith(API_BASE_URL) || req.path.startsWith('/.netlify/functions') || req.path.startsWith('/flow_editor') || req.path.startsWith('/captain')) {
    return next();
  }

  // Serve index.html for all other routes (SPA routing)
  res.sendFile(path.join(BUILD_PATH, 'index.html'), err => {
    if (err) {
      logger.error('Error serving index.html', {
        error: err.message,
        path: req.path,
      });
      res.status(500).json({
        success: false,
        error: 'Failed to serve FlowEditor UI',
        code: 'UI_SERVE_ERROR',
      });
    }
  });
});

// Global error handler
app.use(errorLogger);
app.use((error, req, res, next) => {
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
  });

  res.status(error.status || 500).json({
    success: false,
    error:
      process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : error.message,
    code: 'INTERNAL_ERROR',
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    code: 'ROUTE_NOT_FOUND',
    path: req.originalUrl,
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

// Start server
const HOST = process.env.HOST || '0.0.0.0';
const server = app.listen(PORT, HOST, () => {
  logger.info(`FlowEditor Server started on ${HOST}:${PORT}`, {
    host: HOST,
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    api_base_url: API_BASE_URL,
  });
});

export default app;
