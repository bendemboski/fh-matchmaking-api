const { expect } = require('chai');
const factory = require('../helpers/request-factory');
const setupDynamo = require('../helpers/setup-dynamo');
const setupCognito = require('../helpers/setup-cognito');
const authStub = require('../helpers/auth-stub');
const AWS = require('aws-sdk');
const sinon = require('sinon');

describe('create host profile', function() {
  let dynamo = setupDynamo();
  let provider = setupCognito();
  let client;
  let hostId;

  beforeEach(function() {
    client = new AWS.DynamoDB.DocumentClient({ service: dynamo });

    provider.testAddUsers({
      hosts: [
        { 'given_name': 'Jay', 'family_name': 'Walter-Weatherman', email: 'lessonteacher@gmail.com' }
      ]
    });
    hostId = provider.groups.hosts[0];

    authStub.stub(sinon, 'hosts', hostId);
  });

  afterEach(function() {
    sinon.restore();
  });

  it('works and ignores unknown attributes', async function() {
    let res = await factory.post(`/host-profiles`, {
      data: {
        type: 'host-profiles',
        attributes: {
          visible: true,
          unknown: 'value'
        }
      }
    });
    expect(res).to.have.status(201);

    let { id } = res.body.data;
    expect(id).to.be.ok;
    expect(res.body).to.deep.equal({
      data: {
        type: 'host-profiles',
        id,
        attributes: {
          host: hostId,
          visible: true
        }
      }
    });

    await expect(client.get({
      TableName: process.env.HOST_PROFILES_TABLE,
      Key: {
        host: hostId
      }
    }).promise()).to.eventually.deep.include({
      Item: {
        host: hostId,
        visible: true
      }
    });
  });

  it('works with no attributes', async function() {
    let res = await factory.post(`/host-profiles`, {
      data: {
        type: 'host-profiles'
      }
    });
    expect(res).to.have.status(201);
  });

  it('ignores host and id, if specified', async function() {
    let res = await factory.post(`/host-profiles`, {
      data: {
        type: 'host-profiles',
        id: 'something',
        attributes: {
          visible: true,
          unknown: 'value',
          host: 'someotherid'
        }
      }
    });
    expect(res).to.have.status(201);

    let { id } = res.body.data;
    expect(id).to.be.ok;
    expect(res.body).to.deep.equal({
      data: {
        type: 'host-profiles',
        id,
        attributes: {
          host: hostId,
          visible: true
        }
      }
    });
  });

  it('fails if the profile already exists', async function() {
    await client.batchWrite({
      RequestItems: {
        [process.env.HOST_PROFILES_TABLE]: [
          { PutRequest: { Item: { host: hostId, visible: false } } }
        ]
      }
    }).promise();

    let res = await factory.post(`/host-profiles`, {
      data: {
        type: 'host-profiles',
        attributes: {
          visible: true
        }
      }
    });
    expect(res).to.have.status(409);
  });

  it('fails if the user is not a host', async function() {
    authStub.setUserGroup('caseworkers');

    let res = await factory.post(`/host-profiles`, {
      data: {
        type: 'host-profiles',
        attributes: {
          visible: true
        }
      }
    });
    expect(res).to.have.status(403);
  });
});
