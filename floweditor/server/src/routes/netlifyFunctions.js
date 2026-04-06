import express from 'express';
import path from 'path';
import fs from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import vm from 'vm';
import {
  authenticateChatwootToken,
  requireChatwootAccountAccess,
} from '../middleware/chatwootAuth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Apply Chatwoot authentication and account access middleware to all routes
// EXCEPT for auth routes, activity endpoint, and flow_editor proxy routes
router.use((req, res, next) => {
  // Skip authentication for auth routes, activity endpoint, and flow_editor proxy routes
  if (
    req.path.startsWith('/auth/') ||
    req.path === '/auth' ||
    req.path === '/activity' ||
    req.path.includes('/activity') ||
    req.path.startsWith('/flow_editor/')
  ) {
    return next();
  }

  // Apply authentication for all other routes
  authenticateChatwootToken(req, res, err => {
    if (err) return next(err);
    requireChatwootAccountAccess(req, res, next);
  });
});

// Create a require function for loading lambda functions
const requireFromLambda = createRequire(
  path.join(__dirname, '../../../lambda/'),
);

// Helper function to load and execute lambda functions
const loadLambdaFunction = async (functionName, event = {}, context = {}) => {
  try {
    const lambdaPath = path.join(
      __dirname,
      '../../../lambda',
      `${functionName}.js`,
    );

    // Read the lambda function file and evaluate it in a proper context
    const lambdaCode = fs.readFileSync(lambdaPath, 'utf8');

    // Create a module context with require and exports
    const lambdaRequire = createRequire(lambdaPath);
    const moduleContext = {
      require: lambdaRequire,
      exports: {},
      module: { exports: {} },
      __filename: lambdaPath,
      __dirname: path.dirname(lambdaPath),
      console: console,
      process: process,
      Buffer: Buffer,
      global: global,
    };

    // Execute the lambda function code in the context
    const script = new vm.Script(lambdaCode, { filename: lambdaPath });
    script.runInNewContext(moduleContext);

    const lambdaFunction = moduleContext.module.exports;

    // Check for handler in both module.exports and exports
    const handler = lambdaFunction.handler || moduleContext.exports.handler;

    if (handler) {
      return new Promise((resolve, reject) => {
        handler(event, context, (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        });
      });
    } else {
      throw new Error(`No handler function found in ${functionName}.js`);
    }
  } catch (error) {
    console.error(`Error loading lambda function ${functionName}:`, error);
    throw error;
  }
};

// Helper function to load static data files
const loadLambdaData = filename => {
  try {
    const dataPath = path.join(__dirname, '../../../lambda', filename);
    const data = fs.readFileSync(dataPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error loading data file ${filename}:`, error);
    return [];
  }
};

// Knowledge bases endpoint
router.get('/knowledge_bases', (req, res) => {
  try {
    const knowledgeBases = [
      {
        id: 1,
        name: 'General Knowledge',
        description: 'General knowledge base for common queries',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 2,
        name: 'Product Information',
        description: 'Product-specific knowledge base',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    res.json({
      statusCode: 200,
      body: JSON.stringify({
        results: knowledgeBases,
        count: knowledgeBases.length,
        next: null,
        previous: null,
      }),
    });
  } catch (error) {
    console.error('Error in knowledge_bases endpoint:', error);
    res.status(500).json({
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    });
  }
});

// Knowledge bases endpoint for flow_editor path (frontend expects this)
router.get('/flow_editor/knowledge_bases', (req, res) => {
  try {
    const knowledgeBases = [
      {
        id: 1,
        name: 'General Knowledge',
        description: 'General knowledge base for common queries',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 2,
        name: 'Product Information',
        description: 'Product-specific knowledge base',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    res.json({
      statusCode: 200,
      body: JSON.stringify({
        results: knowledgeBases,
        count: knowledgeBases.length,
        next: null,
        previous: null,
      }),
    });
  } catch (error) {
    console.error('Error in flow_editor/knowledge_bases endpoint:', error);
    res.status(500).json({
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    });
  }
});

// Captain assistants are served by Chatwoot API via proxy; no local mock

// Full path endpoints for frontend compatibility
// These handle the /api/v1/accounts/{accountId}/ paths that the frontend expects

// Full path for knowledge bases
router.get('/api/v1/accounts/:accountId/flow_editor/knowledge_bases', (req, res) => {
  try {
    const knowledgeBases = [
      {
        id: 1,
        name: 'General Knowledge',
        description: 'General knowledge base for common queries',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 2,
        name: 'Product Information',
        description: 'Product-specific knowledge base',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    res.json({
      statusCode: 200,
      body: JSON.stringify({
        results: knowledgeBases,
        count: knowledgeBases.length,
        next: null,
        previous: null,
      }),
    });
  } catch (error) {
    console.error('Error in full path knowledge_bases endpoint:', error);
    res.status(500).json({
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    });
  }
});

// Captain assistants full path is proxied by Chatwoot; no local mock

// Completion endpoint
router.get('/completion', (req, res) => {
  try {
    const completions = [
      {
        text: 'Hello, how can I help you?',
        confidence: 0.95,
        type: 'greeting',
      },
      {
        text: 'Thank you for contacting us',
        confidence: 0.9,
        type: 'acknowledgment',
      },
      {
        text: 'Is there anything else I can help you with?',
        confidence: 0.85,
        type: 'follow_up',
      },
    ];

    res.json({
      statusCode: 200,
      body: JSON.stringify({
        results: completions,
        count: completions.length,
      }),
    });
  } catch (error) {
    console.error('Error in completion endpoint:', error);
    res.status(500).json({
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    });
  }
});

// WhatsApp flows endpoint
router.get('/whatsapp_flows', (req, res) => {
  try {
    const whatsappFlows = [
      {
        id: 1,
        name: 'Welcome Flow',
        description: 'Initial welcome message flow',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 2,
        name: 'Support Flow',
        description: 'Customer support flow',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    res.json({
      statusCode: 200,
      body: JSON.stringify({
        results: whatsappFlows,
        count: whatsappFlows.length,
        next: null,
        previous: null,
      }),
    });
  } catch (error) {
    console.error('Error in whatsapp_flows endpoint:', error);
    res.status(500).json({
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    });
  }
});

// Flows.json endpoint
router.get('/flows.json', (req, res) => {
  try {
    const flows = loadLambdaData('flows.json') || [];
    res.json({
      statusCode: 200,
      body: JSON.stringify({
        results: flows,
        count: flows.length,
      }),
    });
  } catch (error) {
    console.error('Error in flows.json endpoint:', error);
    res.status(500).json({
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    });
  }
});

// Flows endpoint
router.get('/flows', (req, res) => {
  try {
    const flows = loadLambdaData('flows.json') || [];
    res.json({
      statusCode: 200,
      body: JSON.stringify({
        results: flows,
        count: flows.length,
        next: null,
        previous: null,
      }),
    });
  } catch (error) {
    console.error('Error in flows endpoint:', error);
    res.status(500).json({
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    });
  }
});

// Generic netlify function handler
const netlifyFunctionHandler = functionName => {
  return async (req, res) => {
    try {
      const event = {
        httpMethod: req.method,
        path: req.path,
        queryStringParameters: req.query,
        headers: req.headers,
        // Preserve exact body shape: raw string if present, object otherwise
        body:
          req.method !== 'GET'
            ? typeof req.rawBody === 'string'
              ? req.rawBody
              : typeof req.body === 'string'
              ? req.body
              : req.body
            : null,
      };

      const context = {
        functionName: functionName,
        requestId: req.id || 'unknown',
      };

      const result = await loadLambdaFunction(functionName, event, context);

      if (result && result.statusCode) {
        res.status(result.statusCode);
        if (result.headers) {
          Object.keys(result.headers).forEach(key => {
            res.set(key, result.headers[key]);
          });
        }
        res.send(result.body);
      } else {
        res.json(result);
      }
    } catch (error) {
      console.error(`Error in ${functionName} handler:`, error);
      res.status(500).json({
        statusCode: 500,
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    }
  };
};

// Register all netlify function routes
router.all('/fields', netlifyFunctionHandler('fields'));
router.all('/groups', netlifyFunctionHandler('groups'));
router.all('/activity', netlifyFunctionHandler('activity'));
router.all('/attachments', netlifyFunctionHandler('attachments'));
router.all('/contacts', netlifyFunctionHandler('contacts'));
router.all('/environment', netlifyFunctionHandler('environment'));
router.all('/functions', netlifyFunctionHandler('functions'));
router.all('/globals', netlifyFunctionHandler('globals'));
router.all('/labels', netlifyFunctionHandler('labels'));
router.all('/languages', netlifyFunctionHandler('languages'));
router.all('/recipients', netlifyFunctionHandler('recipients'));
router.all('/channels', netlifyFunctionHandler('channels'));
router.all('/templates', netlifyFunctionHandler('templates'));
router.all('/ticketer_queues', netlifyFunctionHandler('ticketer_queues'));
router.all('/whatsapp_products', netlifyFunctionHandler('whatsapp_products'));
router.all('/brain', netlifyFunctionHandler('brain'));
router.all('/simulate_start', netlifyFunctionHandler('simulate_start'));
router.all('/simulate_resume', netlifyFunctionHandler('simulate_resume'));
router.all('/revisions', netlifyFunctionHandler('revisions'));
router.all('/classifiers', netlifyFunctionHandler('classifiers'));
router.all('/resthooks', netlifyFunctionHandler('resthooks'));
router.all('/editor', netlifyFunctionHandler('editor'));
router.all('/flows', netlifyFunctionHandler('flows'));

export default router;
