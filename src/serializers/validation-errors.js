const { Error: JsonApiError } = require('jsonapi-serializer');

function serializeValidationErrors(errors) {
  return new JsonApiError(Object.values(errors).map((message) => {
    return { title: message };
  }));
}

module.exports = serializeValidationErrors;
