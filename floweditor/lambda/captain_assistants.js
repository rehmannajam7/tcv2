/* eslint-disable @typescript-eslint/camelcase */
const captainAssistants = [
  {
    id: 'captain-1',
    name: 'Captain Assistant 1',
    intelligence: 'Captain',
  },
  {
    id: 'captain-2',
    name: 'Captain Assistant 2',
    intelligence: 'Captain',
  },
  {
    id: 'captain-3',
    name: 'Captain Assistant 3',
    intelligence: 'Captain',
  },
];
const { getOpts } = require('./utils');

exports.handler = (evt, ctx, cb) =>
  cb(null, getOpts({ body: JSON.stringify({ results: captainAssistants }) }));