const express = require('express');
const sls = require('serverless-http');
const bodyParser = require('body-parser');
const cors = require('cors');
const { check, validationResult } = require('express-validator/check');
const asyncHandler = require('express-async-handler');

const { cognitoUserPoolId } = require('./lib/environment');
const { useCognitoAuth, isAdmin } = require('./lib/cognito-auth');

// AWS
const AWS = require('aws-sdk');

let app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());
useCognitoAuth(app);

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
  let provider = new AWS.CognitoIdentityServiceProvider();
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
