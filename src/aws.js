const Cognito = require('./cognito');
const Dynamo = require('./dynamo');
const S3 = require('./s3');
const env = require('./environment');

// This exists so tests can stub/modify the AWS objects
module.exports = {
  cognito: new Cognito(env),
  dynamo: new Dynamo(env),
  s3: new S3(env)
};
