const express = require('express');
const sls = require('serverless-http');
const bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator/check');
const asyncHandler = require('express-async-handler');
//const CognitoExpress = require("cognito-express");

// AWS
//const region = process.env.REGION;
const cognitoUserPoolId = process.env.USER_POOL;
//const cognitoClientId = process.env.USER_POOL_CLIENT;
const AWS = require('aws-sdk');
/*
const {
  CognitoUserPool,
  CognitoUserAttribute,
  CognitoUser
} = require('amazon-cognito-identity-js');
*/

/*
let cognitoExpress = new CognitoExpress({
  region,
  cognitoUserPoolId,
  tokenUse: "access",
  tokenExpiration: 3600000
});
*/

let app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

/*
app.use(function(req, res, next) {
  let accessToken = req.headers.accesstoken;

  if (!accessToken) {
    return res.status(401);
  }

  cognitoExpress.validate(accessToken, function(err, response) {
    if (err) {
      return res.status(401).send(err);
    }

    res.locals.user = response;
    next();
  });
});
*/

/*
let userPool = new CognitoUserPool({
  UserPoolId: cognitoUserPoolId,
  ClientId : cognitoClientId
});
*/

app.post('/createUser', [
  check('type').isIn([ 'host', 'guest', 'admin' ]),
  check('email').isEmail(),
  check('givenName').exists(),
  check('familyName').exists()
], asyncHandler(async (req, res) => {
  let errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  let { type, email, givenName, familyName } = req.body;
  let params = {
    UserPoolId: cognitoUserPoolId,
    Username: email,
    UserAttributes: [
      {
        Name: 'given_name',
        Value: givenName
      },
      {
        Name: 'family_name',
        Value: familyName
      },
      {
        Name: 'custom:type',
        Value: type
      }
    ],
    DesiredDeliveryMediums: [ 'EMAIL' ]
  };
  let provider = new AWS.CognitoIdentityServiceProvider();
  let user = await provider.adminCreateUser(params).promise();
  res.status(201).json(user);
}));

app.get('/', async (req, res, next) => {
  res.status(200).send('Hello World!');
});

module.exports.server = sls(app);
