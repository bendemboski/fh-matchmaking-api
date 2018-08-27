class Environment {
  get region() {
    return process.env.REGION;
  }

  get cognitoUserPoolId() {
    return process.env.USER_POOL;
  }

  // Only used for testing
  get dynamoEndpoint() {
    return process.env.DYNAMO_ENDPOINT;
  }

  get hostProfilesTable() {
    return process.env.HOST_PROFILES_TABLE;
  }

  get residentProfilesTable() {
    return process.env.RESIDENT_PROFILES_TABLE;
  }
}

module.exports = new Environment();
