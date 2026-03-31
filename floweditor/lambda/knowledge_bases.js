/* eslint-disable @typescript-eslint/camelcase */
const knowledgeBases = [
  {
    id: '1',
    name: 'Base 1',
    intelligence: 'Intelligence 1',
  },
  {
    id: '2',
    name: 'Base 2',
    intelligence: 'Intelligence 1',
  },
  {
    id: '3',
    name: 'Base 1',
    intelligence: 'Intelligence 2',
  },
];
const { getOpts } = require('./utils');

exports.handler = (evt, ctx, cb) =>
  cb(null, getOpts({ body: JSON.stringify({ results: knowledgeBases }) }));
