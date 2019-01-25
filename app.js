const sls = require('serverless-http');
const buildApp = require('./src/build-app');

module.exports = {
  server: sls(buildApp())
};
