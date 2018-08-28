const { Deserializer } = require('jsonapi-serializer');
const { Serializer } = require('jsonapi-serializer');

class BaseSerializer {
  constructor(type, serializerOpts = {}) {
    serializerOpts = Object.assign({ keyForAttribute: 'camelCase' }, serializerOpts);
    this.serializer = new Serializer(type, serializerOpts);
    this.deserializer = new Deserializer({ keyForAttribute: 'underscore_case' });
  }

  serialize(data) {
    return this.serializer.serialize(data);
  }

  async deserialize(data) {
    return await this.deserializer.deserialize(data);
  }
}

module.exports = BaseSerializer;
