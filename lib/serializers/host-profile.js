const BaseSerializer = require('./base');
const { Serializer } = require('jsonapi-serializer');

class HostProfileSerializer extends BaseSerializer {
  constructor() {
    let { type, id, attributes, transform } = HostProfileSerializer;
    super(new Serializer(type, { id, attributes, transform }));
  }

  static get type() {
    return 'host-profiles';
  }

  static get id() {
    return 'User';
  }

  static get attributes() {
    return [ 'User', 'Visible', 'Greeting' ];
  }

  static transform(profile) {
    profile.Visible = Boolean(profile.Visible);
    return profile;
  }
}

module.exports = HostProfileSerializer;
