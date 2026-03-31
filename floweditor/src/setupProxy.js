const proxy = require('http-proxy-middleware');

module.exports = function(app) {
  // we serve netlify functions locally in dev
  // % yarn run lambda:build && yarn run lambda:serve
  app.use(
    proxy('/.netlify/functions/', {
      target: 'http://localhost:8000/',
      pathRewrite: {
        '^/\\.netlify/functions': '',
      },
    }),
  );
};
