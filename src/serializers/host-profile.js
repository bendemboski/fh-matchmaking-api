const BaseSerializer = require('./base');

class HostProfileSerializer extends BaseSerializer {
  constructor() {
    let { type, id, attributes, transform } = HostProfileSerializer;
    super(type, {
      serializerOpts: { id, attributes, transform },
      deserializerOpts: { keyForAttribute: 'camelCase' }
    });
  }

  async deserialize(data) {
    let hash = await super.deserialize(data);

    let { id, attributes } = HostProfileSerializer;
    delete hash[id];
    Object.keys(hash).forEach((key) => {
      if (!attributes.includes(key)) {
        delete hash[key];
      }
    });
    return hash;
  }

  static get type() {
    return 'host-profiles';
  }

  static get id() {
    return 'host';
  }

  static get attributes() {
    return [
      'host',
      'visible',
      'profilePic',
      'profileName',
      'greeting',
      'age',
      'gender',
      'occupation',
      'languages',
      'adultCount',
      'kidCount',
      'petCount',
      'petBreed',
      'freeTime',
      'favoriteFood',
      'mySubstances',
      'neighborhood',
      'address',
      'lightRailStation',
      'busses',
      'neighborhoodFeatures',
      'neighborhoodDescription',
      'backyardActivities',
      'backyardDescription',
      'photo1',
      'photo2',
      'photo3',
      'photo4',
      'relationship',
      'question',
      'additionalNote'
    ];
  }

  static transform(profile) {
    profile.Visible = Boolean(profile.Visible);
    return profile;
  }
}

module.exports = HostProfileSerializer;
