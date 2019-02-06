const attrsToHash = require('./attrs-to-hash');

module.exports = {
  attributes: [
    'creation_time',
    'email',
    'given_name',
    'family_name',
    'phone_number',
    'birthdate'
  ],
  transform({ Username: username, Attributes: attributes, UserCreateDate: creationTime }) {
    let hash = attrsToHash(attributes);
    if (hash.phone_number) {
      // Remove the leading +1
      hash.phone_number = hash.phone_number.slice(2); // eslint-disable-line camelcase
    }

    return Object.assign(hash, {
      id: username,
      creation_time: creationTime.toISOString() // eslint-disable-line camelcase
    });
  }
};
