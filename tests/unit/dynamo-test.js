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

  describe('getHostProfiles()', function() {
    const expected = [
      { User: '1', Visible: 0 },
      { User: '2', Visible: 0 },
      { User: '3', Visible: 0 },
      { User: '4', Visible: 0 },
      { User: '5', Visible: 0 },
      { User: '6', Visible: 0 },
      { User: '7', Visible: 0 },
      { User: '8', Visible: 0 },
      { User: '9', Visible: 0 },
      { User: '10', Visible: 0 }
    ];

    function sort(profilesPromise) {
      return profilesPromise.then((profiles) => {
        return profiles.sort((a, b) => parseInt(a.User, 10) - parseInt(b.User, 10));
      });
    }

    beforeEach(async function() {
      let client = new AWS.DynamoDB.DocumentClient({ service });

      await client.batchWrite({
        RequestItems: {
          [process.env.HOST_PROFILES_TABLE]: [
            { PutRequest: { Item: { User: '1', Visible: 0 } } },
            { PutRequest: { Item: { User: '2', Visible: 0 } } },
            { PutRequest: { Item: { User: '3', Visible: 0 } } },
            { PutRequest: { Item: { User: '4', Visible: 0 } } },
            { PutRequest: { Item: { User: '5', Visible: 0 } } },
            { PutRequest: { Item: { User: '6', Visible: 0 } } },
            { PutRequest: { Item: { User: '7', Visible: 0 } } },
            { PutRequest: { Item: { User: '8', Visible: 0 } } },
            { PutRequest: { Item: { User: '9', Visible: 0 } } },
            { PutRequest: { Item: { User: '10', Visible: 0 } } }
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

  describe('getProfileForHost()', function() {
    beforeEach(async function() {
      let client = new AWS.DynamoDB.DocumentClient({ service });

      await client.batchWrite({
        RequestItems: {
          [process.env.HOST_PROFILES_TABLE]: [
            { PutRequest: { Item: { User: '1', Visible: 0 } } },
            { PutRequest: { Item: { User: '2', Visible: 0 } } }
          ]
        }
      }).promise();
    });

    it('works', async function() {
      await expect(dynamo.getProfileForHost('1')).to.eventually.deep.equal({
        User: '1',
        Visible: 0
      });
    });

    it('returns null when not found', async function() {
      await expect(dynamo.getProfileForHost('4')).to.eventually.be.undefined;
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
});
