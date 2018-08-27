const AWS = require('aws-sdk');

class Dynamo {
  constructor({ region, dynamoEndpoint, residentProfilesTable, hostProfilesTable }) {
    this.client = new AWS.DynamoDB.DocumentClient({
      service: new AWS.DynamoDB({ region, endpoint: dynamoEndpoint })
    });
    this.residentProfilesTable = residentProfilesTable;
    this.hostProfilesTable = hostProfilesTable;
  }

  async getResidentCount() {
    return await this._getTableItemCount(this.residentProfilesTable);
  }

  async getHostProfiles() {
    return await this._scanTable(this.hostProfilesTable);
  }

  async getResidentProfiles() {
    return await this._scanTable(this.residentProfilesTable);
  }

  async getProfileForHost(username) {
    let { Items: [ profile ]  } = await this.client.query({
      TableName : this.hostProfilesTable,
      KeyConditions: {
        User: {
          ComparisonOperator: 'EQ',
          AttributeValueList: [ username ]
        }
      }
    }).promise();
    return profile;
  }

  async getProfilesForCaseworker(username) {
    let iter = this._iterPages((attrs) => this.client.query(attrs), {
      TableName : this.residentProfilesTable,
      KeyConditions: {
        Caseworker: {
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

module.exports = Dynamo;
