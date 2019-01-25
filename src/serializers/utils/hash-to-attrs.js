//
// Converts hash to AWS-style attributes.
//
// { first_name: 'Jeff', last_name: 'Bezos' }
//
// would turn into
//
// [
//   { Name: 'first_name', Value: 'Jeff' },
//   { Name: 'last_name', Value: 'Bezos' }
// ]
//
function hashToAttrs(hash) {
  return Object.keys(hash).map((key) => {
    return {
      Name: key,
      Value: hash[key]
    };
  });
}

module.exports = hashToAttrs;
