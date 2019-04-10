const { expect } = require('chai');
const factory = require('../helpers/request-factory');
const setupDynamo = require('../helpers/setup-dynamo');
const setupCognito = require('../helpers/setup-cognito');
const authStub = require('../helpers/auth-stub');
const AWS = require('aws-sdk');
const sinon = require('sinon');

describe('update resident profile', function() {
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

  async function createProfile(caseworker, id, creationTime = new Date()) {
    await client.update({
      TableName: process.env.RESIDENT_PROFILES_TABLE,
      Key: {
        caseworker,
        id
      },
      UpdateExpression: 'set #k = :v',
      ExpressionAttributeNames: { '#k': 'creationTime' },
      ExpressionAttributeValues: { ':v': creationTime.toISOString() }
    }).promise();
  }

  it('works and ignores unknown/read-only attributes', async function() {
    let date = new Date(2019, 1, 15);
    await createProfile(caseworkerId, 'a', date);

    let res = await factory.patch(`/resident-profiles/${caseworkerId}:a`, {
      data: {
        type: 'resident-profiles',
        attributes: {
          creationTime: new Date().toISOString(),
          matchedHost: 'ahost',
          unknown: 'value'
        }
      }
    });
    expect(res).to.have.status(200);

    expect(res.body).to.deep.equal({
      data: {
        type: 'resident-profiles',
        id: `${caseworkerId}:a`,
        attributes: {
          creationTime: date.toISOString(),
          caseworker: caseworkerId,
          matchedHost: 'ahost'
        }
      }
    });

    await expect(client.get({
      TableName: process.env.RESIDENT_PROFILES_TABLE,
      Key: {
        caseworker: caseworkerId,
        id: 'a'
      }
    }).promise()).to.eventually.deep.include({
      Item: {
        caseworker: caseworkerId,
        id: 'a',
        creationTime: date.toISOString(),
        matchedHost: 'ahost'
      }
    });

  });

  it('fails if the user is not a caseworker', async function() {
    await createProfile(caseworkerId, 'a');
    authStub.setUserGroup('hosts');

    let res = await factory.patch(`/resident-profiles/${caseworkerId}:a`, {
      data: {
        type: 'resident-profiles',
        attributes: {
          matchedHost: 'ahost'
        }
      }
    });
    expect(res).to.have.status(403);
  });

  it('fails if the profile does not exist', async function() {
    let res = await factory.patch(`/resident-profiles/${caseworkerId}:a`, {
      data: {
        type: 'resident-profiles',
        attributes: {
          matchedHost: 'ahost'
        }
      }
    });
    expect(res).to.have.status(404);
  });

  it('fails if the profile is owner by a different caseworker', async function() {
    await createProfile(otherCaseworkerId, 'a');

    let res = await factory.patch(`/resident-profiles/${otherCaseworkerId}:a`, {
      data: {
        type: 'resident-profiles',
        attributes: {
          matchedHost: 'ahost'
        }
      }
    });
    expect(res).to.have.status(404);
  });

  it('fails if the caseworker portion of the id is wrong', async function() {
    await createProfile(otherCaseworkerId, 'a');

    let res = await factory.patch(`/resident-profiles/${caseworkerId}:a`, {
      data: {
        type: 'resident-profiles',
        attributes: {
          matchedHost: 'ahost'
        }
      }
    });
    expect(res).to.have.status(404);
  });
});
