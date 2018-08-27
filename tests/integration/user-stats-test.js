const chai = require('chai');
const { expect } = chai;
const buildApp = require('../../lib/build-app');
const authStub = require('../helpers/auth-stub');
const setupCognito = require('../helpers/setup-cognito');
const sinon = require('sinon');

describe('userStats', function() {
  let cognitoProvider = setupCognito();

  beforeEach(function() {
    authStub.stub(sinon, 'admins');
  });

  afterEach(function() {
    sinon.restore();
  });

  it('fails when not admin', async function() {
    authStub.setUserGroup('hosts');

    let res = await chai.request(buildApp()).get('/userStats');
    expect(res).to.have.status(403);
  });

  it('works', async function() {
    cognitoProvider.testAddUsers({
      hosts: [ {}, {} ],
      caseworkers: [ {} ]
    });

    let res = await chai.request(buildApp()).get('/userStats');
    expect(res).to.have.status(200);
    expect(res.body).to.deep.equal({ hosts: 2 });
  });
});
