//
// Converts AWS-style attributes to a hash.
//
// [
//   { Name: 'first_name', Value: 'Jeff' },
//   { Name: 'last_name', Value: 'Bezos' }
// ]
//
// would turn into
//
// { first_name: 'Jeff', last_name: 'Bezos' }
//
function attrsToHash(attrs) {
  let hash = {};
  attrs.forEach(({ Name, Value }) => hash[Name] = Value);
  return hash;
}

module.exports = attrsToHash;
