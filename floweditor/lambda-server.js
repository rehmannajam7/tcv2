const http = require('http');
const fs = require('fs');
const path = require('path');

// Simple respond function to avoid ES module issues
const respond = (callback, body = {}) => {
  callback(null, {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
};

// Mock lambda functions that return appropriate responses
const mockLambdas = {
  fields: (event, context, callback) => {
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const snakify = value =>
        value
          .toLowerCase()
          .trim()
          .replace(/\s+(?=\S)/g, '_');
      respond(callback, {
        key: snakify(body.label || 'field'),
        name: body.label || 'field',
        value_type: 'text',
      });
    } else {
      respond(callback, { results: [] });
    }
  },

  groups: (event, context, callback) => {
    respond(callback, { results: [] });
  },

  activity: (event, context, callback) => {
    respond(callback, { results: [] });
  },

  attachments: (event, context, callback) => {
    respond(callback, { results: [] });
  },

  completion: (event, context, callback) => {
    respond(callback, { results: [] });
  },

  contacts: (event, context, callback) => {
    respond(callback, { results: [] });
  },

  environment: (event, context, callback) => {
    respond(callback, { results: [] });
  },

  flows: (event, context, callback) => {
    respond(callback, { results: [] });
  },

  globals: (event, context, callback) => {
    respond(callback, { results: [] });
  },

  labels: (event, context, callback) => {
    respond(callback, { results: [] });
  },

  languages: (event, context, callback) => {
    respond(callback, { results: [] });
  },

  recipients: (event, context, callback) => {
    respond(callback, { results: [] });
  },

  revisions: (event, context, callback) => {
    const method = event.httpMethod || 'GET';
    const body = event.body ? JSON.parse(event.body) : {};

    if (method === 'POST') {
      // Handle flow saving
      console.log('Saving flow revision:', body);

      // Generate a mock revision ID
      const revisionId = Date.now().toString();

      // Mock successful save response
      const saveResult = {
        id: revisionId,
        revision: 1,
        created_on: new Date().toISOString(),
        status: 'success',
        definition: body,
      };

      respond(callback, saveResult);
    } else {
      // Handle flow retrieval
      respond(callback, { results: [] });
    }
  },

  resthooks: (event, context, callback) => {
    respond(callback, { results: [] });
  },

  simulateStart: (event, context, callback) => {
    respond(callback, { results: [] });
  },

  simulateResume: (event, context, callback) => {
    respond(callback, { results: [] });
  },

  validate: (event, context, callback) => {
    respond(callback, { results: [] });
  },

  classifiers: (event, context, callback) => {
    respond(callback, { results: [] });
  },

  ticketers: (event, context, callback) => {
    respond(callback, { results: [] });
  },

  external_services: (event, context, callback) => {
    respond(callback, { results: [] });
  },

  knowledge_bases: (event, context, callback) => {
    respond(callback, { results: [] });
  },

  whatsapp_flows: (event, context, callback) => {
    respond(callback, { results: [] });
  },

  channels: (event, context, callback) => {
    respond(callback, { results: [] });
  },

  templates: (event, context, callback) => {
    respond(callback, { results: [] });
  },

  ticketer_queues: (event, context, callback) => {
    respond(callback, { results: [] });
  },

  whatsapp_products: (event, context, callback) => {
    respond(callback, { results: [] });
  },

  brain: (event, context, callback) => {
    respond(callback, { results: [] });
  },
};

// Load actual lambda functions
const loadLambdaFunction = name => {
  try {
    const lambdaPath = path.join(__dirname, 'lambda', `${name}.js`);
    if (fs.existsSync(lambdaPath)) {
      delete require.cache[require.resolve(lambdaPath)];
      return require(lambdaPath).handler;
    }
  } catch (error) {
    console.error(`Error loading lambda function ${name}:`, error);
  }
  return null;
};

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS',
  );
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Account-ID',
  );

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  let url = req.url;
  console.log('Request:', req.method, url);

  // Handle /api/ prefix by stripping it
  if (url.startsWith('/api/')) {
    url = url.substring(4); // Remove '/api' prefix
  }

  // Handle /.netlify/functions/ prefix by stripping it
  if (url.startsWith('/.netlify/functions/')) {
    url = url.substring(19); // Remove '/.netlify/functions' prefix
  }

  // Handle Chatwoot API structure: /v1/accounts/{accountId}/flow_editor/revisions/
  if (url.match(/^\/v1\/accounts\/\d+\/flow_editor\/revisions/)) {
    url = '/revisions';
  }

  // Handle Chatwoot API structure: /v1/accounts/{accountId}/flows
  if (url.match(/^\/v1\/accounts\/\d+\/flows/)) {
    url = '/flows';
  }

  // Map URL to lambda function
  let lambdaName = null;
  let lambdaFunction = null;

  if (url.startsWith('/flow-definitions')) {
    lambdaName = 'flow-definitions';
    lambdaFunction = loadLambdaFunction('flow-definitions');
  } else if (url.startsWith('/flows')) {
    lambdaName = 'flows';
    lambdaFunction = loadLambdaFunction('flows');
  } else if (url.startsWith('/fields')) {
    lambdaName = 'fields';
    lambdaFunction = loadLambdaFunction('fields') || mockLambdas.fields;
  } else if (url.startsWith('/groups')) {
    lambdaName = 'groups';
    lambdaFunction = loadLambdaFunction('groups') || mockLambdas.groups;
  } else if (url.startsWith('/activity')) {
    lambdaName = 'activity';
    lambdaFunction = loadLambdaFunction('activity') || mockLambdas.activity;
  } else if (url.startsWith('/attachments')) {
    lambdaName = 'attachments';
    lambdaFunction =
      loadLambdaFunction('attachments') || mockLambdas.attachments;
  } else if (url.startsWith('/completion')) {
    lambdaName = 'completion';
    lambdaFunction = loadLambdaFunction('completion') || mockLambdas.completion;
  } else if (url.startsWith('/contacts')) {
    lambdaName = 'contacts';
    lambdaFunction = loadLambdaFunction('contacts') || mockLambdas.contacts;
  } else if (url.startsWith('/environment')) {
    lambdaName = 'environment';
    lambdaFunction =
      loadLambdaFunction('environment') || mockLambdas.environment;
  } else if (url.startsWith('/globals')) {
    lambdaName = 'globals';
    lambdaFunction = loadLambdaFunction('globals') || mockLambdas.globals;
  } else if (url.startsWith('/labels')) {
    lambdaName = 'labels';
    lambdaFunction = loadLambdaFunction('labels') || mockLambdas.labels;
  } else if (url.startsWith('/languages')) {
    lambdaName = 'languages';
    lambdaFunction = loadLambdaFunction('languages') || mockLambdas.languages;
  } else if (url.startsWith('/recipients')) {
    lambdaName = 'recipients';
    lambdaFunction = loadLambdaFunction('recipients') || mockLambdas.recipients;
  } else if (url.startsWith('/revisions')) {
    lambdaName = 'revisions';
    lambdaFunction = loadLambdaFunction('revisions') || mockLambdas.revisions;
  } else if (url.startsWith('/resthooks')) {
    lambdaName = 'resthooks';
    lambdaFunction = loadLambdaFunction('resthooks') || mockLambdas.resthooks;
  } else if (url.startsWith('/simulateStart')) {
    lambdaName = 'simulateStart';
    lambdaFunction = mockLambdas.simulateStart;
  } else if (url.startsWith('/simulateResume')) {
    lambdaName = 'simulateResume';
    lambdaFunction = mockLambdas.simulateResume;
  } else if (url.startsWith('/validate')) {
    lambdaName = 'validate';
    lambdaFunction = mockLambdas.validate;
  } else if (url.startsWith('/classifiers')) {
    lambdaName = 'classifiers';
    lambdaFunction =
      loadLambdaFunction('classifiers') || mockLambdas.classifiers;
  } else if (url.startsWith('/ticketers')) {
    lambdaName = 'ticketers';
    lambdaFunction = loadLambdaFunction('ticketers') || mockLambdas.ticketers;
  } else if (url.startsWith('/external_services')) {
    lambdaName = 'external_services';
    lambdaFunction =
      loadLambdaFunction('external_services') || mockLambdas.external_services;
  } else if (url.startsWith('/knowledge_bases')) {
    lambdaName = 'knowledge_bases';
    lambdaFunction =
      loadLambdaFunction('knowledge_bases') || mockLambdas.knowledge_bases;
  } else if (url.startsWith('/whatsapp_flows')) {
    lambdaName = 'whatsapp_flows';
    lambdaFunction =
      loadLambdaFunction('whatsapp_flows') || mockLambdas.whatsapp_flows;
  } else if (url.startsWith('/channels')) {
    lambdaName = 'channels';
    lambdaFunction = loadLambdaFunction('channels') || mockLambdas.channels;
  } else if (url.startsWith('/templates')) {
    lambdaName = 'templates';
    lambdaFunction = loadLambdaFunction('templates') || mockLambdas.templates;
  } else if (url.startsWith('/ticketer_queues')) {
    lambdaName = 'ticketer_queues';
    lambdaFunction =
      loadLambdaFunction('ticketer_queues') || mockLambdas.ticketer_queues;
  } else if (url.startsWith('/whatsapp_products')) {
    lambdaName = 'whatsapp_products';
    lambdaFunction =
      loadLambdaFunction('whatsapp_products') || mockLambdas.whatsapp_products;
  } else if (url.startsWith('/brain')) {
    lambdaName = 'brain';
    lambdaFunction = loadLambdaFunction('brain') || mockLambdas.brain;
  }

  if (lambdaName && lambdaFunction) {
    try {
      let body = '';
      req.on('data', chunk => (body += chunk));
      req.on('end', () => {
        const event = {
          httpMethod: req.method,
          path: url,
          queryStringParameters: {},
          headers: req.headers,
          body: body,
        };

        const context = {};
        const callback = (err, result) => {
          if (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          } else {
            res.writeHead(result.statusCode || 200, {
              'Content-Type': 'application/json',
            });
            res.end(result.body);
          }
        };

        lambdaFunction(event, context, callback);
      });
    } catch (error) {
      console.error('Lambda error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Route not found: ' + url }));
  }
});

server.listen(6000, () => {
  console.log('Lambda functions server running on port 6000');
});
