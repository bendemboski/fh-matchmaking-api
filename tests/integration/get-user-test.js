const { expect } = require('chai');
const factory = require('../helpers/request-factory');
const setupDynamo = require('../helpers/setup-dynamo');
const setupCognito = require('../helpers/setup-cognito');
const authStub = require('../helpers/auth-stub');
const AWS = require('aws-sdk');
const sinon = require('sinon');

describe('get user', function() {
  let dynamo = setupDynamo();
  let provider = setupCognito();
  let adminId;
  let hostId;
  let caseworkerId;

  beforeEach(function() {
    provider.testCreationTime = new Date();
    provider.testAddUsers({
      admins: [
        { 'given_name': 'Buster', 'family_name': 'Bluth', email: 'heybrother@bluth.com' }
      ],
      hosts: [
        { 'given_name': 'Jay', 'family_name': 'Walter-Weatherman', email: 'lessonteacher@gmail.com' },
        { 'given_name': 'Lucille', 'family_name': 'Bluth', email: 'hospitalbar@bluth.com' }
      ],
      caseworkers: [
        { 'given_name': 'Ann', 'family_name': 'Veal', email: 'funnyorsomething@gmail.com' },
        { 'given_name': 'Gob', 'family_name': 'Bluth', email: 'illusions@bluth.com' }
      ]
    });
    ({
      groups: {
        admins: [ adminId ],
        hosts: [ hostId ],
        caseworkers: [ caseworkerId ]
      }
    } = provider);
  });

  afterEach(function() {
    sinon.restore();
  });

  it('serialization', async function() {
    let creationTime = new Date();

    provider.testAddUsers({
      admins: [
        {
          'creation_time': creationTime,
          'given_name': 'Maeby',
          'family_name': 'Funke',
          'email': 'maeby@bluth.com',
          'phone_number': '+12068675309',
          'birthdate': '07-04-1970'
        }
      ]
    });

    authStub.stub(sinon, 'admins');

    let id = provider.groups.admins[1];
    let res = await factory.get(`/admins/${id}`);
    expect(res).to.have.status(200);
    expect(res.body).to.deep.equal({
      data: {
        type: 'admins',
        id,
        attributes: {
          creationTime: creationTime.toISOString(),
          email: 'maeby@bluth.com',
          givenName: 'Maeby',
          familyName: 'Funke',
          phoneNumber: '2068675309',
          birthdate: '07-04-1970'
        }
      }
    });
  });

  describe('admin', function() {
    beforeEach(function() {
      authStub.stub(sinon, 'admins');
    });

    it('can get admins', async function() {
      let res = await factory.get(`/admins/${adminId}`);
      expect(res).to.have.status(200);
      expect(res.body).to.deep.equal({
        data: {
          type: 'admins',
          id: adminId,
          attributes: {
            creationTime: provider.testCreationTime.toISOString(),
            email: 'heybrother@bluth.com',
            givenName: 'Buster',
            familyName: 'Bluth'
          }
        }
      });
    });

    it('can get hosts', async function() {
      let res = await factory.get(`/hosts/${hostId}`);
      expect(res).to.have.status(200);
      expect(res.body).to.deep.equal({
        data: {
          type: 'hosts',
          id: hostId,
          attributes: {
            creationTime: provider.testCreationTime.toISOString(),
            email: 'lessonteacher@gmail.com',
            givenName: 'Jay',
            familyName: 'Walter-Weatherman'
          }
        }
      });
    });

    it('can get caseworkers', async function() {
      let res = await factory.get(`/caseworkers/${caseworkerId}`);
      expect(res).to.have.status(200);

      delete res.body.data.relationships;
      expect(res.body).to.deep.equal({
        data: {
          type: 'caseworkers',
          id: caseworkerId,
          attributes: {
            creationTime: provider.testCreationTime.toISOString(),
            email: 'funnyorsomething@gmail.com',
            givenName: 'Ann',
            familyName: 'Veal'
          }
        }
      });
    });

    it('can see host profile', async function() {
      let client = new AWS.DynamoDB.DocumentClient({ service: dynamo });

      await client.batchWrite({
        RequestItems: {
          [process.env.HOST_PROFILES_TABLE]: [
            { PutRequest: { Item: { host: hostId, visible: false, greeting: 'hey brother' } } }
          ]
        }
      }).promise();

      let res = await factory.get(`/hosts/${hostId}`);
      expect(res).to.have.status(200);
      expect(res.body.data.relationships).to.deep.equal({
        profile: {
          data: { type: 'host-profiles', id: hostId }
        }
      });
      expect(res.body.included).to.deep.equal([
        {
          type: 'host-profiles',
          id: hostId,
          attributes: {
            host: hostId,
            visible: false,
            greeting: 'hey brother'
          }
        }
      ]);
    });

    it('can see resident profiles', async function() {
      let client = new AWS.DynamoDB.DocumentClient({ service: dynamo });

      await client.batchWrite({
        RequestItems: {
          [process.env.RESIDENT_PROFILES_TABLE]: [
            { PutRequest: { Item: { id: '1', caseworker: caseworkerId, email: 'steveholt@gmail.com' } } },
            { PutRequest: { Item: { id: '2', caseworker: caseworkerId, email: 'oscar@bluth.com' } } },
            { PutRequest: { Item: { id: '3', caseworker: 'nobody', email: 'annyong@gmail.com' } } }
          ]
        }
      }).promise();

      let res = await factory.get(`/caseworkers/${caseworkerId}`);
      expect(res).to.have.status(200);
      expect(res.body.data.relationships).to.deep.equal({
        residents: {
          data: [
            { type: 'resident-profiles', id: '1' },
            { type: 'resident-profiles', id: '2' }
          ]
        }
      });
      expect(res.body.included).to.deep.equal([
        {
          type: 'resident-profiles',
          id: '1',
          attributes: {
            caseworker: caseworkerId,
            email: 'steveholt@gmail.com'
          }
        },
        {
          type: 'resident-profiles',
          id: '2',
          attributes: {
            caseworker: caseworkerId,
            email: 'oscar@bluth.com'
          }
        }
      ]);
    });

    it('getting admin 404s', async function() {
      let res = await factory.get('/caseworkers/notanid');
      expect(res).to.have.status(404);
    });

    it('getting host 404s', async function() {
      let res = await factory.get('/hosts/notanid');
      expect(res).to.have.status(404);
    });

    it('getting caseworker 404s', async function() {
      let res = await factory.get('/caseworkers/notanid');
      expect(res).to.have.status(404);
    });

    it('getting admin as wrong type 404s', async function() {
      let res = await factory.get(`/admin/${hostId}`);
      expect(res).to.have.status(404);
    });

    it('getting host as wrong type 404s', async function() {
      let res = await factory.get(`/hosts/${caseworkerId}`);
      expect(res).to.have.status(404);
    });

    it('getting caseworker as wrong type 404s', async function() {
      let res = await factory.get(`/caseworkers/${adminId}`);
      expect(res).to.have.status(404);
    });
  });

  describe('caseworker', function() {
    beforeEach(function() {
      authStub.stub(sinon, 'caseworkers', caseworkerId);
    });

    it('cannot get admins', async function() {
      let res = await factory.get(`/admins/${adminId}`);
      expect(res).to.have.status(403);
    });

    it('can get hosts', async function() {
      let res = await factory.get(`/hosts/${hostId}`);
      expect(res).to.have.status(200);

      expect(res.body).to.deep.equal({
        data: {
          type: 'hosts',
          id: hostId,
          attributes: {
            creationTime: provider.testCreationTime.toISOString(),
            givenName: 'Jay',
            familyName: 'Walter-Weatherman'
          }
        }
      });
    });

    it('can get self', async function() {
      let client = new AWS.DynamoDB.DocumentClient({ service: dynamo });
      await client.batchWrite({
        RequestItems: {
          [process.env.RESIDENT_PROFILES_TABLE]: [
            { PutRequest: { Item: { id: '1', caseworker: caseworkerId, email: 'steveholt@gmail.com' } } }
          ]
        }
      }).promise();

      let res = await factory.get(`/caseworkers/${caseworkerId}`);
      expect(res).to.have.status(200);

      expect(res.body).to.deep.equal({
        data: {
          type: 'caseworkers',
          id: caseworkerId,
          attributes: {
            creationTime: provider.testCreationTime.toISOString(),
            email: 'funnyorsomething@gmail.com',
            givenName: 'Ann',
            familyName: 'Veal'
          },
          relationships: {
            residents: {
              data: [
                { type: 'resident-profiles', id: '1' }
              ]
            }
          }
        },
        included: [
          {
            type: 'resident-profiles',
            id: '1',
            attributes: {
              caseworker: caseworkerId,
              email: 'steveholt@gmail.com'
            }
          }
        ]
      });
    });

    it('cannot get non-self caseworkers', async function() {
      let res = await factory.get(`/caseworkers/${provider.groups.caseworkers[1]}`);
      expect(res).to.have.status(403);
    });

    it('can see host profile', async function() {
      let client = new AWS.DynamoDB.DocumentClient({ service: dynamo });

      await client.batchWrite({
        RequestItems: {
          [process.env.HOST_PROFILES_TABLE]: [
            { PutRequest: { Item: { host: hostId, visible: false, greeting: 'hey brother' } } }
          ]
        }
      }).promise();

      let res = await factory.get(`/hosts/${hostId}`);
      expect(res).to.have.status(200);
      expect(res.body.data.relationships).to.deep.equal({
        profile: {
          data: { type: 'host-profiles', id: hostId }
        }
      });
      expect(res.body.included).to.deep.equal([
        {
          type: 'host-profiles',
          id: hostId,
          attributes: {
            host: hostId,
            visible: false,
            greeting: 'hey brother'
          }
        }
      ]);
    });
  });

  describe('host', function() {
    beforeEach(function() {
      authStub.stub(sinon, 'hosts', hostId);
    });

    it('cannot get admins', async function() {
      let res = await factory.get(`/admins/${adminId}`);
      expect(res).to.have.status(403);
    });

    it('can get self', async function() {
      let client = new AWS.DynamoDB.DocumentClient({ service: dynamo });
      await client.batchWrite({
        RequestItems: {
          [process.env.HOST_PROFILES_TABLE]: [
            { PutRequest: { Item: { host: hostId, visible: false, greeting: 'hey brother' } } }
          ]
        }
      }).promise();

      let res = await factory.get(`/hosts/${hostId}`);
      expect(res).to.have.status(200);

      expect(res.body).to.deep.equal({
        data: {
          type: 'hosts',
          id: hostId,
          attributes: {
            creationTime: provider.testCreationTime.toISOString(),
            email: 'lessonteacher@gmail.com',
            givenName: 'Jay',
            familyName: 'Walter-Weatherman'
          },
          relationships: {
            profile: {
              data: { type: 'host-profiles', id: hostId }
            }
          }
        },
        included: [
          {
            type: 'host-profiles',
            id: hostId,
            attributes: {
              host: hostId,
              visible: false,
              greeting: 'hey brother'
            }
          }
        ]
      });
    });

    it('cannot get non-self hosts', async function() {
      let res = await factory.get(`/hosts/${provider.groups.hosts[1]}`);
      expect(res).to.have.status(403);
    });

    it('cannot get caseworkers', async function() {
      let res = await factory.get(`/caseworkers/${caseworkerId}`);
      expect(res).to.have.status(403);
    });
  });
});
