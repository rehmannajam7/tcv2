/* eslint-disable @typescript-eslint/camelcase */
const contacts = [
  {
    uuid: '1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6',
    name: 'John Doe',
    language: 'eng',
    status: 'active',
    created_on: '2023-01-15T10:30:00.000Z',
    modified_on: '2023-01-15T10:30:00.000Z',
    fields: {
      email: 'john.doe@example.com',
      phone: '+1234567890',
    },
  },
  {
    uuid: '2b3c4d5e-6f7g-8h9i-0j1k-l2m3n4o5p6q7',
    name: 'Jane Smith',
    language: 'eng',
    status: 'active',
    created_on: '2023-01-16T14:20:00.000Z',
    modified_on: '2023-01-16T14:20:00.000Z',
    fields: {
      email: 'jane.smith@example.com',
      phone: '+1234567891',
    },
  },
  {
    uuid: '3c4d5e6f-7g8h-9i0j-1k2l-m3n4o5p6q7r8',
    name: 'Bob Johnson',
    language: 'spa',
    status: 'blocked',
    created_on: '2023-01-17T09:15:00.000Z',
    modified_on: '2023-01-17T09:15:00.000Z',
    fields: {
      email: 'bob.johnson@example.com',
      phone: '+1234567892',
    },
  },
];

const { getOpts } = require('./utils');

exports.handler = (evt, ctx, cb) =>
  cb(null, getOpts({ body: JSON.stringify({ results: contacts }) }));
