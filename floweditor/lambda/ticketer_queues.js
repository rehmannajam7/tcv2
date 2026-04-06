/* eslint-disable @typescript-eslint/camelcase */
const ticketer_queues = [
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
];

const { getOpts } = require('./utils');

exports.handler = (evt, ctx, cb) =>
  cb(null, getOpts({ body: JSON.stringify(ticketer_queues) }));
