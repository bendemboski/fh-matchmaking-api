function deleteAttributes(attributes, names) {
  if (!Array.isArray(names)) {
    names = [ names ];
  }

  return attributes.filter(({ Name: name }) => !names.includes(name));
}

module.exports = deleteAttributes;
