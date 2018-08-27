const AWS = require('aws-sdk');
const CognitoExpress = require('cognito-express');
const bearerToken = require('express-bearer-token');

class Cognito {
  constructor({ region, cognitoUserPoolId }) {
    this.region = region;
    this.userPoolId = cognitoUserPoolId;
    this.provider = new AWS.CognitoIdentityServiceProvider();
  }

  setupExpress(app) {
    let cognitoExpress = new CognitoExpress({
      region: this.region,
      cognitoUserPoolId: this.userPoolId,
      tokenUse: 'id',
      tokenExpiration: 3600000
    });

    app.use(bearerToken());
    app.use(function(req, res, next) {
      let accessToken = req.token;

      if (!accessToken) {
        return res.status(401).send('Access token missing');
      }

      cognitoExpress.validate(accessToken, function(err, response) {
        if (err) {
          return res.status(401).send(err);
        }

        res.locals.user = response;
        next();
      });
    });
  }

  isUserInGroup(res, groupName) {
    let { 'cognito:groups': groups = [] } = this.getAuthUser(res);
    return groups.includes(groupName);
  }

  isAdmin(res) {
    return this.isUserInGroup(res, 'admins');
  }

  isCaseworker(res) {
    return this.isUserInGroup(res, 'caseworkers');
  }

  isHost(res) {
    return this.isUserInGroup(res, 'hosts');
  }

  getAuthUser(res) {
    return res.locals.user;
  }

  async createUser({ type, email, givenName, familyName }) {
    let { User: user } = await this.provider.adminCreateUser({
      UserPoolId: this.userPoolId,
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

    await this.provider.adminAddUserToGroup({
      GroupName: `${type}s`,
      UserPoolId: this.userPoolId,
      Username: user.Username
    }).promise();

    return user;
  }

  async listUsers(group) {
    const maxLimit = 60; // max AWS allows

    let users = [];
    let nextToken;

    let getPage = async () => {
      let page;

      ({
        Users: page,
        NextToken: nextToken
      } = await this.provider.listUsersInGroup({
        GroupName: group,
        UserPoolId: this.userPoolId,
        Limit: maxLimit,
        NextToken: nextToken
      }).promise());

      users.push(...page);
    };

    await getPage();
    while (nextToken) {
      await getPage();
    }

    return users;
  }

  async getUser(username) {
    return await this.provider.adminGetUser({
      UserPoolId: this.userPoolId,
      Username: username
    }).promise();
  }
}

module.exports = Cognito;
