#!/usr/bin/env node

const getStackOutputs = require('./get-stack-outputs');

const [ , , stageName ] = process.argv;

// Get the outputs
let {
  UserPoolId,
  HostProfilesTableName,
  ResidentProfilesTableName
} = getStackOutputs(stageName);

// Push them into the environment (including our hard-coded region, which we
// should probably figure out how to export in serverless.yml sometime)
Object.assign(process.env, {
  REGION: 'us-west-2',
  USER_POOL: UserPoolId,
  HOST_PROFILES_TABLE: HostProfilesTableName,
  RESIDENT_PROFILES_TABLE: ResidentProfilesTableName
});

// Now import and run buildApp(). It reads the environment at import time, so
// we have to wait to import until after we've set up the environment.
const buildApp = require('../src/build-app');

let app = buildApp();
app.listen(3100);
