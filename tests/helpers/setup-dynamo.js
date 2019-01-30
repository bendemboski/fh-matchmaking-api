const DynamoDbLocal = require('dynamodb-local');
const AWS = require('aws-sdk');
const yaml = require('js-yaml');
const path = require('path');
const { readFileSync } = require('fs');

let dynamoRunning;

module.exports = function setupDynamo() {
  let endpoint = process.env.DYNAMO_ENDPOINT;
  let dynamodb = new AWS.DynamoDB({ region: 'us-east-1', endpoint });

  before(async function() {
    if (!dynamoRunning) {
      this.timeout(60 * 1000);
      await DynamoDbLocal.launch(9191);
      dynamoRunning = true;
    }
  });

  beforeEach(async function() {
    this.timeout(10 * 1000);

    let {
      resources: {
        Resources: {
          HostProfilesTable: { Properties: hostTable },
          ResidentProfilesTable: { Properties: residentTable }
        }
      }
    } = yaml.safeLoad(readFileSync(path.resolve(__dirname, '../../serverless.yml'), 'utf8'));
    hostTable.TableName = 'host-profiles';
    residentTable.TableName = 'resident-profiles';

    // provisioned throughput is computed, so we need to set it directly
    const throughput = { ReadCapacityUnits: 1, WriteCapacityUnits: 1 };
    hostTable.ProvisionedThroughput = throughput;
    residentTable.ProvisionedThroughput = throughput;
    residentTable.GlobalSecondaryIndexes[0].ProvisionedThroughput = throughput;

    await dynamodb.createTable(hostTable).promise();
    await dynamodb.createTable(residentTable).promise();
  });

  afterEach(async function() {
    await dynamodb.deleteTable({ TableName: 'host-profiles' }).promise();
    await dynamodb.deleteTable({ TableName: 'resident-profiles' }).promise();
  });

  return dynamodb;
};
