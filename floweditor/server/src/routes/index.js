import express from 'express';
import flowDefinitionsRoutes from './flowDefinitions.js';
import netlifyFunctionsRoutes from './netlifyFunctions.js';
import authRoutes from './auth.js';
import { createChatwootProxyRoutes, proxyChatwootRequest } from '../middleware/chatwootProxy.js';

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  const response = {
    success: true,
    message: 'FlowEditor Server is running',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  };

  res.setHeader('Content-Type', 'application/json');
  res.status(200).send(JSON.stringify(response, null, 2) + '\n');
});

// Add Chatwoot proxy routes for FlowEditor API endpoints
// After URL transformation, /api/v1/accounts/1/flow_editor/flows becomes /flow_editor/flows
const flowEditorRouter = express.Router({ mergeParams: true });
createChatwootProxyRoutes(flowEditorRouter);

// Add separate router for captain routes
const captainRouter = express.Router({ mergeParams: true });
captainRouter.all('/assistants', proxyChatwootRequest);
captainRouter.all('/assistants/*', proxyChatwootRequest);

// Use proxy routes first to handle unauthenticated requests in development
router.use('/flow_editor', flowEditorRouter);
router.use('/captain', captainRouter);

// Handle flows specifically with local flowDefinitions router
// This comes after proxy routes so authenticated requests can still use the database
router.use('/flow_editor/flows', flowDefinitionsRoutes);

// API routes (these must come before the catch-all netlify routes)
router.use('/auth', authRoutes);
router.use('/flow-definitions', flowDefinitionsRoutes);

// Remove static knowledge base and captain assistant routes; proxy handles these

// Netlify Functions routes (for compatibility with FlowEditor frontend)
// Note: This is a catch-all route, so it must come after specific routes
router.use('/', netlifyFunctionsRoutes);

export default router;
