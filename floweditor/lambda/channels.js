const channels = {
  results: [
    {
      uuid: '459fe493-dca9-478b-bde7-a0d7a0e21e6c',
      name: 'Twilio Channel',
      address: '+18005234545',
      schemes: ['tel'],
      roles: ['send', 'receive', 'call', 'answer'],
    },
    {
      uuid: '0f661e8b-ea9d-4bd3-9953-d368340acf91',
      name: 'WhatsApp',
      address: '+18005234545',
      schemes: ['whatsapp'],
      roles: ['send', 'receive'],
    },
    {
      uuid: '03ea943c-4949-4c3e-a2e5-ac36ccfaae26',
      name: 'Telegram1',
      address: 'https://localhost:1234',
      schemes: ['telegram'],
      roles: ['send', 'receive'],
    },
  ],
};

const { getOpts } = require('./utils');

exports.handler = (evt, ctx, cb) =>
  cb(null, getOpts({ body: JSON.stringify(channels) }));
