const { region, cognitoUserPoolId } = require('./environment');
const CognitoExpress = require("cognito-express");
const bearerToken = require('express-bearer-token');

module.exports = {
  useCognitoAuth(app) {
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
  },

  isAdmin(res) {
    return res.locals.user && res.locals.user['custom:type'] === 'admin';
  }
};
