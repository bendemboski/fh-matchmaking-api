const express = require('express');
const sls = require('serverless-http');
const bodyParser = require('body-parser');
const cors = require('cors');
const { check, validationResult } = require('express-validator/check');
const asyncHandler = require('express-async-handler');

const { cognitoUserPoolId } = require('./lib/environment');
const { useCognitoAuth, isAdmin, isGuest } = require('./lib/cognito-auth');
const getFullList = require('./lib/get-full-list');
const serializeUser = require('./lib/serialize-user');

// AWS
const AWS = require('aws-sdk');
const provider = new AWS.CognitoIdentityServiceProvider();

let app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());
useCognitoAuth(app);

//
// (admin) Create new user
//
app.post('/createUser', [
  check('type').isIn([ 'host', 'guest', 'admin' ]),
  check('email').isEmail(),
  check('givenName').exists(),
  check('familyName').exists()
], asyncHandler(async (req, res) => {
  if (!isAdmin(res)) {
    return res.status(403).send();
  }

  let errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  let { type, email, givenName, familyName } = req.body;
  let { User: user } = await provider.adminCreateUser({
    UserPoolId: cognitoUserPoolId,
    Username: email,
    UserAttributes: [
      {
        Name: 'email',
        Value: email
      },
      {
        Name: 'given_name',
        Value: givenName
      },
      {
        Name: 'family_name',
        Value: familyName
      },
      {
        Name: 'email_verified',
        Value: 'true'
      }
    ],
    DesiredDeliveryMediums: [ 'EMAIL' ]
  }).promise();

  await provider.adminAddUserToGroup({
    GroupName: `${type}s`,
    UserPoolId: cognitoUserPoolId,
    Username: user.Username
  }).promise();

  res.status(201).json(user);
}));

//
// (admin) Get stats for a given user type:
//
// {
//   count: <number of users>
// }
//
app.get('/:group/stats', asyncHandler(async (req, res) => {
  if (!isAdmin(res)) {
    return res.status(403).send();
  }

  let { group } = req.params;
  if (![ 'admins', 'guests', 'hosts' ].includes(group)) {
    return res.status(404).send();
  }

  let { length: count } = await getFullList((attrs) => {
    return provider.listUsersInGroup(attrs).promise();
  }, {
    GroupName: group,
    UserPoolId: cognitoUserPoolId
  }, 'Users');

  return res.status(200).json({ count });
}));

//
// Get list of users for a given type
//
app.get('/:group/users', asyncHandler(async (req, res) => {
  let { group } = req.params;

  if (group === 'guests') {
    // Only admins can list guests
    if (!isAdmin(res)) {
      return res.status(403).send();
    }
  } else if (group === 'hosts') {
    // Admins and guests can list hosts
    if (!isAdmin(res) && !isGuest(res)) {
      return res.status(403).send();
    }
  } else {
    // Unknown group (listing admins is not supported)
    return res.status(404).send();
  }

  let users = await getFullList((attrs) => {
    return provider.listUsersInGroup(attrs).promise();
  }, {
    GroupName: group,
    UserPoolId: cognitoUserPoolId
  }, 'Users');

  // For now all we show is the name (until we pull profile info from Dynamo)
  return res.status(200).json({ users: users.map(serializeUser) });
}));

// Log errors
app.use(function(err, req, res, next) {
  console.error(err);

  let { requestId, statusCode, code, message } = err;
  if (requestId && statusCode && code && message) {
    // AWS SDK error
    res.status(statusCode).json({ code, message });
  } else {
    next(err);
  }
});

module.exports.server = sls(app);
