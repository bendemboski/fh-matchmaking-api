//
// Converts AWS-style attributes to a hash.
//
// [
//   { Name: 'firstName', Value: 'Jeff' },
//   { Name: 'lastName', Value: 'Bezos' }
// ]
//
// would turn into
//
// { firstName: 'Jeff', lastNameL 'Bezos' }
//
function attrsToHash(attrs) {
  let hash = {};
  attrs.forEach(({ Name, Value }) => hash[Name] = Value);
  return hash;
}

module.exports = attrsToHash;
