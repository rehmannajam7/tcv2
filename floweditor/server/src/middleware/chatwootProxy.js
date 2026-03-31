import fetch from 'node-fetch';
import logger from '../config/logger.js';

// Chatwoot API base URL
const CHATWOOT_API_BASE =
  process.env.CHATWOOT_API_BASE || 'http://localhost:3000';

/**
 * Middleware to proxy requests to Chatwoot API
 * This allows FlowEditor frontend to make API calls through its own backend
 * instead of directly to Chatwoot, avoiding CORS issues in iframe embedding
 */
export const proxyChatwootRequest = async (req, res, next) => {
  try {
    // Short-circuit CORS preflight requests to avoid proxying OPTIONS
    if (req.method === 'OPTIONS') {
      const origin = req.headers.origin || '*';
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader(
        'Access-Control-Allow-Methods',
        'GET,POST,PUT,DELETE,OPTIONS,PATCH',
      );
      res.setHeader(
        'Access-Control-Allow-Headers',
        [
          'Content-Type',
          'Authorization',
          'X-Requested-With',
          'X-Account-ID',
          'access-token',
          'client',
          'uid',
          'token-type',
          'expiry',
          'api_access_token',
          'api-access-token',
          'x-api-access-token',
        ].join(', '),
      );
      res.setHeader('Access-Control-Max-Age', '86400');
      return res.status(204).end();
    }
    // Extract authentication token from request headers
    const accessToken =
      req.headers['api_access_token'] ||
      req.headers['api-access-token'] ||
      req.headers['x-api-access-token'];

    const authHeader = req.headers['authorization'];
    const bearerToken = authHeader && authHeader.split(' ')[1];
    // Also support tokens passed via query string for iframe integrations
    const queryToken =
      req.query.token ||
      req.query['api_access_token'] ||
      req.query['api-access-token'] ||
      req.query['x-api-access-token'];

    const token = accessToken || bearerToken || queryToken;

    // Get account ID from multiple sources
    const accountId =
      req.account_id ||
      req.accountId ||
      req.params.accountId ||
      req.headers['x-account-id'] ||
      req.query.account_id;

    logger.info('Proxy request debug', {
      method: req.method,
      originalUrl: req.originalUrl,
      url: req.url,
      params: req.params,
      account_id: req.account_id,
      accountId: req.accountId,
      extractedAccountId: accountId,
      tokenSources: {
        hasHeaderBearer: !!bearerToken,
        hasHeaderAccessToken: !!accessToken,
        hasQueryToken: !!queryToken,
      },
      headers: {
        'x-account-id': req.headers['x-account-id'],
      },
    });

    // For development/testing, bypass token validation but still require account ID
    if (!accountId) {
      logger.warn('Proxy request failed: No account ID found', {
        method: req.method,
        originalUrl: req.originalUrl,
        params: req.params,
        headers: req.headers,
      });
      return res.status(400).json({
        success: false,
        error: 'Account ID required',
        code: 'ACCOUNT_ID_REQUIRED',
      });
    }

    // In development mode without authentication, return mock data for flows endpoint
    if (
      (process.env.NODE_ENV === 'development' || process.env.BYPASS_AUTH === 'true') &&
      !token &&
      (req.url === '/flows' || req.url.startsWith('/flows?')) &&
      req.method === 'GET'
    ) {
      logger.info('Development mode: Returning mock flows data', {
        accountId: accountId,
        url: req.url,
      });

      return res.json({
        results: [
          {
            uuid: "4f5988fe-b103-472e-a8e7-344220923f04",
            name: "Sample Flow",
            type: "messaging",
            created_on: "2024-01-01T00:00:00.000Z",
            modified_on: "2024-01-01T00:00:00.000Z",
            archived: false,
            expires: 10080,
            runs: {
              active: 0,
              completed: 0,
              interrupted: 0,
              expired: 0
            }
          }
        ]
      });
    }

    // In development mode without authentication, return mock data for channels endpoint
    if (
      (process.env.NODE_ENV === 'development' || process.env.BYPASS_AUTH === 'true') &&
      !token &&
      (req.url === '/channels' || req.url.startsWith('/channels?')) &&
      req.method === 'GET'
    ) {
      logger.info('Development mode: Returning mock channels data', {
        accountId: accountId,
        url: req.url,
      });

      return res.json({
        results: [
          {
            uuid: "459fe493-dca9-478b-bde7-a0d7a0e21e6c",
            name: "Twilio Channel",
            address: "+18005234545",
            schemes: ["tel"],
            roles: ["send", "receive", "call", "answer"]
          },
          {
            uuid: "channel-uuid-1",
            name: "WhatsApp Channel",
            address: "+1234567890",
            schemes: ["whatsapp"],
            roles: ["send", "receive"]
          },
          {
            uuid: "channel-uuid-2",
            name: "Telegram Channel",
            address: "@testbot",
            schemes: ["telegram"],
            roles: ["send", "receive"]
          },
          {
            uuid: "channel-uuid-3",
            name: "SMS Channel",
            address: "+9876543210",
            schemes: ["tel"],
            roles: ["send", "receive"]
          }
        ]
      });
    }

    // In development mode without authentication, return mock data for individual flow details endpoint
    if (
      (process.env.NODE_ENV === 'development' || process.env.BYPASS_AUTH === 'true') &&
      !token &&
      (req.url.match(/\/flows\/[^\/]+$/) || req.originalUrl.includes('/flow_editor/flows/')) &&
      req.method === 'GET'
    ) {
      logger.info('Development mode: Returning mock flow details data', {
        accountId: accountId,
        url: req.url,
      });

      // Extract flow UUID from URL
      const flowUuid = req.originalUrl.includes('/flow_editor/flows/') 
        ? req.originalUrl.split('/flows/').pop().split('?')[0]
        : req.url.split('/').pop();

      return res.json({
        uuid: flowUuid,
        name: "Demo Flow",
        type: "messaging",
        created_on: "2024-01-01T00:00:00.000Z",
        modified_on: "2024-01-01T00:00:00.000Z",
        archived: false,
        expires: 10080,
        definition_json: {
          localization: {},
          language: "eng",
          name: "Demo Flow",
          uuid: flowUuid,
          spec_version: "13.1.0",
          nodes: [
            {
              uuid: "start_node",
              actions: [
                {
                  uuid: "start_action",
                  type: "send_msg",
                  text: "Welcome! This is a demo flow with actual nodes."
                }
              ],
              exits: [
                {
                  name: null,
                  uuid: "start_exit",
                  destination_uuid: "response_node"
                }
              ]
            },
            {
              uuid: "response_node",
              router: {
                type: "switch",
                default_category_uuid: "response_exit_other",
                cases: [
                  {
                    uuid: "response_case_yes",
                    type: "has_any_word",
                    exit_uuid: "response_exit_yes",
                    arguments: ["yes", "y", "ok", "sure"]
                  },
                  {
                    uuid: "response_case_no",
                    type: "has_any_word",
                    exit_uuid: "response_exit_no",
                    arguments: ["no", "n", "nope"]
                  }
                ],
                wait: {
                  type: "msg"
                },
                operand: "@run.input",
                result_name: "user_response"
              },
              exits: [
                {
                  name: "Yes",
                  uuid: "response_exit_yes",
                  destination_uuid: "end_node"
                },
                {
                  name: "No",
                  uuid: "response_exit_no",
                  destination_uuid: "end_node"
                },
                {
                  name: "Other",
                  uuid: "response_exit_other",
                  destination_uuid: "end_node"
                }
              ]
            },
            {
              uuid: "end_node",
              actions: [
                {
                  uuid: "end_action",
                  type: "send_msg",
                  text: "Thank you for trying the demo flow!"
                }
              ],
              exits: [
                {
                  name: null,
                  uuid: "end_exit",
                  destination_uuid: null
                }
              ]
            }
          ],
          _ui: {
            nodes: {
              start_node: {
                position: {
                  left: 100,
                  top: 100,
                  right: 320,
                  bottom: 200
                }
              },
              response_node: {
                position: {
                  left: 100,
                  top: 250,
                  right: 320,
                  bottom: 380
                },
                type: "wait_for_response"
              },
              end_node: {
                position: {
                  left: 100,
                  top: 430,
                  right: 320,
                  bottom: 530
                }
              }
            },
            languages: [],
            stickies: {}
          }
        }
      });
    }

    // In development mode without authentication, return mock success for save_revision endpoint
    if (
      (process.env.NODE_ENV === 'development' || process.env.BYPASS_AUTH === 'true') &&
      !token &&
      req.url.includes('/save_revision') &&
      req.method === 'POST'
    ) {
      logger.info('Development mode: Returning mock save_revision success', {
        accountId: accountId,
        url: req.url,
        method: req.method,
      });

      return res.json({
        id: req.body?.definition_json?.uuid || 'mock-uuid',
        saved_on: new Date().toISOString(),
        revision_number: Date.now(),
        success: true,
        data: {
          uuid: req.body?.definition_json?.uuid || 'mock-uuid',
          name: req.body?.definition_json?.name || 'Mock Flow',
          revision: Date.now(),
          saved_at: new Date().toISOString(),
        },
        message: 'Mock save_revision success for development',
      });
    }

    // In development mode without authentication, return mock data for simulate_start endpoint
    if (
      (process.env.NODE_ENV === 'development' || process.env.BYPASS_AUTH === 'true') &&
      !token &&
      req.url.includes('/simulate_start') &&
      req.method === 'POST'
    ) {
      logger.info('Development mode: Returning mock simulate_start data', {
        accountId: accountId,
        url: req.url,
        method: req.method,
      });

      return res.json({
        contact: {
          uuid: "6e38eba0-d673-4a35-82df-21bae2b6d466",
          urns: ["tel:+1234567890"],
          fields: {
            first_name: "John",
            last_name: "Doe"
          },
          groups: [
            {
              uuid: "9ecc8e84-6b83-442b-a04a-8094d5de997b",
              name: "Customer Service"
            }
          ]
        },
        session: {
          contact: {
            uuid: "6e38eba0-d673-4a35-82df-21bae2b6d466",
            urns: ["tel:+1234567890"],
            fields: {
              first_name: "John",
              last_name: "Doe"
            },
            groups: [
              {
                uuid: "9ecc8e84-6b83-442b-a04a-8094d5de997b",
                name: "Customer Service"
              }
            ]
          },
          runs: [
            {
              path: [
                {
                  arrived_on: "2020-01-29T10:43:31.123456789Z",
                  uuid: "6de81ff6-f541-4099-8ad7-03214d15b07e",
                  exit_uuid: "6de81ff6-f541-4099-8ad7-03214d15b18e",
                  node_uuid: "6de81ff6-f541-4099-8ad7-03214d15b07d"
                }
              ],
              flow_uuid: "6de81ff6-f541-4099-8ad7-03214d15b18e",
              status: "waiting",
              events: [
                {
                  type: "msg_created",
                  msg: {
                    uuid: "c166c2cb-290c-4805-a5af-052ad2858288",
                    urn: "tel:+1123456789",
                    text: "Welcome to the flow simulator!"
                  },
                  uuid: "51e6f864-a16f-4be7-839f-945afc857559",
                  step_uuid: "6de81ff6-f541-4099-8ad7-03214d15b07e",
                  created_on: "2020-01-29T10:43:31.123456789Z"
                }
              ]
            }
          ]
        }
      });
    }

    // In development mode without authentication, return mock data for simulate_resume endpoint
    if (
      (process.env.NODE_ENV === 'development' || process.env.BYPASS_AUTH === 'true') &&
      !token &&
      req.url.includes('/simulate_resume') &&
      req.method === 'POST'
    ) {
      logger.info('Development mode: Returning mock simulate_resume data', {
        accountId: accountId,
        url: req.url,
        method: req.method,
      });

      return res.json({
        session: {
          contact: {
            uuid: "6e38eba0-d673-4a35-82df-21bae2b6d466",
            urns: ["tel:+1234567890"],
            fields: {
              first_name: "John",
              last_name: "Doe"
            },
            groups: [
              {
                uuid: "9ecc8e84-6b83-442b-a04a-8094d5de997b",
                name: "Customer Service"
              }
            ]
          },
          runs: [
            {
              path: [
                {
                  arrived_on: "2020-01-29T10:43:31.123456789Z",
                  uuid: "6de81ff6-f541-4099-8ad7-03214d15b07e",
                  exit_uuid: "6de81ff6-f541-4099-8ad7-03214d15b18e",
                  node_uuid: "6de81ff6-f541-4099-8ad7-03214d15b07d"
                }
              ],
              flow_uuid: "6de81ff6-f541-4099-8ad7-03214d15b18e",
              status: "completed",
              events: [
                {
                  type: "msg_created",
                  msg: {
                    uuid: "c166c2cb-290c-4805-a5af-052ad2858288",
                    urn: "tel:+1123456789",
                    text: "Flow resumed successfully!"
                  },
                  uuid: "51e6f864-a16f-4be7-839f-945afc857559",
                  step_uuid: "6de81ff6-f541-4099-8ad7-03214d15b07e",
                  created_on: "2020-01-29T10:43:31.123456789Z"
                }
              ]
            }
          ]
        }
      });
    }

    // In development mode without authentication, return mock data for contacts endpoint
    if (
      (process.env.NODE_ENV === 'development' || process.env.BYPASS_AUTH === 'true') &&
      !token &&
      req.url.includes('/contacts') &&
      req.method === 'GET'
    ) {
      logger.info('Development mode: Returning mock contacts data', {
        accountId: accountId,
        url: req.url,
        method: req.method,
      });

      return res.json({
        results: [
          {
            uuid: "6e38eba0-d673-4a35-82df-21bae2b6d466",
            name: "John Doe",
            urns: ["tel:+1234567890"],
            fields: {
              first_name: "John",
              last_name: "Doe",
              email: "john.doe@example.com"
            },
            groups: [
              {
                uuid: "9ecc8e84-6b83-442b-a04a-8094d5de997b",
                name: "Customer Service"
              }
            ],
            created_on: "2024-01-01T00:00:00.000Z",
            modified_on: "2024-01-01T00:00:00.000Z"
          }
        ]
      });
    }

    // In development mode without authentication, return mock data for tokens_refresh endpoint
    if (
      (process.env.NODE_ENV === 'development' || process.env.BYPASS_AUTH === 'true') &&
      !token &&
      req.url.includes('/tokens_refresh') &&
      req.method === 'POST'
    ) {
      logger.info('Development mode: Returning mock token refresh data', {
        accountId: accountId,
        url: req.url,
        method: req.method,
      });

      return res.json({
        token: 'mock-dev-token-' + Date.now(),
        expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
        success: true
      });
    }

    // Build the target URL for Chatwoot API
    // Chatwoot expects URLs in format: /api/v1/accounts/{account_id}/flow_editor/{endpoint}
    // FlowEditor routes come in different formats depending on how they're accessed
    // We need to construct the proper Chatwoot API URL
    
    let targetPath = req.originalUrl;
    
    // Remove account_id from query params since it's already in the URL path
    const url = new URL(`http://localhost${req.originalUrl}`);
    url.searchParams.delete('account_id');
    
    // Get the path without query parameters
    const pathWithoutQuery = url.pathname;
    
    let transformedPath;
    
    // Handle floweditor-api prefix (frontend requests)
    if (pathWithoutQuery.startsWith('/floweditor-api/api/v1/accounts/')) {
      if (pathWithoutQuery.includes('/flow_editor/')) {
        // Extract the account ID and path after /flow_editor/
        const match = pathWithoutQuery.match(/\/floweditor-api\/api\/v1\/accounts\/(\d+)\/flow_editor\/(.*)/);
        if (match) {
          const extractedAccountId = match[1];
          const flowEditorPath = match[2];
          transformedPath = `/api/v1/accounts/${extractedAccountId}/flow_editor/${flowEditorPath}`;
        } else {
          transformedPath = `/api/v1/accounts/${accountId}/flow_editor${pathWithoutQuery.replace('/floweditor-api/api/v1/accounts/', '').replace(/^\d+/, '')}`;
        }
      } else if (pathWithoutQuery.includes('/captain/')) {
        // Handle captain routes through floweditor-api prefix
        const match = pathWithoutQuery.match(/\/floweditor-api\/api\/v1\/accounts\/(\d+)\/captain\/(.*)/);
        if (match) {
          const extractedAccountId = match[1];
          const captainPath = match[2];
          transformedPath = `/api/v1/accounts/${extractedAccountId}/captain/${captainPath}`;
        } else {
          transformedPath = `/api/v1/accounts/${accountId}/captain${pathWithoutQuery.replace('/floweditor-api/api/v1/accounts/', '').replace(/^\d+/, '')}`;
        }
      } else {
        // Default transformation for other floweditor-api paths
        transformedPath = `/api/v1/accounts/${accountId}/flow_editor${pathWithoutQuery.replace('/floweditor-api/api/v1/accounts/', '').replace(/^\d+/, '')}`;
      }
    } else if (pathWithoutQuery.includes('/accounts/') && pathWithoutQuery.includes('/flow_editor/')) {
      transformedPath = `/api/v1${pathWithoutQuery}`;
    } else if (pathWithoutQuery.startsWith('/flow_editor/')) {
      transformedPath = `/api/v1/accounts/${accountId}${pathWithoutQuery}`;
    } else if (pathWithoutQuery.startsWith('/captain/')) {
      transformedPath = `/api/v1/accounts/${accountId}${pathWithoutQuery}`;
    } else {
      transformedPath = `/api/v1/accounts/${accountId}/flow_editor${pathWithoutQuery}`;
    }
    
    // Reconstruct the full path with remaining query parameters
    const queryString = url.search;
    targetPath = transformedPath + queryString;

    const targetUrl = `${CHATWOOT_API_BASE}${targetPath}`;

    logger.info('Proxying request to Chatwoot', {
      method: req.method,
      originalUrl: req.originalUrl,
      targetUrl: targetUrl,
      accountId: accountId,
      hasToken: !!token,
    });

    // Prepare headers for Chatwoot request
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'FlowEditor-Proxy/1.0',
    };

    // Add authentication token if available
    if (token) {
      // Forward as standard Bearer token for Chatwoot JWT endpoints
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Forward common Chatwoot auth headers if present
    const forwardAuthHeaders = [
      'access-token',
      'client',
      'uid',
      'expiry',
      'token-type',
      'api_access_token',
      'api-access-token',
      'x-api-access-token'
    ];
    forwardAuthHeaders.forEach(h => {
      const val = req.headers[h];
      if (val) {
        headers[h] = val;
      }
    });

    // Copy relevant headers from original request
    if (req.headers['x-account-id']) {
      headers['x-account-id'] = req.headers['x-account-id'];
    }

    // Prepare request options
    const requestOptions = {
      method: req.method,
      headers: headers,
    };

    // Add body for POST/PUT/PATCH requests
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      // If upstream left a raw JSON string, prefer forwarding as-is to avoid double stringify
      if (typeof req.rawBody === 'string') {
        requestOptions.body = req.rawBody;
      } else if (typeof req.body === 'string') {
        requestOptions.body = req.body;
      } else if (req.body) {
        requestOptions.body = JSON.stringify(req.body);
      }
    }

    // Make request to Chatwoot API
    const response = await fetch(targetUrl, requestOptions);

    // Development fallback: if Chatwoot rejects with 401/403, return mock success
    if (
      (process.env.NODE_ENV === 'development' || process.env.BYPASS_AUTH === 'true') &&
      (response.status === 401 || response.status === 403)
    ) {
      // Fallback for simulator start when unauthorized
      if (req.url.includes('/simulate_start') && req.method === 'POST') {
        logger.warn('Chatwoot unauthorized in dev; returning mock simulate_start data');
        return res.json({
          contact: {
            uuid: '6e38eba0-d673-4a35-82df-21bae2b6d466',
            urns: ['tel:+1234567890'],
            fields: { first_name: 'John', last_name: 'Doe' },
            groups: [
              { uuid: '9ecc8e84-6b83-442b-a04a-8094d5de997b', name: 'Customer Service' },
            ],
          },
          session: {
            contact: {
              uuid: '6e38eba0-d673-4a35-82df-21bae2b6d466',
              urns: ['tel:+1234567890'],
              fields: { first_name: 'John', last_name: 'Doe' },
              groups: [
                { uuid: '9ecc8e84-6b83-442b-a04a-8094d5de997b', name: 'Customer Service' },
              ],
            },
            runs: [
              {
                path: [
                  {
                    arrived_on: '2020-01-29T10:43:31.123456789Z',
                    uuid: '6de81ff6-f541-4099-8ad7-03214d15b07e',
                    exit_uuid: '6de81ff6-f541-4099-8ad7-03214d15b18e',
                    node_uuid: '6de81ff6-f541-4099-8ad7-03214d15b07d',
                  },
                ],
                flow_uuid: '6de81ff6-f541-4099-8ad7-03214d15b18e',
                status: 'waiting',
                events: [
                  {
                    type: 'msg_created',
                    msg: {
                      uuid: 'c166c2cb-290c-4805-a5af-052ad2858288',
                      urn: 'tel:+1123456789',
                      text: 'Welcome to the flow simulator!',
                    },
                    uuid: '51e6f864-a16f-4be7-839f-945afc857559',
                    step_uuid: '6de81ff6-f541-4099-8ad7-03214d15b07e',
                    created_on: '2020-01-29T10:43:31.123456789Z',
                  },
                ],
              },
            ],
          },
        });
      }

      // Fallback for simulator resume when unauthorized
      if (req.url.includes('/simulate_resume') && req.method === 'POST') {
        logger.warn('Chatwoot unauthorized in dev; returning mock simulate_resume data');
        return res.json({
          session: {
            contact: {
              uuid: '6e38eba0-d673-4a35-82df-21bae2b6d466',
              urns: ['tel:+1234567890'],
              fields: { first_name: 'John', last_name: 'Doe' },
              groups: [
                { uuid: '9ecc8e84-6b83-442b-a04a-8094d5de997b', name: 'Customer Service' },
              ],
            },
            runs: [
              {
                path: [
                  {
                    arrived_on: '2020-01-29T10:43:31.123456789Z',
                    uuid: '6de81ff6-f541-4099-8ad7-03214d15b07e',
                    exit_uuid: '6de81ff6-f541-4099-8ad7-03214d15b18e',
                    node_uuid: '6de81ff6-f541-4099-8ad7-03214d15b07d',
                  },
                ],
                flow_uuid: '6de81ff6-f541-4099-8ad7-03214d15b18e',
                status: 'completed',
                events: [
                  {
                    type: 'msg_created',
                    msg: {
                      uuid: 'c166c2cb-290c-4805-a5af-052ad2858288',
                      urn: 'tel:+1123456789',
                      text: 'Flow resumed successfully!',
                    },
                    uuid: '51e6f864-a16f-4be7-839f-945afc857559',
                    step_uuid: '6de81ff6-f541-4099-8ad7-03214d15b07e',
                    created_on: '2020-01-29T10:43:31.123456789Z',
                  },
                ],
              },
            ],
          },
        });
      }

      if (req.url.includes('/save_revision') && req.method === 'POST') {
        logger.warn('Chatwoot unauthorized in dev; returning mock save_revision success');
        return res.json({
          success: true,
          data: {
            uuid: req.body?.definition_json?.uuid || 'mock-uuid',
            name: req.body?.definition_json?.name || 'Mock Flow',
            revision: (req.body?.definition_json?.revision || 0) + 1,
            saved_at: new Date().toISOString(),
          },
          message: 'Mock save_revision success (fallback)',
        });
      }
      if (req.url.includes('/flows') && req.method === 'GET') {
        logger.warn('Chatwoot unauthorized in dev; returning mock flows list');
        return res.json({
          results: [
            {
              uuid: '4f5988fe-b103-472e-a8e7-344220923f04',
              name: 'Sample Flow',
              type: 'messaging',
              created_on: '2024-01-01T00:00:00.000Z',
              modified_on: '2024-01-01T00:00:00.000Z',
              archived: false,
              expires: 10080,
              runs: { active: 0, completed: 0, interrupted: 0, expired: 0 },
            },
          ],
        });
      }
    }

    // Get response data
    const responseText = await response.text();
    let responseData;

    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = responseText;
    }

    // Log response for debugging
    logger.info('Chatwoot API response', {
      status: response.status,
      statusText: response.statusText,
      targetUrl: targetUrl,
      responseSize: responseText.length,
    });

    // Forward response status and headers
    res.status(response.status);

    // Copy relevant response headers
    const headersToForward = ['content-type', 'x-total-count', 'x-page-count'];
    headersToForward.forEach(header => {
      const value = response.headers.get(header);
      if (value) {
        res.set(header, value);
      }
    });

    // Send response
    if (typeof responseData === 'string') {
      res.send(responseData);
    } else {
      res.json(responseData);
    }
  } catch (error) {
    logger.error('Error proxying request to Chatwoot', {
      error: error.message,
      stack: error.stack,
      url: req.originalUrl,
      method: req.method,
    });

    res.status(500).json({
      success: false,
      error: 'Proxy request failed',
      code: 'PROXY_ERROR',
      details:
        process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Middleware to handle specific FlowEditor endpoints that need proxying
 */
export const createChatwootProxyRoutes = router => {
  // Define endpoints that should be proxied to Chatwoot
  const proxyEndpoints = [
    '/flows',
    '/groups',
    '/labels',
    '/channels',
    '/classifiers',
    '/ticketers',
    '/resthooks',
    '/templates',
    '/languages',
    '/environment',
    '/recipients',
    '/completion',
    '/activity',
    '/editor',
    '/attachments',
    '/revisions',
    '/save_revision',
    '/functions',
    '/globals',
    '/contacts',
    '/custom_attribute_definitions',
    '/fields',
    '/simulate_start',
    '/simulate_resume',
    '/brain',
    '/external_services',
    '/external_services_calls',
    '/whatsapp_products',
    '/whatsapp_flows',
    '/knowledge_bases',
    '/ticketer_queues',
  ];

  // Create proxy routes for each endpoint
  proxyEndpoints.forEach(endpoint => {
    // Handle all HTTP methods for each endpoint
    router.all(endpoint, proxyChatwootRequest);
    router.all(`${endpoint}/*`, proxyChatwootRequest);
  });

  return router;
};

export default {
  proxyChatwootRequest,
  createChatwootProxyRoutes,
};
