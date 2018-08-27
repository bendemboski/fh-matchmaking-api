const sls = require('serverless-http');
const buildApp = require('./lib/build-app');

module.exports = {
  server: sls(buildApp())
};
