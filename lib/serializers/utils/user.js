const attrsToHash = require('./attrs-to-hash');

module.exports = {
  serializer: {
    attributes: [ 'email', 'given_name', 'family_name' ],
    transform({ Username: username, Attributes: attributes }) {
      return Object.assign(attrsToHash(attributes), { id: username });
    }
  }
};
