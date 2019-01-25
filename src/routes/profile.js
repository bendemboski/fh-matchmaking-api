const asyncHandler = require('express-async-handler');

const aws = require('../aws');
const HostProfileSerializer = require('../serializers/host-profile');
const ResidentProfileSerializer = require('../serializers/resident-profile');

function buildProfileRoutes(app) {
  const hostProfileSerializer = new HostProfileSerializer();
  const residentProfileSerializer = new ResidentProfileSerializer();

  //
  // Host profile
  //
  app.post('/host-profiles', asyncHandler(async (req, res) => {
    if (!aws.cognito.isHost(res)) {
      return res.status(403).send();
    }

    let username = aws.cognito.getAuthUsername(res);
    let hash = await hostProfileSerializer.deserialize(req.body);
    let profile = await aws.dynamo.createHostProfile(username, hash);

    if (profile) {
      return res.status(201).json(hostProfileSerializer.serialize(profile));
    } else {
      return res.status(409).send();
    }
  }));

  app.patch('/host-profiles/:id', asyncHandler(async (req, res) => {
    let { params: { id } } = req;

    if (!aws.cognito.isHost(res) || id !== aws.cognito.getAuthUsername(res)) {
      return res.status(403).send();
    }

    let username = aws.cognito.getAuthUsername(res);
    let hash = await hostProfileSerializer.deserialize(req.body);
    let profile = await aws.dynamo.updateHostProfile(username, hash);

    if (profile) {
      return res.status(200).json(hostProfileSerializer.serialize(profile));
    } else {
      return res.status(404).send();
    }
  }));

  app.delete('/host-profiles/:id', asyncHandler(async (req, res) => {
    let { params: { id } } = req;

    if (!aws.cognito.isHost(res) || id !== aws.cognito.getAuthUsername(res)) {
      return res.status(403).send();
    }

    let wasFound = await aws.dynamo.deleteHostProfile(id);
    if (wasFound) {
      return res.status(204).send();
    } else {
      return res.status(404).send();
    }
  }));

  //
  // Resident profile
  //
  app.post('/resident-profiles', asyncHandler(async (req, res) => {
    if (!aws.cognito.isCaseworker(res)) {
      return res.status(403).send();
    }

    let username = aws.cognito.getAuthUsername(res);
    let hash = await residentProfileSerializer.deserialize(req.body);
    let profile = await aws.dynamo.createResidentProfile(username, hash);
    return res.status(201).json(residentProfileSerializer.serialize(profile));
  }));

  app.patch('/resident-profiles/:id', asyncHandler(async (req, res) => {
    if (!aws.cognito.isCaseworker(res)) {
      return res.status(403).send();
    }

    let username = aws.cognito.getAuthUsername(res);
    let { params: { id } } = req;
    let hash = await residentProfileSerializer.deserialize(req.body);
    let profile = await aws.dynamo.updateResidentProfile(username, id, hash);

    if (profile) {
      return res.status(200).json(residentProfileSerializer.serialize(profile));
    } else {
      return res.status(404).send();
    }
  }));

  app.delete('/resident-profiles/:id', asyncHandler(async (req, res) => {
    if (!aws.cognito.isCaseworker(res)) {
      return res.status(403).send();
    }

    let username = aws.cognito.getAuthUsername(res);
    let { params: { id } } = req;

    let wasFound = await aws.dynamo.deleteResidentProfile(username, id);
    if (wasFound) {
      return res.status(204).send();
    } else {
      return res.status(404).send();
    }
  }));
}

module.exports = buildProfileRoutes;
