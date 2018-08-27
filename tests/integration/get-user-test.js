const chai = require('chai');
const { expect } = chai;
const setupDynamo = require('../helpers/setup-dynamo');
const setupCognito = require('../helpers/setup-cognito');
const authStub = require('../helpers/auth-stub');
const AWS = require('aws-sdk');
const buildApp = require('../../lib/build-app');
const sinon = require('sinon');

describe('get user', function() {
  let dynamo = setupDynamo();
  let provider = setupCognito();
  let adminId;
  let hostId;
  let caseworkerId;

  beforeEach(function() {
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

  describe('admin', function() {
    beforeEach(function() {
      authStub.stub(sinon, 'admins');
    });

    it('can get admins', async function() {
      let res = await chai.request(buildApp()).get(`/admins/${adminId}`);
      expect(res).to.have.status(200);
      expect(res.body).to.deep.equal({
        data: {
          type: 'admins',
          id: adminId,
          attributes: {
            email: 'heybrother@bluth.com',
            givenName: 'Buster',
            familyName: 'Bluth'
          }
        }
      });
    });

    it('can get hosts', async function() {
      let res = await chai.request(buildApp()).get(`/hosts/${hostId}`);
      expect(res).to.have.status(200);
      expect(res.body).to.deep.equal({
        data: {
          type: 'hosts',
          id: hostId,
          attributes: {
            email: 'lessonteacher@gmail.com',
            givenName: 'Jay',
            familyName: 'Walter-Weatherman'
          }
        }
      });
    });

    it('can get caseworkers', async function() {
      let res = await chai.request(buildApp()).get(`/caseworkers/${caseworkerId}`);
      expect(res).to.have.status(200);

      delete res.body.data.relationships;
      expect(res.body).to.deep.equal({
        data: {
          type: 'caseworkers',
          id: caseworkerId,
          attributes: {
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
            { PutRequest: { Item: { User: hostId, Visible: 0, Greeting: 'hey brother' } } }
          ]
        }
      }).promise();

      let res = await chai.request(buildApp()).get(`/hosts/${hostId}`);
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
            user: hostId,
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
            { PutRequest: { Item: { Id: '1', Caseworker: caseworkerId, Email: 'steveholt@gmail.com' } } },
            { PutRequest: { Item: { Id: '2', Caseworker: caseworkerId, Email: 'oscar@bluth.com' } } },
            { PutRequest: { Item: { Id: '3', Caseworker: 'nobody', Email: 'annyong@gmail.com' } } }
          ]
        }
      }).promise();

      let res = await chai.request(buildApp()).get(`/caseworkers/${caseworkerId}`);
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
      let res = await chai.request(buildApp()).get('/caseworkers/notanid');
      expect(res).to.have.status(404);
    });

    it('getting host 404s', async function() {
      let res = await chai.request(buildApp()).get('/hosts/notanid');
      expect(res).to.have.status(404);
    });

    it('getting caseworker 404s', async function() {
      let res = await chai.request(buildApp()).get('/caseworkers/notanid');
      expect(res).to.have.status(404);
    });
  });

  describe('caseworker', function() {
    beforeEach(function() {
      authStub.stub(sinon, 'caseworkers', provider.buildUser(caseworkerId));
    });

    it('cannot get admins', async function() {
      let res = await chai.request(buildApp()).get(`/admins/${adminId}`);
      expect(res).to.have.status(403);
    });

    it('can get hosts', async function() {
      let res = await chai.request(buildApp()).get(`/hosts/${hostId}`);
      expect(res).to.have.status(200);

      expect(res.body).to.deep.equal({
        data: {
          type: 'hosts',
          id: hostId,
          attributes: {
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
            { PutRequest: { Item: { Id: '1', Caseworker: caseworkerId, Email: 'steveholt@gmail.com' } } }
          ]
        }
      }).promise();

      let res = await chai.request(buildApp()).get(`/caseworkers/${caseworkerId}`);
      expect(res).to.have.status(200);

      expect(res.body).to.deep.equal({
        data: {
          type: 'caseworkers',
          id: caseworkerId,
          attributes: {
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
      let res = await chai.request(buildApp()).get(`/caseworkers/${provider.groups.caseworkers[1]}`);
      expect(res).to.have.status(403);
    });

    it('can see host profile', async function() {
      let client = new AWS.DynamoDB.DocumentClient({ service: dynamo });

      await client.batchWrite({
        RequestItems: {
          [process.env.HOST_PROFILES_TABLE]: [
            { PutRequest: { Item: { User: hostId, Visible: 0, Greeting: 'hey brother' } } }
          ]
        }
      }).promise();

      let res = await chai.request(buildApp()).get(`/hosts/${hostId}`);
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
            user: hostId,
            visible: false,
            greeting: 'hey brother'
          }
        }
      ]);
    });
  });

  describe('host', function() {
    beforeEach(function() {
      authStub.stub(sinon, 'hosts', provider.buildUser(hostId));
    });

    it('cannot get admins', async function() {
      let res = await chai.request(buildApp()).get(`/admins/${adminId}`);
      expect(res).to.have.status(403);
    });

    it('can get self', async function() {
      let client = new AWS.DynamoDB.DocumentClient({ service: dynamo });
      await client.batchWrite({
        RequestItems: {
          [process.env.HOST_PROFILES_TABLE]: [
            { PutRequest: { Item: { User: hostId, Visible: 0, Greeting: 'hey brother' } } }
          ]
        }
      }).promise();

      let res = await chai.request(buildApp()).get(`/hosts/${hostId}`);
      expect(res).to.have.status(200);

      expect(res.body).to.deep.equal({
        data: {
          type: 'hosts',
          id: hostId,
          attributes: {
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
              user: hostId,
              visible: false,
              greeting: 'hey brother'
            }
          }
        ]
      });
    });

    it('cannot get non-self hosts', async function() {
      let res = await chai.request(buildApp()).get(`/hosts/${provider.groups.hosts[1]}`);
      expect(res).to.have.status(403);
    });

    it('cannot get caseworkers', async function() {
      let res = await chai.request(buildApp()).get(`/caseworkers/${caseworkerId}`);
      expect(res).to.have.status(403);
    });
  });
});
