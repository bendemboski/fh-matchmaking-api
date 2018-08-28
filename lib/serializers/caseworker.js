const BaseSerializer = require('./base');
const { attributes, transform } = require('./utils/user');
const ResidentProfileSerializer = require('./resident-profile');

class CaseworkerSerializer extends BaseSerializer {
  constructor() {
    super('caseworker', {
      attributes: [ ...attributes, 'residents' ],
      residents: {
        ref: ResidentProfileSerializer.id,
        id: ResidentProfileSerializer.id,
        attributes: ResidentProfileSerializer.attributes
      },
      typeForAttribute(attribute) {
        return {
          residents: ResidentProfileSerializer.type
        }[attribute];
      },
      transform({ user, residents = [] }) {
        user = transform(user);
        residents = residents.map(ResidentProfileSerializer.transform);
        return Object.assign(user, { residents });
      }
    });
  }
}

module.exports = CaseworkerSerializer;
