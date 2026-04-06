/* eslint-disable @typescript-eslint/camelcase */
const ticketers = [
  {
    uuid: '5b8587d9-c1bd-47e4-b2ff-dfe790fcdaf2',
    name: 'Email',
    type: 'mailgun',
    created_on: '2019-10-15T20:07:58.529130Z',
  },
  {
    uuid: '6b8587d9-c1bd-47e4-b2ff-dfe790fcdaf3',
    name: 'Email 2',
    type: 'mailgun',
    created_on: '2019-10-15T20:07:58.529130Z',
  },
  {
    uuid: 'a31cfb78-60c8-4b74-80c2-0c73ac2002b3',
    name: 'Wenichats Sector1',
    type: 'wenichats',
    created_on: '2019-10-15T20:07:58.529130z',
  },
];
const { getOpts } = require('./utils');

exports.handler = (evt, ctx, cb) =>
  cb(null, getOpts({ body: JSON.stringify({ results: ticketers }) }));
