const BaseSerializer = require('./base');

class ResidentProfileSerializer extends BaseSerializer {
  constructor() {
    let { type, id, attributes, transform } = ResidentProfileSerializer;
    super(type, {
      serializerOpts: { id, attributes, transform },
      deserializerOpts: { keyForAttribute: 'camelCase' }
    });
  }

  async deserialize(data) {
    let hash = await super.deserialize(data);

    let { id, attributes } = ResidentProfileSerializer;
    delete hash[id];
    delete hash.caseworker;
    delete hash.creationTime;
    Object.keys(hash).forEach((key) => {
      if (!attributes.includes(key)) {
        delete hash[key];
      }
    });
    return hash;
  }

  static get type() {
    return 'resident-profiles';
  }

  static get id() {
    return 'id';
  }

  static get attributes() {
    return [
      'creationTime',
      'caseworker',
      'matchedHost',
      'profilePic',
      'firstName',
      'lastName',
      'email',
      'phoneNumber',
      'age',
      'gender',
      'occupation',
      'languages',
      'kidCount',
      'petCount',
      'petBreed',
      'freeTime',
      'favoriteFood',
      'funFact',
      'hostSubstances',
      'neighborhoods',
      'lightRail',
      'busses',
      'neighborhoodFeatures',
      'relationship',
      'question',
      'additionalNote'
    ];
  }

  static transform(profile) {
    profile.id = `${profile.caseworker}:${profile.id}`;
    return profile;
  }
}

module.exports = ResidentProfileSerializer;
