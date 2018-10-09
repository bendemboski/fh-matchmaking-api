const { expect } = require('chai');
const factory = require('../helpers/request-factory');
const setupDynamo = require('../helpers/setup-dynamo');
const setupCognito = require('../helpers/setup-cognito');
const authStub = require('../helpers/auth-stub');
const AWS = require('aws-sdk');
const sinon = require('sinon');

describe('delete resident profile', function() {
  let dynamo = setupDynamo();
  let provider = setupCognito();
  let client;
  let caseworkerId;
  let otherCaseworkerId;

  beforeEach(function() {
    client = new AWS.DynamoDB.DocumentClient({ service: dynamo });

    provider.testAddUsers({
      caseworkers: [
        { 'given_name': 'Ann', 'family_name': 'Veal', email: 'funnyorsomething@gmail.com' },
        { 'given_name': 'Gob', 'family_name': 'Bluth', email: 'illusions@bluth.com' }
      ]
    });
    caseworkerId = provider.groups.caseworkers[0];
    otherCaseworkerId = provider.groups.caseworkers[1];

    authStub.stub(sinon, 'caseworkers', caseworkerId);
  });

  afterEach(function() {
    sinon.restore();
  });

  async function createProfile(caseworker, id) {
    await client.update({
      TableName: process.env.RESIDENT_PROFILES_TABLE,
      Key: {
        caseworker,
        id
      }
    }).promise();
  }

  it('works', async function() {
    await createProfile(caseworkerId, 'a');

    let res = await factory.delete(`/resident-profiles/a`);
    expect(res).to.have.status(204);

    await expect(client.scan({
      TableName: process.env.RESIDENT_PROFILES_TABLE
    }).promise()).to.eventually.have.property('Count', 0);
  });

  it('fails if the user is not a caseworker', async function() {
    await createProfile(caseworkerId, 'a');
    authStub.setUserGroup('hosts');

    let res = await factory.delete(`/resident-profiles/a`);
    expect(res).to.have.status(403);

    await expect(client.scan({
      TableName: process.env.RESIDENT_PROFILES_TABLE
    }).promise()).to.eventually.have.property('Count', 1);
  });

  it('fails if the profile does not exist', async function() {
    let res = await factory.delete(`/resident-profiles/a`);
    expect(res).to.have.status(404);
  });

  it('fails if the profile is owner by a different caseworker', async function() {
    await createProfile(otherCaseworkerId, 'a');

    let res = await factory.delete(`/resident-profiles/a`);
    expect(res).to.have.status(404);

    await expect(client.scan({
      TableName: process.env.RESIDENT_PROFILES_TABLE
    }).promise()).to.eventually.have.property('Count', 1);
  });
});
