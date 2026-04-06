const baseResponse = {
  statusCode: 200,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, x-account-id, X-Account-ID',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  },
};

const getOpts = (opts = {}) => Object.assign({}, baseResponse, opts);

const respond = (callback, body = {}) => {
  callback(
    null,
    Object.assign({}, baseResponse, { body: JSON.stringify(body) }),
  );
};

module.exports = { getOpts, respond };
