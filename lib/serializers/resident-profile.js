const BaseSerializer = require('./base');
const { Serializer } = require('jsonapi-serializer');

class ResidentProfileSerializer extends BaseSerializer {
  constructor() {
    let { type, id, attributes, transform } = ResidentProfileSerializer;
    super(new Serializer(type, { id, attributes, transform }));
  }

  static get type() {
    return 'resident-profiles';
  }

  static get id() {
    return 'Id';
  }

  static get attributes() {
    return [ 'Caseworker', 'Email', 'MatchedHost' ];
  }

  static transform(profile) {
    return profile;
  }
}

module.exports = ResidentProfileSerializer;
