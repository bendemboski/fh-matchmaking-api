const { expect } = require('chai');
const factory = require('../helpers/request-factory');
const setupDynamo = require('../helpers/setup-dynamo');
const setupCognito = require('../helpers/setup-cognito');
const authStub = require('../helpers/auth-stub');
const AWS = require('aws-sdk');
const sinon = require('sinon');

describe('create resident profile', function() {
  let dynamo = setupDynamo();
  let provider = setupCognito();
  let client;
  let caseworkerId;

  beforeEach(function() {
    client = new AWS.DynamoDB.DocumentClient({ service: dynamo });

    provider.testAddUsers({
      caseworkers: [
        { 'given_name': 'Ann', 'family_name': 'Veal', email: 'funnyorsomething@gmail.com' }
      ]
    });
    caseworkerId = provider.groups.caseworkers[0];

    authStub.stub(sinon, 'caseworkers', caseworkerId);
  });

  afterEach(function() {
    sinon.restore();
  });

  it('works and ignores unknown attributes', async function() {
    let date = new Date(2019, 1, 15);
    sinon.useFakeTimers(date);

    let res = await factory.post(`/resident-profiles`, {
      data: {
        type: 'resident-profiles',
        attributes: {
          matchedHost: 'ahost',
          unknown: 'value'
        }
      }
    });
    expect(res).to.have.status(201);

    let { id } = res.body.data;
    expect(id).to.be.ok;
    expect(res.body).to.deep.equal({
      data: {
        type: 'resident-profiles',
        id,
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
        id
      }
    }).promise()).to.eventually.deep.include({
      Item: {
        creationTime: date.toISOString(),
        caseworker: caseworkerId,
        id,
        matchedHost: 'ahost'
      }
    });
  });

  it('works with no attributes', async function() {
    let res = await factory.post(`/resident-profiles`, {
      data: {
        type: 'resident-profiles'
      }
    });
    expect(res).to.have.status(201);
  });

  it('ignores creationTime, caseworker, and id, if specified', async function() {
    let date = new Date(2019, 1, 15);
    sinon.useFakeTimers(date);

    let res = await factory.post(`/resident-profiles`, {
      data: {
        type: 'resident-profiles',
        id: 'something',
        attributes: {
          creationTime: new Date().toISOString(),
          caseworker: 'somecw',
          id: 'something',
          matchedHost: 'ahost'
        }
      }
    });
    expect(res).to.have.status(201);

    let { id } = res.body.data;
    expect(id).to.be.ok;
    expect(res.body).to.deep.equal({
      data: {
        type: 'resident-profiles',
        id,
        attributes: {
          creationTime: date.toISOString(),
          caseworker: caseworkerId,
          matchedHost: 'ahost'
        }
      }
    });
  });

  it('fails if the user is not a caseworker', async function() {
    authStub.setUserGroup('hosts');

    let res = await factory.post(`/resident-profiles`, {
      data: {
        type: 'resident-profiles',
        attributes: {
          matchedHost: 'ahost'
        }
      }
    });
    expect(res).to.have.status(403);
  });
});
