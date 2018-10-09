const { expect } = require('chai');
const factory = require('../helpers/request-factory');
const setupDynamo = require('../helpers/setup-dynamo');
const setupCognito = require('../helpers/setup-cognito');
const authStub = require('../helpers/auth-stub');
const AWS = require('aws-sdk');
const sinon = require('sinon');

describe('list users', function() {
  let dynamo = setupDynamo();
  let provider = setupCognito();

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
        { 'given_name': 'Gob', 'family_name': 'Bluth', email: 'illusions@bluth.com' },
        { 'given_name': 'Gene', 'family_name': 'Parmesan', email: 'imgene@parmesan.com' }
      ]
    });
  });

  afterEach(function() {
    sinon.restore();
  });

  describe('admin', function() {
    beforeEach(function() {
      authStub.stub(sinon, 'admins');
    });

    it('can list admins', async function() {
      let res = await factory.get('/admins');
      expect(res).to.have.status(200);

      let { id } = res.body.data[0];
      expect(id).to.be.ok;

      expect(res.body).to.deep.equal({
        data: [
          {
            type: 'admins',
            id,
            attributes: {
              email: 'heybrother@bluth.com',
              givenName: 'Buster',
              familyName: 'Bluth'
            }
          }
        ]
      });
    });

    it('can list hosts', async function() {
      let res = await factory.get('/hosts');
      expect(res).to.have.status(200);

      let { id: id1 } = res.body.data[0];
      expect(id1).to.be.ok;
      let { id: id2 } = res.body.data[1];
      expect(id2).to.be.ok;

      expect(res.body).to.deep.equal({
        data: [
          {
            type: 'hosts',
            id: id1,
            attributes: {
              email: 'lessonteacher@gmail.com',
              givenName: 'Jay',
              familyName: 'Walter-Weatherman'
            }
          },
          {
            type: 'hosts',
            id: id2,
            attributes: {
              email: 'hospitalbar@bluth.com',
              givenName: 'Lucille',
              familyName: 'Bluth'
            }
          }
        ]
      });
    });

    it('can list caseworkers', async function() {
      let res = await factory.get('/caseworkers');
      expect(res).to.have.status(200);

      let { id: id1 } = res.body.data[0];
      expect(id1).to.be.ok;
      delete res.body.data[0].relationships;
      let { id: id2 } = res.body.data[1];
      expect(id2).to.be.ok;
      delete res.body.data[1].relationships;
      let { id: id3 } = res.body.data[2];
      expect(id3).to.be.ok;
      delete res.body.data[2].relationships;

      expect(res.body).to.deep.equal({
        data: [
          {
            type: 'caseworkers',
            id: id1,
            attributes: {
              email: 'funnyorsomething@gmail.com',
              givenName: 'Ann',
              familyName: 'Veal'
            }
          },
          {
            type: 'caseworkers',
            id: id2,
            attributes: {
              email: 'illusions@bluth.com',
              givenName: 'Gob',
              familyName: 'Bluth'
            }
          },
          {
            type: 'caseworkers',
            id: id3,
            attributes: {
              email: 'imgene@parmesan.com',
              givenName: 'Gene',
              familyName: 'Parmesan'
            }
          }
        ]
      });
    });

    it('can see host profile', async function() {
      let client = new AWS.DynamoDB.DocumentClient({ service: dynamo });

      await client.batchWrite({
        RequestItems: {
          [process.env.HOST_PROFILES_TABLE]: [
            { PutRequest: { Item: { host: provider.groups.hosts[0], visible: false, greeting: 'hey brother' } } }
          ]
        }
      }).promise();

      let res = await factory.get('/hosts');
      expect(res).to.have.status(200);
      expect(res.body.data[0].relationships).to.deep.equal({
        profile: {
          data: { type: 'host-profiles', id: provider.groups.hosts[0] }
        }
      });
      expect(res.body.data[1].relationships || []).to.be.empty;
      expect(res.body.included).to.deep.equal([
        {
          type: 'host-profiles',
          id: provider.groups.hosts[0],
          attributes: {
            host: provider.groups.hosts[0],
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
            { PutRequest: { Item: { id: '1', caseworker: provider.groups.caseworkers[0], email: 'steveholt@gmail.com' } } },
            { PutRequest: { Item: { id: '2', caseworker: provider.groups.caseworkers[0], email: 'oscar@bluth.com' } } },
            { PutRequest: { Item: { id: '3', caseworker: provider.groups.caseworkers[1], email: 'annyong@gmail.com' } } }
          ]
        }
      }).promise();

      let res = await factory.get('/caseworkers');
      expect(res).to.have.status(200);
      expect(res.body.data[0].relationships).to.deep.equal({
        residents: {
          data: [
            { type: 'resident-profiles', id: '1' },
            { type: 'resident-profiles', id: '2' }
          ]
        }
      });
      expect(res.body.data[1].relationships).to.deep.equal({
        residents: {
          data: [
            { type: 'resident-profiles', id: '3' }
          ]
        }
      });
      expect(res.body.data[2].relationships).to.deep.equal({
        residents: {
          data: []
        }
      });
      expect(res.body.included).to.deep.equal([
        {
          type: 'resident-profiles',
          id: '1',
          attributes: {
            caseworker: provider.groups.caseworkers[0],
            email: 'steveholt@gmail.com'
          }
        },
        {
          type: 'resident-profiles',
          id: '2',
          attributes: {
            caseworker: provider.groups.caseworkers[0],
            email: 'oscar@bluth.com'
          }
        },
        {
          type: 'resident-profiles',
          id: '3',
          attributes: {
            caseworker: provider.groups.caseworkers[1],
            email: 'annyong@gmail.com'
          }
        }
      ]);
    });
  });

  describe('caseworker', function() {
    beforeEach(function() {
      authStub.stub(sinon, 'caseworkers');
    });

    it('cannot list admins', async function() {
      let res = await factory.get('/admins');
      expect(res).to.have.status(403);
    });

    it('can list hosts', async function() {
      let res = await factory.get('/hosts');
      expect(res).to.have.status(200);

      let { id: id1 } = res.body.data[0];
      expect(id1).to.be.ok;
      let { id: id2 } = res.body.data[1];
      expect(id2).to.be.ok;

      expect(res.body).to.deep.equal({
        data: [
          {
            type: 'hosts',
            id: id1,
            attributes: {
              givenName: 'Jay',
              familyName: 'Walter-Weatherman'
            }
          },
          {
            type: 'hosts',
            id: id2,
            attributes: {
              givenName: 'Lucille',
              familyName: 'Bluth'
            }
          }
        ]
      });
    });

    it('cannot list caseworkers', async function() {
      let res = await factory.get('/caseworkers');
      expect(res).to.have.status(403);
    });

    it('can see host profile', async function() {
      let client = new AWS.DynamoDB.DocumentClient({ service: dynamo });

      await client.batchWrite({
        RequestItems: {
          [process.env.HOST_PROFILES_TABLE]: [
            { PutRequest: { Item: { host: provider.groups.hosts[0], visible: false, greeting: 'hey brother' } } }
          ]
        }
      }).promise();

      let res = await factory.get('/hosts');
      expect(res).to.have.status(200);
      expect(res.body.data[0].relationships).to.deep.equal({
        profile: {
          data: { type: 'host-profiles', id: provider.groups.hosts[0] }
        }
      });
      expect(res.body.data[1].relationships || []).to.be.empty;
      expect(res.body.included).to.deep.equal([
        {
          type: 'host-profiles',
          id: provider.groups.hosts[0],
          attributes: {
            host: provider.groups.hosts[0],
            visible: false,
            greeting: 'hey brother'
          }
        }
      ]);
    });
  });

  describe('host', function() {
    beforeEach(function() {
      authStub.stub(sinon, 'hosts');
    });

    it('cannot list admins', async function() {
      let res = await factory.get('/admins');
      expect(res).to.have.status(403);
    });

    it('cannot list hosts', async function() {
      let res = await factory.get('/hosts');
      expect(res).to.have.status(403);
    });

    it('cannot list caseworkers', async function() {
      let res = await factory.get('/caseworkers');
      expect(res).to.have.status(403);
    });
  });
});
