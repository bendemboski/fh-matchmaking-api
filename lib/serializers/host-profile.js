const BaseSerializer = require('./base');

class HostProfileSerializer extends BaseSerializer {
  constructor() {
    let { type, id, attributes, transform } = HostProfileSerializer;
    super(type, {
      serializerOpts: { id, attributes, transform },
      deserializerOpts: { keyForAttribute: 'CamelCase' }
    });
  }

  async deserialize(data) {
    let hash = await super.deserialize(data);

    let { id, attributes } = HostProfileSerializer;
    delete hash[id];
    Object.keys(hash).forEach((key) => {
      if (!attributes.includes(key)) {
        delete hash[key];
      }
    });
    return hash;
  }

  static get type() {
    return 'host-profiles';
  }

  static get id() {
    return 'Host';
  }

  static get attributes() {
    return [ 'Host', 'Visible', 'Greeting' ];
  }

  static transform(profile) {
    profile.Visible = Boolean(profile.Visible);
    return profile;
  }
}

module.exports = HostProfileSerializer;
