const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const asyncHandler = require('express-async-handler');

const aws = require('./aws');
const buildProfileRoutes = require('./routes/profile');
const buildUserRoutes = require('./routes/user');

function buildApp() {
  let app = express();
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json({
    type: [ 'application/json', 'application/vnd.api+json' ]
  }));
  app.use(cors());
  aws.cognito.setupExpress(app);

  buildProfileRoutes(app);
  buildUserRoutes(app);

  //
  // (admin) get user/profile counts
  //
  app.get('/userStats', asyncHandler(async (req, res) => {
    if (!aws.cognito.isAdmin(res)) {
      return res.status(403).send();
    }

    let hosts = await aws.cognito.listUsers('hosts');
    let residents = await aws.dynamo.getResidentProfiles();

    return res.status(200).json({
      hosts: hosts.length,
      residents: residents.length
    });
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

  return app;
}

module.exports = buildApp;
