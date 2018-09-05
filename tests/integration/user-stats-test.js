const chai = require('chai');
const { expect } = chai;
const buildApp = require('../../lib/build-app');
const authStub = require('../helpers/auth-stub');
const setupCognito = require('../helpers/setup-cognito');
const setupDynamo = require('../helpers/setup-dynamo');
const AWS = require('aws-sdk');
const sinon = require('sinon');

describe('userStats', function() {
  let cognitoProvider = setupCognito();
  let dynamo = setupDynamo();

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

    let client = new AWS.DynamoDB.DocumentClient({ service: dynamo });

    await client.batchWrite({
      RequestItems: {
        [process.env.RESIDENT_PROFILES_TABLE]: [
          { PutRequest: { Item: { Id: '1', Caseworker: 'a', Email: 'steveholt@gmail.com' } } },
          { PutRequest: { Item: { Id: '2', Caseworker: 'b', Email: 'oscar@bluth.com' } } },
          { PutRequest: { Item: { Id: '3', Caseworker: 'b', Email: 'annyong@gmail.com' } } }
        ]
      }
    }).promise();

    let res = await chai.request(buildApp()).get('/userStats');
    expect(res).to.have.status(200);
    expect(res.body).to.deep.equal({ hosts: 2, residents: 3 });
  });
});
