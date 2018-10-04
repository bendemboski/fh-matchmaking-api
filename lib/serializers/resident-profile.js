const BaseSerializer = require('./base');

class ResidentProfileSerializer extends BaseSerializer {
  constructor() {
    let { type, id, attributes, transform } = ResidentProfileSerializer;
    super(type, {
      serializerOpts: { id, attributes, transform },
      deserializerOpts: { keyForAttribute: 'CamelCase' }
    });
  }

  async deserialize(data) {
    let hash = await super.deserialize(data);

    let { id, attributes } = ResidentProfileSerializer;
    delete hash[id];
    delete hash.Caseworker;
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
    return 'Id';
  }

  static get attributes() {
    return [
      'Caseworker',
      'MatchedHost',
      'FirstName',
      'LastName',
      'Email',
      'PhoneNumber',
      'Birthdate',
      'Gender',
      'Occupation',
      'Languages',
      'KidCount',
      'PetCount',
      'PetBreed',
      'FreeTime',
      'FavoriteFood',
      'MovieGenre',
      'FunFact',
      'MySubstances',
      'HostSubstances',
      'Neighborhoods',
      'Link',
      'Busses',
      'neighborhoodFeatures',
      'Relationship',
      'Interaction',
      'Question'
    ];
  }

  static transform(profile) {
    return profile;
  }
}

module.exports = ResidentProfileSerializer;
