const attrsToHash = require('./attrs-to-hash');

module.exports = {
  attributes: [
    'email',
    'given_name',
    'family_name',
    'phone_number',
    'birthdate'
  ],
  transform({ Username: username, Attributes: attributes }) {
    let hash = attrsToHash(attributes);
    if (hash.phone_number) {
      // Remove the leading +1
      hash.phone_number = hash.phone_number.slice(2); // eslint-disable-line camelcase
    }

    return Object.assign(hash, { id: username });
  }
};
