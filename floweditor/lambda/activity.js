const activity = {
  nodes: {},
  segments: {},
  is_starting: false,
};

const { getOpts } = require('./utils');

exports.handler = (evt, ctx, cb) =>
  cb(null, getOpts({ body: JSON.stringify(activity) }));
