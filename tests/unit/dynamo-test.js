const { expect } = require('chai');
const setupDynamo = require('../helpers/setup-dynamo');
const sinon = require('sinon');
const env = require('../../lib/environment');
const AWS = require('aws-sdk');
const Dynamo = require('../../lib/dynamo');

describe('dynamo', function() {
  let service = setupDynamo();

  let dynamo;

  beforeEach(function() {
    dynamo = new Dynamo(env);
  });

  describe('getHostProfiles()', function() {
    const expected = [
      { host: '1', visible: false },
      { host: '2', visible: false },
      { host: '3', visible: false },
      { host: '4', visible: false },
      { host: '5', visible: false },
      { host: '6', visible: false },
      { host: '7', visible: false },
      { host: '8', visible: false },
      { host: '9', visible: false },
      { host: '10', visible: false }
    ];

    function sort(profilesPromise) {
      return profilesPromise.then((profiles) => {
        return profiles.sort((a, b) => parseInt(a.host, 10) - parseInt(b.host, 10));
      });
    }

    beforeEach(async function() {
      let client = new AWS.DynamoDB.DocumentClient({ service });

      await client.batchWrite({
        RequestItems: {
          [process.env.HOST_PROFILES_TABLE]: [
            { PutRequest: { Item: { host: '1', visible: false } } },
            { PutRequest: { Item: { host: '2', visible: false } } },
            { PutRequest: { Item: { host: '3', visible: false } } },
            { PutRequest: { Item: { host: '4', visible: false } } },
            { PutRequest: { Item: { host: '5', visible: false } } },
            { PutRequest: { Item: { host: '6', visible: false } } },
            { PutRequest: { Item: { host: '7', visible: false } } },
            { PutRequest: { Item: { host: '8', visible: false } } },
            { PutRequest: { Item: { host: '9', visible: false } } },
            { PutRequest: { Item: { host: '10', visible: false } } }
          ]
        }
      }).promise();
    });

    it('works with one page of data', async function() {
      await expect(sort(dynamo.getHostProfiles())).to.eventually.deep.equal(expected);
    });

    it('works with multiple pages of data', async function() {
      // Rather than trying to fill up a full megabyte of results, we just do a
      // little trickery to add a Limit parameter to the request
      let origQuery = dynamo.client.scan.bind(dynamo.client);
      sinon.stub(dynamo.client, 'query').callsFake((options) => {
        return origQuery(Object.assign({ Limit: 3 }, options));
      });

      await expect(sort(dynamo.getHostProfiles())).to.eventually.deep.equal(expected);
    });
  });

  describe('getProfileForHost()', function() {
    beforeEach(async function() {
      let client = new AWS.DynamoDB.DocumentClient({ service });

      await client.batchWrite({
        RequestItems: {
          [process.env.HOST_PROFILES_TABLE]: [
            { PutRequest: { Item: { host: '1', visible: false } } },
            { PutRequest: { Item: { host: '2', visible: false } } }
          ]
        }
      }).promise();
    });

    it('works', async function() {
      await expect(dynamo.getProfileForHost('1')).to.eventually.deep.equal({
        host: '1',
        visible: false
      });
    });

    it('returns null when not found', async function() {
      await expect(dynamo.getProfileForHost('4')).to.eventually.be.undefined;
    });
  });

  describe('createHostProfile()', function() {
    let client;

    beforeEach(async function() {
      client = new AWS.DynamoDB.DocumentClient({ service });

      await client.batchWrite({
        RequestItems: {
          [process.env.HOST_PROFILES_TABLE]: [
            { PutRequest: { Item: { host: '1', visible: false } } }
          ]
        }
      }).promise();
    });

    it('works', async function() {
      await expect(dynamo.createHostProfile('2', {
        visible: true,
        something: 'else'
      })).to.eventually.deep.equal({
        host: '2',
        visible: true,
        something: 'else'
      });

      await expect(client.get({
        TableName: process.env.HOST_PROFILES_TABLE,
        Key: {
          host: '2'
        }
      }).promise()).to.eventually.deep.include({
        Item: {
          host: '2',
          visible: true,
          something: 'else'
        }
      });
    });

    it('works with no attributes', async function() {
      expect(dynamo.createHostProfile('2', {})).to.eventually.deep.equal({
        host: '2'
      });
    });

    it('fails if the profile already exists', async function() {
      await expect(dynamo.createHostProfile('1', {
        visible: true,
        something: 'else'
      })).to.eventually.be.null;
    });
  });

  describe('updateHostProfile()', function() {
    let client;

    beforeEach(async function() {
      client = new AWS.DynamoDB.DocumentClient({ service });

      await client.batchWrite({
        RequestItems: {
          [process.env.HOST_PROFILES_TABLE]: [
            { PutRequest: { Item: { host: '1', visible: false } } }
          ]
        }
      }).promise();
    });

    it('works', async function() {
      await expect(dynamo.updateHostProfile('1', {
        visible: true,
        something: 'else'
      })).to.eventually.deep.equal({
        host: '1',
        visible: true,
        something: 'else'
      });

      await expect(client.get({
        TableName: process.env.HOST_PROFILES_TABLE,
        Key: {
          host: '1'
        }
      }).promise()).to.eventually.deep.include({
        Item: {
          host: '1',
          visible: true,
          something: 'else'
        }
      });
    });

    it('works with no attributes', async function() {
      expect(dynamo.updateHostProfile('1', {})).to.eventually.deep.equal({
        host: '1',
        visible: false
      });
    });

    it('fails if the profile does not exists', async function() {
      await expect(dynamo.updateHostProfile('2', {
        visible: true,
        something: 'else'
      })).to.eventually.be.null;
    });
  });

  describe('deleteHostProfile()', async function() {
    let client;

    beforeEach(async function() {
      client = new AWS.DynamoDB.DocumentClient({ service });

      await client.batchWrite({
        RequestItems: {
          [process.env.HOST_PROFILES_TABLE]: [
            { PutRequest: { Item: { host: '1', visible: false } } }
          ]
        }
      }).promise();
    });

    it('works', async function() {
      await expect(dynamo.deleteHostProfile('1')).to.eventually.be.true;

      await expect(client.scan({
        TableName: process.env.HOST_PROFILES_TABLE
      }).promise()).to.eventually.have.property('Count', 0);
    });

    it('works when the profile does not exist', async function() {
      await expect(dynamo.deleteHostProfile('2')).to.eventually.be.false;

      await expect(client.scan({
        TableName: process.env.HOST_PROFILES_TABLE
      }).promise()).to.eventually.have.property('Count', 1);
    });
  });

  describe('getResidentCount()', function() {
    beforeEach(async function() {
      let client = new AWS.DynamoDB.DocumentClient({ service });

      await client.batchWrite({
        RequestItems: {
          [process.env.RESIDENT_PROFILES_TABLE]: [
            { PutRequest: { Item: { id: 'a', email: 'resident1@gmail.com', caseworker: '1' } } },
            { PutRequest: { Item: { id: 'b', email: 'resident2@gmail.com', caseworker: '1' } } },
            { PutRequest: { Item: { id: 'c', email: 'resident3@gmail.com', caseworker: '1' } } },
            { PutRequest: { Item: { id: 'd', email: 'resident4@gmail.com', caseworker: '1' } } },
            { PutRequest: { Item: { id: 'e', email: 'resident5@gmail.com', caseworker: '1' } } },
            { PutRequest: { Item: { id: 'f', email: 'resident6@gmail.com', caseworker: '1' } } },
            { PutRequest: { Item: { id: 'g', email: 'resident7@gmail.com', caseworker: '1' } } },
            { PutRequest: { Item: { id: 'h', email: 'resident8@gmail.com', caseworker: '1' } } },
            { PutRequest: { Item: { id: 'i', email: 'resident9@gmail.com', caseworker: '1' } } },
            { PutRequest: { Item: { id: 'j', email: 'resident10@gmail.com', caseworker: '1' } } }
          ]
        }
      }).promise();
    });

    it('works with one page of data', async function() {
      await expect(dynamo.getResidentCount()).to.eventually.equal(10);
    });

    it('works with multiple pages of data', async function() {
      // Rather than trying to fill up a full megabyte of results, we just do a
      // little trickery to add a Limit parameter to the request
      let origScan = dynamo.client.scan.bind(dynamo.client);
      sinon.stub(dynamo.client, 'scan').callsFake((options) => {
        return origScan(Object.assign({ Limit: 3 }, options));
      });

      await expect(dynamo.getResidentCount()).to.eventually.equal(10);
    });
  });

  describe('getResidentProfiles()', function() {
    let expected = [
      { id: '1', caseworker: 'a' },
      { id: '2', caseworker: 'b' },
      { id: '3', caseworker: 'c' },
      { id: '4', caseworker: 'd' },
      { id: '5', caseworker: 'e' },
      { id: '6', caseworker: 'f' },
      { id: '7', caseworker: 'g' },
      { id: '8', caseworker: 'h' },
      { id: '9', caseworker: 'i' },
      { id: '10', caseworker: 'j' }
    ];

    function sort(profilesPromise) {
      return profilesPromise.then((profiles) => {
        return profiles.sort((a, b) => parseInt(a.id, 10) - parseInt(b.id, 10));
      });
    }

    beforeEach(async function() {
      let client = new AWS.DynamoDB.DocumentClient({ service });

      await client.batchWrite({
        RequestItems: {
          [process.env.RESIDENT_PROFILES_TABLE]: [
            { PutRequest: { Item: { id: '1', caseworker: 'a' } } },
            { PutRequest: { Item: { id: '2', caseworker: 'b' } } },
            { PutRequest: { Item: { id: '3', caseworker: 'c' } } },
            { PutRequest: { Item: { id: '4', caseworker: 'd' } } },
            { PutRequest: { Item: { id: '5', caseworker: 'e' } } },
            { PutRequest: { Item: { id: '6', caseworker: 'f' } } },
            { PutRequest: { Item: { id: '7', caseworker: 'g' } } },
            { PutRequest: { Item: { id: '8', caseworker: 'h' } } },
            { PutRequest: { Item: { id: '9', caseworker: 'i' } } },
            { PutRequest: { Item: { id: '10', caseworker: 'j' } } }
          ]
        }
      }).promise();
    });

    it('works with one page of data', async function() {
      await expect(sort(dynamo.getResidentProfiles())).to.eventually.deep.equal(expected);
    });

    it('works with multiple pages of data', async function() {
      // Rather than trying to fill up a full megabyte of results, we just do a
      // little trickery to add a Limit parameter to the request
      let origQuery = dynamo.client.query.bind(dynamo.client);
      sinon.stub(dynamo.client, 'query').callsFake((options) => {
        return origQuery(Object.assign({ Limit: 3 }, options));
      });

      await expect(sort(dynamo.getResidentProfiles())).to.eventually.deep.equal(expected);
    });
  });

  describe('getProfilesForCaseworker()', function() {
    beforeEach(async function() {
      let client = new AWS.DynamoDB.DocumentClient({ service });

      await client.batchWrite({
        RequestItems: {
          [process.env.RESIDENT_PROFILES_TABLE]: [
            { PutRequest: { Item: { id: '1', caseworker: 'a' } } },
            { PutRequest: { Item: { id: '2', caseworker: 'a' } } },
            { PutRequest: { Item: { id: '3', caseworker: 'b' } } }
          ]
        }
      }).promise();
    });

    it('works', async function() {
      await expect(dynamo.getProfilesForCaseworker('a')).to.eventually.deep.equal([
        {
          id: '1',
          caseworker: 'a'
        },
        {
          id: '2',
          caseworker: 'a'
        }
      ]);
    });

    it('works when none are found', async function() {
      await expect(dynamo.getProfilesForCaseworker('4')).to.eventually.deep.equal([]);
    });
  });

  describe('getProfileForCaseworker()', function() {
    beforeEach(async function() {
      let client = new AWS.DynamoDB.DocumentClient({ service });

      await client.batchWrite({
        RequestItems: {
          [process.env.RESIDENT_PROFILES_TABLE]: [
            { PutRequest: { Item: { id: '1', caseworker: 'a' } } },
            { PutRequest: { Item: { id: '2', caseworker: 'a' } } },
            { PutRequest: { Item: { id: '3', caseworker: 'b' } } }
          ]
        }
      }).promise();
    });

    it('works', async function() {
      await expect(dynamo.getProfileForCaseworker('a', '1')).to.eventually.deep.equal({
        id: '1',
        caseworker: 'a'
      });

      await expect(dynamo.getProfileForCaseworker('a', '2')).to.eventually.deep.equal({
        id: '2',
        caseworker: 'a'
      });
    });

    it('works when the id does not exist', async function() {
      await expect(dynamo.getProfileForCaseworker('a', 'notanid')).to.eventually.be.undefined;
    });

    it('works when the id belongs to another caseworker', async function() {
      await expect(dynamo.getProfileForCaseworker('a', '3')).to.eventually.be.undefined;
    });

    it('works when neither caseworker nor id exist', async function() {
      await expect(dynamo.getProfileForCaseworker('notacaseworker', 'notanid')).to.eventually.be.undefined;
    });
  });

  describe('createResidentProfile()', function() {
    let client;

    beforeEach(async function() {
      client = new AWS.DynamoDB.DocumentClient({ service });

      await client.batchWrite({
        RequestItems: {
          [process.env.RESIDENT_PROFILES_TABLE]: [
            { PutRequest: { Item: { id: '1', caseworker: 'a', some: 'thing' } } }
          ]
        }
      }).promise();
    });

    it('can create a first profile for a caseworker', async function() {
      let profile = await dynamo.createResidentProfile('b', {
        something: 'else'
      });
      let { id: id } = profile;

      expect(id).to.be.ok;
      expect(profile).to.deep.equal({
        caseworker: 'b',
        id,
        something: 'else'
      });

      await expect(client.get({
        TableName: process.env.RESIDENT_PROFILES_TABLE,
        Key: {
          caseworker: 'b',
          id
        }
      }).promise()).to.eventually.deep.include({
        Item: {
          caseworker: 'b',
          id,
          something: 'else'
        }
      });
    });

    it('can create an additional profile for a caseworker', async function() {
      let profile = await dynamo.createResidentProfile('a', {
        something: 'else'
      });
      let { id: id } = profile;

      expect(id).to.be.ok;
      expect(profile).to.deep.equal({
        caseworker: 'a',
        id,
        something: 'else'
      });

      await expect(client.get({
        TableName: process.env.RESIDENT_PROFILES_TABLE,
        Key: {
          caseworker: 'a',
          id
        }
      }).promise()).to.eventually.deep.include({
        Item: {
          caseworker: 'a',
          id,
          something: 'else'
        }
      });
    });

    it('works with no attributes', async function() {
      let profile = await dynamo.createResidentProfile('b', {});
      let { id: id } = profile;

      expect(id).to.be.ok;
      expect(profile).to.deep.equal({
        caseworker: 'b',
        id
      });
    });
  });

  describe('updateResidentProfile()', function() {
    let client;

    beforeEach(async function() {
      client = new AWS.DynamoDB.DocumentClient({ service });

      await client.batchWrite({
        RequestItems: {
          [process.env.RESIDENT_PROFILES_TABLE]: [
            { PutRequest: { Item: { id: '1', caseworker: 'a', some: 'thing' } } }
          ]
        }
      }).promise();
    });

    it('works', async function() {
      await expect(dynamo.updateResidentProfile('a', '1', {
        some: 'one',
        something: 'else'
      })).to.eventually.deep.equal({
        caseworker: 'a',
        id: '1',
        some: 'one',
        something: 'else'
      });

      await expect(client.get({
        TableName: process.env.RESIDENT_PROFILES_TABLE,
        Key: {
          caseworker: 'a',
          id: '1'
        }
      }).promise()).to.eventually.deep.include({
        Item: {
          caseworker: 'a',
          id: '1',
          some: 'one',
          something: 'else'
        }
      });
    });

    it('works with no attributes', async function() {
      expect(dynamo.updateResidentProfile('a', '1', {})).to.eventually.deep.equal({
        caseworker: 'a',
        id: '1',
        some: 'thing'
      });
    });

    it('fails if profile does not exist', async function() {
      await expect(dynamo.updateResidentProfile('a', '2', {
        some: 'one',
        something: 'else'
      })).to.eventually.be.null;
    });
  });

  describe('deleteResidentProfile()', async function() {
    let client;

    beforeEach(async function() {
      client = new AWS.DynamoDB.DocumentClient({ service });

      await client.batchWrite({
        RequestItems: {
          [process.env.RESIDENT_PROFILES_TABLE]: [
            { PutRequest: { Item: { id: '1', caseworker: 'a', some: 'thing' } } },
            { PutRequest: { Item: { id: '2', caseworker: 'a', Some: 'thingy' } } }
          ]
        }
      }).promise();
    });

    it('works', async function() {
      await expect(dynamo.deleteResidentProfile('a', '2')).to.eventually.be.true;

      await expect(client.scan({
        TableName: process.env.RESIDENT_PROFILES_TABLE
      }).promise()).to.eventually.have.property('Count', 1);
    });

    it('works when the profile does not exist', async function() {
      await expect(dynamo.deleteHostProfile('a', '3')).to.eventually.be.false;

      await expect(client.scan({
        TableName: process.env.RESIDENT_PROFILES_TABLE
      }).promise()).to.eventually.have.property('Count', 2);
    });
  });
});
