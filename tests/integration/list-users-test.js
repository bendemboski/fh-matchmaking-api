const chai = require('chai');
const { expect } = chai;
const setupDynamo = require('../helpers/setup-dynamo');
const setupCognito = require('../helpers/setup-cognito');
const authStub = require('../helpers/auth-stub');
const AWS = require('aws-sdk');
const buildApp = require('../../lib/build-app');
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
      let res = await chai.request(buildApp()).get('/admins');
      expect(res).to.have.status(200);

      expect(res.body.data[0].id).to.not.be.empty;
      delete res.body.data[0].id;

      expect(res.body).to.deep.equal({
        data: [
          {
            type: 'admins',
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
      let res = await chai.request(buildApp()).get('/hosts');
      expect(res).to.have.status(200);

      expect(res.body.data[0].id).to.not.be.empty;
      delete res.body.data[0].id;
      expect(res.body.data[1].id).to.not.be.empty;
      delete res.body.data[1].id;

      expect(res.body).to.deep.equal({
        data: [
          {
            type: 'hosts',
            attributes: {
              email: 'lessonteacher@gmail.com',
              givenName: 'Jay',
              familyName: 'Walter-Weatherman'
            }
          },
          {
            type: 'hosts',
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
      let res = await chai.request(buildApp()).get('/caseworkers');
      expect(res).to.have.status(200);

      expect(res.body.data[0].id).to.not.be.empty;
      delete res.body.data[0].id;
      delete res.body.data[0].relationships;
      expect(res.body.data[1].id).to.not.be.empty;
      delete res.body.data[1].id;
      delete res.body.data[1].relationships;
      expect(res.body.data[2].id).to.not.be.empty;
      delete res.body.data[2].id;
      delete res.body.data[2].relationships;

      expect(res.body).to.deep.equal({
        data: [
          {
            type: 'caseworkers',
            attributes: {
              email: 'funnyorsomething@gmail.com',
              givenName: 'Ann',
              familyName: 'Veal'
            }
          },
          {
            type: 'caseworkers',
            attributes: {
              email: 'illusions@bluth.com',
              givenName: 'Gob',
              familyName: 'Bluth'
            }
          },
          {
            type: 'caseworkers',
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
            { PutRequest: { Item: { User: provider.groups.hosts[0], Visible: 0, Greeting: 'hey brother' } } }
          ]
        }
      }).promise();

      let res = await chai.request(buildApp()).get('/hosts');
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
            user: provider.groups.hosts[0],
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
            { PutRequest: { Item: { Id: '1', Caseworker: provider.groups.caseworkers[0], Email: 'steveholt@gmail.com' } } },
            { PutRequest: { Item: { Id: '2', Caseworker: provider.groups.caseworkers[0], Email: 'oscar@bluth.com' } } },
            { PutRequest: { Item: { Id: '3', Caseworker: provider.groups.caseworkers[1], Email: 'annyong@gmail.com' } } }
          ]
        }
      }).promise();

      let res = await chai.request(buildApp()).get('/caseworkers');
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
      let res = await chai.request(buildApp()).get('/admins');
      expect(res).to.have.status(403);
    });

    it('can list hosts', async function() {
      let res = await chai.request(buildApp()).get('/hosts');
      expect(res).to.have.status(200);

      expect(res.body.data[0].id).to.not.be.empty;
      delete res.body.data[0].id;
      expect(res.body.data[1].id).to.not.be.empty;
      delete res.body.data[1].id;

      expect(res.body).to.deep.equal({
        data: [
          {
            type: 'hosts',
            attributes: {
              givenName: 'Jay',
              familyName: 'Walter-Weatherman'
            }
          },
          {
            type: 'hosts',
            attributes: {
              givenName: 'Lucille',
              familyName: 'Bluth'
            }
          }
        ]
      });
    });

    it('cannot list caseworkers', async function() {
      let res = await chai.request(buildApp()).get('/caseworkers');
      expect(res).to.have.status(403);
    });

    it('can see host profile', async function() {
      let client = new AWS.DynamoDB.DocumentClient({ service: dynamo });

      await client.batchWrite({
        RequestItems: {
          [process.env.HOST_PROFILES_TABLE]: [
            { PutRequest: { Item: { User: provider.groups.hosts[0], Visible: 0, Greeting: 'hey brother' } } }
          ]
        }
      }).promise();

      let res = await chai.request(buildApp()).get('/hosts');
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
            user: provider.groups.hosts[0],
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
      let res = await chai.request(buildApp()).get('/admins');
      expect(res).to.have.status(403);
    });

    it('cannot list hosts', async function() {
      let res = await chai.request(buildApp()).get('/hosts');
      expect(res).to.have.status(403);
    });

    it('cannot list caseworkers', async function() {
      let res = await chai.request(buildApp()).get('/caseworkers');
      expect(res).to.have.status(403);
    });
  });
});
