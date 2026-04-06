const signBunny = require('sign-bunny');
const { getOpts } = require('./utils');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Simple file-based storage for now since we can't install sqlite3
const dbPath = path.join(__dirname, '..', 'flows.json');

// Helper functions for file-based storage
const readFlows = () => {
  try {
    if (fs.existsSync(dbPath)) {
      const data = fs.readFileSync(dbPath, 'utf8');
      return JSON.parse(data);
    }
    return {};
  } catch (error) {
    console.error('Error reading flows:', error);
    return {};
  }
};

const writeFlows = flows => {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(flows, null, 2));
  } catch (error) {
    console.error('Error writing flows:', error);
  }
};

// Helper function to format flow data for FlowEditor
const formatFlowForEditor = flow => {
  const definitionJson =
    typeof flow.definition_json === 'string'
      ? JSON.parse(flow.definition_json)
      : flow.definition_json || {};

  return {
    uuid: flow.uuid,
    name: flow.name,
    type: definitionJson.type || 'message',
    archived: flow.status === 'archived',
    labels: definitionJson.labels || [],
    expires: definitionJson.expires || 10080,
    nodes: definitionJson.nodes || [],
    ...definitionJson,
  };
};

// Helper function to format flow list item
const formatFlowListItem = flow => {
  const definitionJson =
    typeof flow.definition_json === 'string'
      ? JSON.parse(flow.definition_json)
      : flow.definition_json || {};

  return {
    uuid: flow.uuid,
    name: flow.name,
    type: definitionJson.type || 'message',
    archived: flow.status === 'archived',
    labels: definitionJson.labels || [],
    expires: definitionJson.expires || 10080,
  };
};

const getFlow = async (accountId, uuid) => {
  try {
    const flow = await db('flow_definitions')
      .where({ uuid, account_id: accountId })
      .first();

    if (flow) {
      return formatFlowForEditor(flow);
    }
    return false;
  } catch (error) {
    console.error('Error fetching flow:', error);
    return false;
  }
};

const notFoundHandler = cb =>
  cb(null, getOpts({ statusCode: 404, body: signBunny('not found') }));

const flowDefinitionsHandler = async event => {
  const method = event.httpMethod || event.method || 'GET';
  const path = event.path || event.rawUrl || '';
  const headers = event.headers || {};
  const accountId = headers['X-Account-ID'] || headers['x-account-id'];

  console.log('Flow definitions handler called:', { method, path, accountId });

  // Handle preflight OPTIONS requests
  if (method === 'OPTIONS') {
    return getOpts({ statusCode: 200 });
  }

  if (!accountId) {
    return getOpts({
      statusCode: 400,
      body: JSON.stringify({ error: 'X-Account-ID header is required' }),
    });
  }

  try {
    const allFlows = readFlows();
    const accountFlows = allFlows[accountId] || {};

    if (method === 'GET') {
      // Extract UUID from path if present
      const pathParts = path.split('/');
      const uuid = pathParts[pathParts.length - 1];

      if (uuid && uuid !== 'flow-definitions') {
        // Get specific flow
        const flow = accountFlows[uuid];

        if (!flow) {
          return getOpts({
            statusCode: 404,
            body: JSON.stringify({ error: 'Flow not found' }),
          });
        }

        return getOpts({
          statusCode: 200,
          body: JSON.stringify(formatFlowForEditor(flow)),
        });
      } else {
        // Get all flows for account
        const flows = Object.values(accountFlows);
        const formattedFlows = flows.map(formatFlowListItem);

        return getOpts({
          statusCode: 200,
          body: JSON.stringify({ results: formattedFlows }),
        });
      }
    } else if (method === 'POST') {
      // Create new flow
      const body = JSON.parse(event.body || '{}');
      const uuid = uuidv4();
      const now = new Date().toISOString();

      const newFlow = {
        uuid,
        name: body.name || 'Untitled Flow',
        definition_json: JSON.stringify(body),
        account_id: accountId,
        status: 'active',
        created_at: now,
        updated_at: now,
      };

      if (!allFlows[accountId]) {
        allFlows[accountId] = {};
      }
      allFlows[accountId][uuid] = newFlow;
      writeFlows(allFlows);

      return getOpts({
        statusCode: 201,
        body: JSON.stringify(formatFlowForEditor(newFlow)),
      });
    } else if (method === 'PUT') {
      // Update existing flow or create if it doesn't exist
      const pathParts = path.split('/');
      const uuid = pathParts[pathParts.length - 1];
      const body = JSON.parse(event.body || '{}');
      const now = new Date().toISOString();

      // Ensure account flows object exists
      if (!allFlows[accountId]) {
        allFlows[accountId] = {};
      }

      let updatedFlow;
      let statusCode = 200;

      if (!accountFlows[uuid]) {
        // Create new flow if it doesn't exist
        updatedFlow = {
          uuid: uuid,
          name: body.name || 'Untitled Flow',
          definition_json: JSON.stringify(body.definition_json || body),
          account_id: accountId,
          status: body.status || 'active',
          created_at: now,
          updated_at: now,
        };
        statusCode = 201; // Created
      } else {
        // Update existing flow
        updatedFlow = {
          ...accountFlows[uuid],
          name: body.name || accountFlows[uuid].name,
          definition_json: JSON.stringify(body.definition_json || body),
          status: body.status || accountFlows[uuid].status,
          updated_at: now,
        };
      }

      allFlows[accountId][uuid] = updatedFlow;
      writeFlows(allFlows);

      return getOpts({
        statusCode: statusCode,
        body: JSON.stringify(formatFlowForEditor(updatedFlow)),
      });
    } else if (method === 'DELETE') {
      // Delete flow
      const pathParts = path.split('/');
      const uuid = pathParts[pathParts.length - 1];

      if (!accountFlows[uuid]) {
        return getOpts({
          statusCode: 404,
          body: JSON.stringify({ error: 'Flow not found' }),
        });
      }

      delete allFlows[accountId][uuid];
      writeFlows(allFlows);

      return getOpts({
        statusCode: 204,
        body: '',
      });
    }
  } catch (error) {
    console.error('Storage error:', error);
    return getOpts({
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    });
  }

  return getOpts({
    statusCode: 405,
    body: JSON.stringify({ error: 'Method not allowed' }),
  });
};

exports.handler = (evt, ctx, cb) => {
  console.log(
    'Flow definitions handler called with event:',
    JSON.stringify(evt, null, 2),
  );

  flowDefinitionsHandler(evt)
    .then(result => {
      console.log('Handler result:', result);
      cb(null, result);
    })
    .catch(error => {
      console.error('Handler error:', error);
      cb(null, {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, X-Account-ID',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        },
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });
};
