const AWS = require('aws-sdk');
const uuid = require('uuid/v4');

class Dynamo {
  constructor({ region, dynamoEndpoint, residentProfilesTable, hostProfilesTable }) {
    this.client = new AWS.DynamoDB.DocumentClient({
      service: new AWS.DynamoDB({ region, endpoint: dynamoEndpoint })
    });
    this.residentProfilesTable = residentProfilesTable;
    this.hostProfilesTable = hostProfilesTable;
  }

  //
  // Get all host profiles
  //
  async getHostProfiles() {
    return await this._scanTable(this.hostProfilesTable);
  }

  //
  // Get a host's profile
  //
  async getProfileForHost(username) {
    let { Item: profile  } = await this.client.get({
      TableName : this.hostProfilesTable,
      Key: {
        host: username
      }
    }).promise();
    return profile;
  }

  //
  // Create a host's profile
  //
  async createHostProfile(username, hash) {
    try {
      let { Attributes: profile } = await this.client.update(Object.assign({
        TableName: this.hostProfilesTable,
        Key: {
          host: username
        },
        ReturnValues: 'ALL_NEW',
        ConditionExpression: 'attribute_not_exists(host)'
      }, hashToUpdateExpression(hash))).promise();
      return profile;
    } catch (e) {
      if (e.code === 'ConditionalCheckFailedException') {
        // This means it alreadys exists, so just return null
        return null;
      }
      throw e;
    }
  }

  //
  // Update a host's profile
  //
  async updateHostProfile(username, hash) {
    try {
      let { Attributes: profile } = await this.client.update(Object.assign({
        TableName: this.hostProfilesTable,
        Key: {
          host: username
        },
        ReturnValues: 'ALL_NEW',
        ConditionExpression: 'attribute_exists(host)'
      }, hashToUpdateExpression(hash))).promise();
      return profile;
    } catch (e) {
      if (e.code === 'ConditionalCheckFailedException') {
      // This means it doesn't exist, so just return null
        return null;
      }
      throw e;
    }
  }

  //
  // Delete a host's profile. Returns true if deleted, false if not found.
  //
  async deleteHostProfile(username) {
    try {
      await this.client.delete({
        TableName: this.hostProfilesTable,
        Key: {
          host: username
        },
        ConditionExpression: 'attribute_exists(host)'
      }).promise();
      return true;
    } catch (e) {
      if (e.code === 'ConditionalCheckFailedException') {
        // This means it doesn't exist
        return false;
      }
      throw e;
    }
  }

  //
  // Get count of resident profiles
  //
  async getResidentCount() {
    return await this._getTableItemCount(this.residentProfilesTable);
  }

  //
  // Get all resident profiles
  //
  async getResidentProfiles() {
    return await this._scanTable(this.residentProfilesTable);
  }

  //
  // Get all resident profile for a given caseworker
  //
  async getProfilesForCaseworker(username) {
    let iter = this._iterPages((attrs) => this.client.query(attrs), {
      TableName : this.residentProfilesTable,
      KeyConditions: {
        caseworker: {
          ComparisonOperator: 'EQ',
          AttributeValueList: [ username ]
        }
      }
    });

    let profiles = [];
    for (let page of iter) {
      let { Items: i } = await page;
      profiles.push(...i);
    }

    return profiles;
  }

  //
  // Get a specific resident profile
  //
  async getProfileForCaseworker(username, id) {
    let { Item: profile } = await this.client.get({
      TableName : this.residentProfilesTable,
      Key: {
        caseworker: username,
        id
      }
    }).promise();
    return profile;
  }

  //
  // Create a resident profile
  //
  async createResidentProfile(username, hash) {
    let { Attributes: profile } = await this.client.update(Object.assign({
      TableName: this.residentProfilesTable,
      Key: {
        caseworker: username,
        id: uuid()
      },
      ReturnValues: 'ALL_NEW',
      ConditionExpression: 'attribute_not_exists(caseworker) AND attribute_not_exists(id)'
    }, hashToUpdateExpression(hash))).promise();
    return profile;
  }

  //
  // Update a resident profile
  //
  async updateResidentProfile(username, id, hash) {
    try {
      let { Attributes: profile } = await this.client.update(Object.assign({
        TableName: this.residentProfilesTable,
        Key: {
          caseworker: username,
          id
        },
        ReturnValues: 'ALL_NEW',
        ConditionExpression: 'attribute_exists(caseworker) AND attribute_exists(id)'
      }, hashToUpdateExpression(hash))).promise();
      return profile;
    } catch (e) {
      if (e.code === 'ConditionalCheckFailedException') {
        // This means it doesn't exist, so just return null
        return null;
      }
      throw e;
    }
  }

  //
  // Delete a resident profile. Returns true if deleted, false if not found.
  //
  async deleteResidentProfile(username, id) {
    try {
      await this.client.delete({
        TableName: this.residentProfilesTable,
        Key: {
          caseworker: username,
          id
        },
        ConditionExpression: 'attribute_exists(caseworker) AND attribute_exists(id)'
      }).promise();
      return true;
    } catch (e) {
      if (e.code === 'ConditionalCheckFailedException') {
        // This means it doesn't exist
        return false;
      }
      throw e;
    }
  }

  async _scanTable(tableName) {
    let iter = this._iterPages((attrs) => this.client.scan(attrs), {
      TableName: tableName
    });

    let items = [];
    for (let page of iter) {
      let { Items: i } = await page;
      items.push(...i);
    }

    return items;
  }

  async _getTableItemCount(tableName, attrs = {}) {
    let iter = this._iterPages((attrs) => this.client.scan(attrs), {
      TableName: tableName
    });

    let count = 0;
    for (let page of iter) {
      let { Count: c } = await page;
      count += c;
    }

    return count;
  }

  *_iterPages(fn, attrs) {
    let lastKey;

    let getPage = async () => {
      let res = await fn(Object.assign({
        ExclusiveStartKey: lastKey
      }, attrs)).promise();

      ({ LastEvaluatedKey: lastKey } = res);
      return res;
    };

    yield getPage();
    while (lastKey) {
      yield getPage();
    }
  }
}

function hashToUpdateExpression(hash) {
  let expressions = [];
  let names = {};
  let values = {};

  Object.keys(hash).forEach((name, i) => {
    expressions.push(`#key${i}=:value${i}`);
    names[`#key${i}`] = name;
    values[`:value${i}`] = hash[name];
  });

  if (expressions.length === 0) {
    return {};
  }

  return {
    UpdateExpression: `set ${expressions.join(', ')}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values
  };
}

module.exports = Dynamo;
