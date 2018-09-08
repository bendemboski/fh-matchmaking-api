const BaseSerializer = require('./base');
const { attributes, transform } = require('./utils/user');
const HostProfileSerializer = require('./host-profile');

class HostSerializer extends BaseSerializer {
  constructor() {
    super('host', {
      serializerOpts: {
        attributes: [ ...attributes, 'profile' ],
        profile: {
          ref: HostProfileSerializer.id,
          id: HostProfileSerializer.id,
          attributes: HostProfileSerializer.attributes
        },
        typeForAttribute(attribute) {
          return {
            profile: HostProfileSerializer.type
          }[attribute];
        },
        transform({ user, profile }) {
          user = transform(user);
          if (profile) {
            user.profile = HostProfileSerializer.transform(profile);
          }
          return user;
        }
      },
      deserializerOpts: { keyForAttribute: 'underscore_case' }
    });
  }
}

module.exports = HostSerializer;
