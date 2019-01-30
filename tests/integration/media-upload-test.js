const { expect } = require('chai');
const factory = require('../helpers/request-factory');
const setupCognito = require('../helpers/setup-cognito');
const authStub = require('../helpers/auth-stub');
const aws = require('../../src/aws');
const sinon = require('sinon');

describe('mediaUpload', function() {
  setupCognito();
  let createStub;

  beforeEach(function() {
    authStub.stub(sinon, 'hosts');
    createStub = sinon.stub(aws.s3.client, 'getSignedUrl').withArgs('putObject');
  });

  afterEach(function() {
    sinon.restore();
  });

  it('works', async function() {
    createStub.callsFake((method, { Key: key }, cb) => {
      cb(null, `https://upload.s3.com/${key}?foo=bar`);
    });

    let res = await factory.post('/mediaUpload');
    expect(res).to.have.status(201);
    expect(createStub).to.have.been.calledOnce;
    expect(createStub.firstCall.args[1].Bucket).to.equal('media');
    expect(createStub.firstCall.args[1].Key).to.be.ok;

    let { Key: key } = createStub.firstCall.args[1];
    expect(res.body).to.deep.equal({
      uploadUrl: `https://upload.s3.com/${key}?foo=bar`,
      downloadUrl: `https://media.s3.amazonaws.com/${key}`
    });
  });
});
