const { v4: generateUUID } = require('uuid');

const { respond } = require('./utils/index.js');

exports.handler = (request, context, callback) => {
  if (request.httpMethod === 'POST') {
    const body = JSON.parse(request.body);
    respond(callback, {
      uuid: generateUUID(),
      name: body.name,
      count: 0,
    });
  } else {
    respond(callback, { results: [] });
  }
};
