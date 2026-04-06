const { v4: generateUUID } = require('uuid');

const { respond } = require('./utils/index.js');
const topics = {
  next: null,
  previous: null,
  results: [
    {
      uuid: '6e38eba0-d673-4a35-82df-21bae2b6d466',
      name: 'General',
      created_on: '2021-09-01T01:06:39.178493Z',
    },
    {
      uuid: '7e38eba0-d673-4a35-82df-21bae2b6d467',
      name: 'Dummy Topic1',
      created_on: '2021-09-01T01:06:39.178493Z',
    },
    {
      uuid: '8e38eba0-d683-4a35-82df-21bae2b6d468',
      name: 'Dummy Topic2',
      created_on: '2021-09-01T01:06:39.178493Z',
    },
    {
      uuid: '0e38eba0-d683-4a35-82df-21bae2b6d468',
      name: 'LoremIpsum',
      created_on: '2021-09-01T01:06:39.178493Z',
    },
  ],
};

exports.handler = (request, context, callback) => {
  if (request.httpMethod === 'POST') {
    const body = JSON.parse(request.body);
    respond(callback, {
      uuid: generateUUID(),
      name: body.name,
      query: null,
      status: 'ready',
      count: 0,
    });
  } else {
    respond(callback, topics);
  }
};
