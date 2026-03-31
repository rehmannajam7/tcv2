const { respond } = require('./utils/index.js');

exports.handler = (request, context, callback) => {
  if (request.httpMethod === 'POST') {
    respond(callback, {
      type: 'image/png',
      url: 'https://weni.ai/image.png',
    });
  } else {
    respond(callback, { results: [] });
  }
};
