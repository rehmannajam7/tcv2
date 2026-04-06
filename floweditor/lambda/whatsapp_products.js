const whatsapp_products = [
  {
    facebook_product_id: '7417461401663795',
    title: 'Product 1',
    created_on: '2021-09-01T01:06:39.178493Z',
  },
  {
    facebook_product_id: '8417461401663796',
    title: 'Product 2',
    created_on: '2021-09-01T01:06:39.178493Z',
  },
  {
    facebook_product_id: '9417461401663797',
    title: 'Product 3',
    created_on: '2021-09-01T01:06:39.178493Z',
  },
  {
    facebook_product_id: '5417461401663798',
    title: 'Product 1',
    created_on: '2021-09-01T01:06:39.178493Z',
  },
];

const { getOpts } = require('./utils');

exports.handler = (evt, ctx, cb) =>
  cb(
    null,
    getOpts({
      body: JSON.stringify({
        next: null,
        results: whatsapp_products,
      }),
    }),
  );
