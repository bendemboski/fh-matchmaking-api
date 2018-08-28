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
    if (hash.phoneNumber) {
      // Remove the leading +1
      hash.phoneNumber = hash.phoneNumber.slice(2);
    }

    return Object.assign(attrsToHash(attributes), { id: username });
  }
};
