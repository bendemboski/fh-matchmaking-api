const BaseSerializer = require('./base');
const { attributes, transform } = require('./utils/user');

class AdminSerializer extends BaseSerializer {
  constructor() {
    super('admin', {
      serializerOpts: {
        attributes,
        transform({ user }) {
          return transform(user);
        }
      },
      deserializerOpts: { keyForAttribute: 'underscore_case' }
    });
  }
}

module.exports = AdminSerializer;
