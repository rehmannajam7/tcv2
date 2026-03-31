const signBunny = require('sign-bunny');
const { getOpts } = require('./utils');

// Account-specific flow data - in a real implementation, this would come from a database
const accountFlows = {
  '1': [
    {
      uuid: '9ecc8e84-6b83-442b-a04a-8094d5de997b',
      name: 'Account 1 - Customer Service',
      type: 'message',
      archived: false,
      labels: [],
      expires: 10080,
    },
    {
      uuid: 'a4f64f1b-85bc-477e-b706-de313a022979',
      name: 'Account 1 - Welcome Flow',
      type: 'message',
      archived: false,
      labels: [],
      expires: 10080,
    },
  ],
  '2': [
    {
      uuid: 'b5f64f1b-85bc-477e-b706-de313a022980',
      name: 'Account 2 - Support Flow',
      type: 'message',
      archived: false,
      labels: [],
      expires: 10080,
    },
  ],
  '3': [
    {
      uuid: 'c6f64f1b-85bc-477e-b706-de313a022981',
      name: 'Account 3 - Sales Flow',
      type: 'message',
      archived: false,
      labels: [],
      expires: 10080,
    },
  ],
};

// Account-specific flow content
const accountFlowContent = {
  '1': {
    '9ecc8e84-6b83-442b-a04a-8094d5de997b': {
      name: 'Account 1 - Customer Service',
      type: 'message',
      uuid: '9ecc8e84-6b83-442b-a04a-8094d5de997b',
      nodes: [],
    },
    'a4f64f1b-85bc-477e-b706-de313a022979': {
      name: 'Account 1 - Welcome Flow',
      type: 'message',
      uuid: 'a4f64f1b-85bc-477e-b706-de313a022979',
      nodes: [],
    },
  },
  '2': {
    'b5f64f1b-85bc-477e-b706-de313a022980': {
      name: 'Account 2 - Support Flow',
      type: 'message',
      uuid: 'b5f64f1b-85bc-477e-b706-de313a022980',
      nodes: [],
    },
  },
  '3': {
    'c6f64f1b-85bc-477e-b706-de313a022981': {
      name: 'Account 3 - Sales Flow',
      type: 'message',
      uuid: 'c6f64f1b-85bc-477e-b706-de313a022981',
      nodes: [],
    },
  },
};

const getFlow = (accountId, uuid) => {
  const accountContent = accountFlowContent[accountId];
  if (accountContent && accountContent[uuid]) {
    return accountContent[uuid];
  }
  return false;
};

const notFoundHandler = cb =>
  cb(null, getOpts({ statusCode: 404, body: signBunny('not found') }));

const flowsHandler = (req = {}, cb) => {
  console.log(
    'Flows handler called with request:',
    JSON.stringify(req, null, 2),
  );

  // Handle preflight OPTIONS requests
  if (req.httpMethod === 'OPTIONS') {
    return cb(null, getOpts({ statusCode: 200 }));
  }

  // Extract account ID from headers
  const headers = req.headers || {};
  const accountId = headers['x-account-id'] || headers['X-Account-ID'] || '1';

  console.log('Processing request for account:', accountId);

  const method = req.httpMethod || req.method || 'GET';

  // Parse UUID from path - handle both direct function calls and API redirects
  let uuid = '';
  const path = req.path || '';
  console.log('Request path:', path);

  // Check if path contains a UUID (after /flows/)
  const flowsMatch = path.match(/\/flows\/([^\/]+)$/);
  if (flowsMatch) {
    uuid = flowsMatch[1];
    console.log('Extracted UUID from path:', uuid);
  } else {
    console.log('No UUID found in path, treating as list request');
  }

  // Handle POST requests (create new flow)
  if (method === 'POST') {
    try {
      const body =
        typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      console.log('Creating new flow for account', accountId, ':', body);

      // Generate new UUID for the flow
      const newUuid = require('crypto').randomUUID();

      // Create new flow object
      const newFlow = {
        uuid: newUuid,
        name: body.name || 'Untitled Flow',
        type: body.type || 'message',
        archived: false,
        labels: body.labels || [],
        expires: body.expires || 10080,
      };

      // Add to account flows list
      if (!accountFlows[accountId]) {
        accountFlows[accountId] = [];
      }
      accountFlows[accountId].push(newFlow);

      // Add flow content
      const newFlowContent = {
        name: newFlow.name,
        type: newFlow.type,
        uuid: newUuid,
        nodes: body.nodes || [],
        _ui: body._ui || null,
        revision: 1,
        spec_version: '13.1.0',
        language: 'base',
        localization: {},
      };

      if (!accountFlowContent[accountId]) {
        accountFlowContent[accountId] = {};
      }
      accountFlowContent[accountId][newUuid] = newFlowContent;

      console.log('Flow created successfully:', newFlow);
      return cb(
        null,
        getOpts({
          statusCode: 201,
          body: JSON.stringify(newFlowContent),
        }),
      );
    } catch (error) {
      console.error('Error creating flow:', error);
      return cb(
        null,
        getOpts({
          statusCode: 400,
          body: JSON.stringify({ error: 'Invalid request body' }),
        }),
      );
    }
  }

  // Handle PUT requests (update existing flow)
  if (method === 'PUT' && uuid) {
    try {
      const body =
        typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      console.log('Updating flow for account', accountId, 'uuid:', uuid);

      // Check if flow exists
      const existingFlow = getFlow(accountId, uuid);
      if (!existingFlow) {
        console.log('Flow not found for update:', uuid);
        return notFoundHandler(cb);
      }

      // Update flow content
      const updatedFlowContent = {
        ...existingFlow,
        name: body.name || existingFlow.name,
        type: body.type || existingFlow.type,
        nodes: body.nodes || existingFlow.nodes,
        _ui: body._ui || existingFlow._ui,
        revision: (existingFlow.revision || 1) + 1,
      };

      // Update in storage
      accountFlowContent[accountId][uuid] = updatedFlowContent;

      // Update in flows list
      const flowIndex = accountFlows[accountId].findIndex(f => f.uuid === uuid);
      if (flowIndex !== -1) {
        accountFlows[accountId][flowIndex].name = updatedFlowContent.name;
        accountFlows[accountId][flowIndex].type = updatedFlowContent.type;
      }

      console.log('Flow updated successfully:', updatedFlowContent.name);
      return cb(
        null,
        getOpts({
          body: JSON.stringify(updatedFlowContent),
        }),
      );
    } catch (error) {
      console.error('Error updating flow:', error);
      return cb(
        null,
        getOpts({
          statusCode: 400,
          body: JSON.stringify({ error: 'Invalid request body' }),
        }),
      );
    }
  }

  // Handle GET requests
  if (uuid) {
    // Return specific flow for the account
    const flowContent = getFlow(accountId, uuid);
    if (flowContent) {
      console.log(
        'Returning flow for account',
        accountId,
        ':',
        flowContent.name,
      );
      return cb(null, getOpts({ body: JSON.stringify(flowContent) }));
    }
    console.log('Flow not found for account', accountId, 'and uuid', uuid);
    return notFoundHandler(cb);
  }

  // Return flow list for the account
  const accountFlowList = accountFlows[accountId] || [];
  console.log(
    'Returning',
    accountFlowList.length,
    'flows for account',
    accountId,
  );
  return cb(
    null,
    getOpts({ body: JSON.stringify({ results: accountFlowList }) }),
  );
};

exports.handler = (evt, ctx, cb) => flowsHandler(evt, cb);
