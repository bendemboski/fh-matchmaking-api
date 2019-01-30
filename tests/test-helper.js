const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinonChai = require('sinon-chai');
const chaiHttp = require('chai-http');
const AWS = require('aws-sdk');

chai.use(chaiAsPromised);
chai.use(sinonChai);
chai.use(chaiHttp);

// make sure we don't use any real credentials that might be configured on the
// system
AWS.config = new AWS.Config({
  credentials: new AWS.Credentials({
    region: 'us-east-1',
    accessKeyId: 'fakeaccesskeyid',
    secretAccessKey: 'fakesecretkey'
  })
});

// set fake environment
process.env.REGION = 'us-east-1';
process.env.USER_POOL = 'userpool';
process.env.DYNAMO_ENDPOINT = 'http://localhost:9191';
process.env.HOST_PROFILES_TABLE = 'host-profiles';
process.env.RESIDENT_PROFILES_TABLE = 'resident-profiles';
process.env.MEDIA_BUCKET = 'media';
