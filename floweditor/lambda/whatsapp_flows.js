const whatsapp_flows = [
  {
    id: '467610666138657',
    name: 'Flow 1',
    assets: {
      screens: ['WELCOME_SCREEN', 'MIDDLE', 'SECOND'],
      variables: ['name', 'email'],
    },
  },
  {
    id: '467610666138658',
    name: 'Flow 2',
    assets: {
      screens: ['WELCOME_SCREEN'],
      variables: ['name'],
    },
  },
  {
    id: '467610666138659',
    name: 'Flow 3',
    assets: {
      screens: ['WELCOME_SCREEN'],
      variables: [],
    },
  },
];

const { getOpts } = require('./utils');

exports.handler = (evt, ctx, cb) =>
  cb(
    null,
    getOpts({
      body: JSON.stringify({
        next: null,
        results: whatsapp_flows,
      }),
    }),
  );
