const asyncHandler = require('express-async-handler');
const validate = require('validate.js');

const aws = require('../aws');
const deleteAttributes = require('../delete-attributes');
const AdminSerializer = require('../serializers/admin');
const HostSerializer = require('../serializers/host');
const CaseworkerSerializer = require('../serializers/caseworker');
const { attributes: userAttributes } = require('../serializers/utils/user');
const hashToAttrs = require('../serializers/utils/hash-to-attrs');
const serializeValidationErrors = require('../serializers/validation-errors');

function buildUserRoutes(app) {
  const adminSerializer = new AdminSerializer();
  const hostSerializer = new HostSerializer();
  const caseworkerSerializer = new CaseworkerSerializer();

  //
  // Create user
  //
  async function createUser(type, serializer, req, res) {
    if (!aws.cognito.isAdmin(res)) {
      return res.status(403).send();
    }

    let hash = await serializer.deserialize(req.body);
    let errors = validate(hash, {
      'email': {
        presence: true,
        email: true
      },
      'given_name': {
        presence: true
      },
      'family_name': {
        presence: true
      }
    });
    if (errors) {
      return res.status(400).json(serializeValidationErrors(errors));
    }

    let { email, given_name: givenName, family_name: familyName } = hash;
    let user = await aws.cognito.createUser({ type, email, givenName, familyName });

    res.status(201).json(serializer.serialize({ user }));
  }

  app.post('/hosts', asyncHandler(createUser.bind(null, 'host', hostSerializer)));
  app.post('/caseworkers', asyncHandler(createUser.bind(null, 'caseworker', caseworkerSerializer)));
  app.post('/admins', asyncHandler(createUser.bind(null, 'admin', adminSerializer)));

  //
  // List users
  //
  app.get('/hosts', asyncHandler(async (req, res) => {
    // admins and caseworkers can list hosts
    if (!aws.cognito.isAdmin(res) && !aws.cognito.isCaseworker(res)) {
      return res.status(403).send();
    }

    let users = await aws.cognito.listUsers('hosts');
    let profiles = await aws.dynamo.getHostProfiles();

    if (!aws.cognito.isAdmin(res)) {
      // Only admins can see email addresses
      users.forEach((user) => {
        user.Attributes = deleteAttributes(user.Attributes, [ 'email' ]);
      });
    }

    let data = users.map((user) => {
      return {
        user,
        profile: profiles.find(({ host }) => host === user.Username)
      };
    });

    res.status(200).json(hostSerializer.serialize(data));
  }));

  app.get('/caseworkers', asyncHandler(async (req, res) => {
    // only admins can list caseworkers
    if (!aws.cognito.isAdmin(res)) {
      return res.status(403).send();
    }

    let users = await aws.cognito.listUsers('caseworkers');
    let residents = await aws.dynamo.getResidentProfiles();
    let data = users.map((user) => {
      return {
        user,
        residents: residents.filter(({ caseworker }) => caseworker === user.Username)
      };
    });

    res.status(200).json(caseworkerSerializer.serialize(data));
  }));

  app.get('/admins', asyncHandler(async (req, res) => {
    // only admins can list admins
    if (!aws.cognito.isAdmin(res)) {
      return res.status(403).send();
    }

    let users = await aws.cognito.listUsers('admins');
    let data = users.map((user) => {
      return { user };
    });

    res.status(200).json(adminSerializer.serialize(data));
  }));

  //
  // Get user
  //
  app.get('/hosts/:id', asyncHandler(async (req, res) => {
    let { params: { id } } = req;

    // admins and caseworkers can see hosts, but hosts can only see their selves
    if (aws.cognito.isHost(res)) {
      if (id !== aws.cognito.getAuthUsername(res)) {
        return res.status(403).send();
      }
    }

    let user = await aws.cognito.getUser(id);
    if (!user) {
      return res.status(404).send();
    }

    let group = await aws.cognito.getUserGroup(id);
    if (group !== 'hosts') {
      return res.status(404).send();
    }

    // caseworkers can't see hosts' email addresses
    if (aws.cognito.isCaseworker(res)) {
      user.Attributes = deleteAttributes(user.Attributes, [ 'email' ]);
    }

    let profile = await aws.dynamo.getProfileForHost(user.Username);

    return res.status(200).json(hostSerializer.serialize({ user, profile }));
  }));

  app.get('/caseworkers/:id', asyncHandler(async (req, res) => {
    let { params: { id } } = req;

    // Admins can see caseworkers and caseworkers can see their selves
    if (aws.cognito.isCaseworker(res)) {
      // caseworkers can see their self
      if (id !== aws.cognito.getAuthUsername(res)) {
        return res.status(403).send();
      }
    } else if (!aws.cognito.isAdmin(res)) {
      return res.status(403).send();
    }

    let user = await aws.cognito.getUser(id);
    if (!user) {
      return res.status(404).send();
    }

    let group = await aws.cognito.getUserGroup(id);
    if (group !== 'caseworkers') {
      return res.status(404).send();
    }

    let profiles = await aws.dynamo.getProfilesForCaseworker(user.Username);

    return res.status(200).json(caseworkerSerializer.serialize({ user, residents: profiles }));
  }));

  app.get('/admins/:id', asyncHandler(async (req, res) => {
    // only admins can get admins
    if (!aws.cognito.isAdmin(res)) {
      return res.status(403).send();
    }

    let { params: { id } } = req;
    let user = await aws.cognito.getUser(id);
    if (!user) {
      return res.status(404).send();
    }

    let group = await aws.cognito.getUserGroup(id);
    if (group !== 'admins') {
      return res.status(404).send();
    }

    return res.status(200).json(adminSerializer.serialize({ user }));
  }));

  //
  // Update user
  //
  async function updateUser(serializer, req, res) {
    let { params: { id } } = req;

    // admins can update hosts and hosts can update their selves
    if (!aws.cognito.isAdmin(res) && id !== aws.cognito.getAuthUsername(res)) {
      return res.status(403).send();
    }

    let hash = await serializer.deserialize(req.body);
    let errors = validate(hash, {
      'email': {
        email: true
      },
      'phone_number': {
        format: /^\d{10}$/
      }
    });
    if (errors) {
      return res.status(400).json(serializeValidationErrors(errors));
    }

    if (hash.phone_number) {
      hash.phone_number = `+1${hash.phone_number}`; // eslint-disable-line camelcase
    }

    Object.keys(hash).forEach((key) => {
      if (!userAttributes.includes(key)) {
        delete hash[key];
      }
    });

    let attrs = hashToAttrs(hash);
    if (await aws.cognito.updateUser(id, attrs)) {
      return res.status(204).send();
    } else {
      return res.status(404).send();
    }
  }

  app.patch('/hosts/:id', asyncHandler(updateUser.bind(null, hostSerializer)));
  app.patch('/caseworkers/:id', asyncHandler(updateUser.bind(null, caseworkerSerializer)));
  app.patch('/admins/:id', asyncHandler(updateUser.bind(null, adminSerializer)));
}

module.exports = buildUserRoutes;
