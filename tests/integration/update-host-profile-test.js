const { expect } = require('chai');
const factory = require('../helpers/request-factory');
const setupDynamo = require('../helpers/setup-dynamo');
const setupCognito = require('../helpers/setup-cognito');
const authStub = require('../helpers/auth-stub');
const AWS = require('aws-sdk');
const sinon = require('sinon');

describe('update host profile', function() {
  let dynamo = setupDynamo();
  let provider = setupCognito();
  let client;
  let hostId;
  let otherHostId;

  beforeEach(function() {
    client = new AWS.DynamoDB.DocumentClient({ service: dynamo });

    provider.testAddUsers({
      hosts: [
        { 'given_name': 'Jay', 'family_name': 'Walter-Weatherman', email: 'lessonteacher@gmail.com' },
        { 'given_name': 'Lucille', 'family_name': 'Bluth', email: 'hospitalbar@bluth.com' }
      ]
    });
    hostId = provider.groups.hosts[0];
    otherHostId = provider.groups.hosts[1];

    authStub.stub(sinon, 'hosts', hostId);
  });

  afterEach(function() {
    sinon.restore();
  });

  async function createProfile(host) {
    await client.batchWrite({
      RequestItems: {
        [process.env.HOST_PROFILES_TABLE]: [
          { PutRequest: { Item: { host, visible: false } } }
        ]
      }
    }).promise();
  }

  it('works and ignores unknown attributes', async function() {
    await createProfile(hostId);

    let res = await factory.patch(`/host-profiles/${hostId}`, {
      data: {
        type: 'host-profiles',
        id: hostId,
        attributes: {
          host: hostId,
          visible: true,
          unknown: 'value'
        }
      }
    });
    expect(res).to.have.status(200);

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

  it('fails if the profile does not exist', async function() {
    let res = await factory.patch(`/host-profiles/${hostId}`, {
      data: {
        type: 'host-profiles',
        id: hostId,
        attributes: {
          host: hostId,
          visible: true
        }
      }
    });
    expect(res).to.have.status(404);
  });

  it('fails if the user is not a host', async function() {
    await createProfile(hostId);
    authStub.setUserGroup('caseworkers');

    let res = await factory.patch(`/host-profiles/${hostId}`, {
      data: {
        type: 'host-profiles',
        id: hostId,
        attributes: {
          host: hostId,
          visible: true
        }
      }
    });
    expect(res).to.have.status(403);
  });

  it('fails if it is owned by a different host', async function() {
    await createProfile(otherHostId);

    let res = await factory.patch(`/host-profiles/${hostId}`, {
      data: {
        type: 'host-profiles',
        id: otherHostId,
        attributes: {
          host: otherHostId,
          visible: true
        }
      }
    });
    expect(res).to.have.status(404);
  });
});
