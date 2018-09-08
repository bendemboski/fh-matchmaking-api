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
      { Host: '1', Visible: false },
      { Host: '2', Visible: false },
      { Host: '3', Visible: false },
      { Host: '4', Visible: false },
      { Host: '5', Visible: false },
      { Host: '6', Visible: false },
      { Host: '7', Visible: false },
      { Host: '8', Visible: false },
      { Host: '9', Visible: false },
      { Host: '10', Visible: false }
    ];

    function sort(profilesPromise) {
      return profilesPromise.then((profiles) => {
        return profiles.sort((a, b) => parseInt(a.Host, 10) - parseInt(b.Host, 10));
      });
    }

    beforeEach(async function() {
      let client = new AWS.DynamoDB.DocumentClient({ service });

      await client.batchWrite({
        RequestItems: {
          [process.env.HOST_PROFILES_TABLE]: [
            { PutRequest: { Item: { Host: '1', Visible: false } } },
            { PutRequest: { Item: { Host: '2', Visible: false } } },
            { PutRequest: { Item: { Host: '3', Visible: false } } },
            { PutRequest: { Item: { Host: '4', Visible: false } } },
            { PutRequest: { Item: { Host: '5', Visible: false } } },
            { PutRequest: { Item: { Host: '6', Visible: false } } },
            { PutRequest: { Item: { Host: '7', Visible: false } } },
            { PutRequest: { Item: { Host: '8', Visible: false } } },
            { PutRequest: { Item: { Host: '9', Visible: false } } },
            { PutRequest: { Item: { Host: '10', Visible: false } } }
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
            { PutRequest: { Item: { Host: '1', Visible: false } } },
            { PutRequest: { Item: { Host: '2', Visible: false } } }
          ]
        }
      }).promise();
    });

    it('works', async function() {
      await expect(dynamo.getProfileForHost('1')).to.eventually.deep.equal({
        Host: '1',
        Visible: false
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
            { PutRequest: { Item: { Host: '1', Visible: false } } }
          ]
        }
      }).promise();
    });

    it('works', async function() {
      await expect(dynamo.createHostProfile('2', {
        Visible: true,
        Something: 'else'
      })).to.eventually.deep.equal({
        Host: '2',
        Visible: true,
        Something: 'else'
      });

      await expect(client.get({
        TableName: process.env.HOST_PROFILES_TABLE,
        Key: {
          Host: '2'
        }
      }).promise()).to.eventually.deep.include({
        Item: {
          Host: '2',
          Visible: true,
          Something: 'else'
        }
      });
    });

    it('works with no attributes', async function() {
      expect(dynamo.createHostProfile('2', {})).to.eventually.deep.equal({
        Host: '2'
      });
    });

    it('fails if the profile already exists', async function() {
      await expect(dynamo.createHostProfile('1', {
        Visible: true,
        Something: 'else'
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
            { PutRequest: { Item: { Host: '1', Visible: false } } }
          ]
        }
      }).promise();
    });

    it('works', async function() {
      await expect(dynamo.updateHostProfile('1', {
        Visible: true,
        Something: 'else'
      })).to.eventually.deep.equal({
        Host: '1',
        Visible: true,
        Something: 'else'
      });

      await expect(client.get({
        TableName: process.env.HOST_PROFILES_TABLE,
        Key: {
          Host: '1'
        }
      }).promise()).to.eventually.deep.include({
        Item: {
          Host: '1',
          Visible: true,
          Something: 'else'
        }
      });
    });

    it('works with no attributes', async function() {
      expect(dynamo.updateHostProfile('1', {})).to.eventually.deep.equal({
        Host: '1',
        Visible: false
      });
    });

    it('fails if the profile does not exists', async function() {
      await expect(dynamo.updateHostProfile('2', {
        Visible: true,
        Something: 'else'
      })).to.eventually.be.null;
    });
  });

  describe('getResidentCount()', function() {
    beforeEach(async function() {
      let client = new AWS.DynamoDB.DocumentClient({ service });

      await client.batchWrite({
        RequestItems: {
          [process.env.RESIDENT_PROFILES_TABLE]: [
            { PutRequest: { Item: { Id: 'a', Email: 'resident1@gmail.com', Caseworker: '1' } } },
            { PutRequest: { Item: { Id: 'b', Email: 'resident2@gmail.com', Caseworker: '1' } } },
            { PutRequest: { Item: { Id: 'c', Email: 'resident3@gmail.com', Caseworker: '1' } } },
            { PutRequest: { Item: { Id: 'd', Email: 'resident4@gmail.com', Caseworker: '1' } } },
            { PutRequest: { Item: { Id: 'e', Email: 'resident5@gmail.com', Caseworker: '1' } } },
            { PutRequest: { Item: { Id: 'f', Email: 'resident6@gmail.com', Caseworker: '1' } } },
            { PutRequest: { Item: { Id: 'g', Email: 'resident7@gmail.com', Caseworker: '1' } } },
            { PutRequest: { Item: { Id: 'h', Email: 'resident8@gmail.com', Caseworker: '1' } } },
            { PutRequest: { Item: { Id: 'i', Email: 'resident9@gmail.com', Caseworker: '1' } } },
            { PutRequest: { Item: { Id: 'j', Email: 'resident10@gmail.com', Caseworker: '1' } } }
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
      { Id: '1', Caseworker: 'a' },
      { Id: '2', Caseworker: 'b' },
      { Id: '3', Caseworker: 'c' },
      { Id: '4', Caseworker: 'd' },
      { Id: '5', Caseworker: 'e' },
      { Id: '6', Caseworker: 'f' },
      { Id: '7', Caseworker: 'g' },
      { Id: '8', Caseworker: 'h' },
      { Id: '9', Caseworker: 'i' },
      { Id: '10', Caseworker: 'j' }
    ];

    function sort(profilesPromise) {
      return profilesPromise.then((profiles) => {
        return profiles.sort((a, b) => parseInt(a.Id, 10) - parseInt(b.Id, 10));
      });
    }

    beforeEach(async function() {
      let client = new AWS.DynamoDB.DocumentClient({ service });

      await client.batchWrite({
        RequestItems: {
          [process.env.RESIDENT_PROFILES_TABLE]: [
            { PutRequest: { Item: { Id: '1', Caseworker: 'a' } } },
            { PutRequest: { Item: { Id: '2', Caseworker: 'b' } } },
            { PutRequest: { Item: { Id: '3', Caseworker: 'c' } } },
            { PutRequest: { Item: { Id: '4', Caseworker: 'd' } } },
            { PutRequest: { Item: { Id: '5', Caseworker: 'e' } } },
            { PutRequest: { Item: { Id: '6', Caseworker: 'f' } } },
            { PutRequest: { Item: { Id: '7', Caseworker: 'g' } } },
            { PutRequest: { Item: { Id: '8', Caseworker: 'h' } } },
            { PutRequest: { Item: { Id: '9', Caseworker: 'i' } } },
            { PutRequest: { Item: { Id: '10', Caseworker: 'j' } } }
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
            { PutRequest: { Item: { Id: '1', Caseworker: 'a' } } },
            { PutRequest: { Item: { Id: '2', Caseworker: 'a' } } },
            { PutRequest: { Item: { Id: '3', Caseworker: 'b' } } }
          ]
        }
      }).promise();
    });

    it('works', async function() {
      await expect(dynamo.getProfilesForCaseworker('a')).to.eventually.deep.equal([
        {
          Id: '1',
          Caseworker: 'a'
        },
        {
          Id: '2',
          Caseworker: 'a'
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
            { PutRequest: { Item: { Id: '1', Caseworker: 'a' } } },
            { PutRequest: { Item: { Id: '2', Caseworker: 'a' } } },
            { PutRequest: { Item: { Id: '3', Caseworker: 'b' } } }
          ]
        }
      }).promise();
    });

    it('works', async function() {
      await expect(dynamo.getProfileForCaseworker('a', '1')).to.eventually.deep.equal({
        Id: '1',
        Caseworker: 'a'
      });

      await expect(dynamo.getProfileForCaseworker('a', '2')).to.eventually.deep.equal({
        Id: '2',
        Caseworker: 'a'
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
            { PutRequest: { Item: { Id: '1', Caseworker: 'a', Some: 'thing' } } }
          ]
        }
      }).promise();
    });

    it('can create a first profile for a caseworker', async function() {
      let profile = await dynamo.createResidentProfile('b', {
        Something: 'else'
      });
      let { Id: id } = profile;

      expect(id).to.be.ok;
      expect(profile).to.deep.equal({
        Caseworker: 'b',
        Id: id,
        Something: 'else'
      });

      await expect(client.get({
        TableName: process.env.RESIDENT_PROFILES_TABLE,
        Key: {
          Caseworker: 'b',
          Id: id
        }
      }).promise()).to.eventually.deep.include({
        Item: {
          Caseworker: 'b',
          Id: id,
          Something: 'else'
        }
      });
    });

    it('can create an additional profile for a caseworker', async function() {
      let profile = await dynamo.createResidentProfile('a', {
        Something: 'else'
      });
      let { Id: id } = profile;

      expect(id).to.be.ok;
      expect(profile).to.deep.equal({
        Caseworker: 'a',
        Id: id,
        Something: 'else'
      });

      await expect(client.get({
        TableName: process.env.RESIDENT_PROFILES_TABLE,
        Key: {
          Caseworker: 'a',
          Id: id
        }
      }).promise()).to.eventually.deep.include({
        Item: {
          Caseworker: 'a',
          Id: id,
          Something: 'else'
        }
      });
    });

    it('works with no attributes', async function() {
      let profile = await dynamo.createResidentProfile('b', {});
      let { Id: id } = profile;

      expect(id).to.be.ok;
      expect(profile).to.deep.equal({
        Caseworker: 'b',
        Id: id
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
            { PutRequest: { Item: { Id: '1', Caseworker: 'a', Some: 'thing' } } }
          ]
        }
      }).promise();
    });

    it('works', async function() {
      await expect(dynamo.updateResidentProfile('a', '1', {
        Some: 'one',
        Something: 'else'
      })).to.eventually.deep.equal({
        Caseworker: 'a',
        Id: '1',
        Some: 'one',
        Something: 'else'
      });

      await expect(client.get({
        TableName: process.env.RESIDENT_PROFILES_TABLE,
        Key: {
          Caseworker: 'a',
          Id: '1'
        }
      }).promise()).to.eventually.deep.include({
        Item: {
          Caseworker: 'a',
          Id: '1',
          Some: 'one',
          Something: 'else'
        }
      });
    });

    it('works with no attributes', async function() {
      expect(dynamo.updateResidentProfile('a', '1', {})).to.eventually.deep.equal({
        Caseworker: 'a',
        Id: '1',
        Some: 'thing'
      });
    });

    it('fails if profile does not exist', async function() {
      await expect(dynamo.updateResidentProfile('a', '2', {
        Some: 'one',
        Something: 'else'
      })).to.eventually.be.null;
    });
  });
});
