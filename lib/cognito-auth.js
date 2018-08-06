const { region, cognitoUserPoolId } = require('./environment');
const CognitoExpress = require("cognito-express");
const bearerToken = require('express-bearer-token');

function useCognitoAuth(app) {
  let cognitoExpress = new CognitoExpress({
    region,
    cognitoUserPoolId,
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

function isUserInGroup(res, groupName) {
  let { user: { 'cognito:groups': groups = [] } = {} } = res.locals;
  return groups.includes(groupName);
}

function isAdmin(res) {
  return isUserInGroup(res, 'admins');
}

function isGuest(res) {
  return isUserInGroup(res, 'guests');
}

function isHost(res) {
  return isUserInGroup(res, 'hosts');
}

module.exports = {
  useCognitoAuth,
  isUserInGroup,
  isAdmin,
  isGuest,
  isHost
};
