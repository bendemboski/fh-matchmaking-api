const Cognito = require('./cognito');
const Dynamo = require('./dynamo');
const env = require('./environment');

// This exists so tests can stub/modify the AWS objects
module.exports = {
  cognito: new Cognito(env),
  dynamo: new Dynamo(env)
};
