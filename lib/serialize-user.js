// Given a cognito user, serializes it to our API representation
// TODO: also supply profile record from DynamoDB
function serializeUser({ Username, UserCreateDate, Attributes }) {
  let attrs = {
    id: Username,
    joined: UserCreateDate
  };
  Attributes.forEach(({ Name, Value }) => {
    if (Name === 'given_name') {
      attrs.givenName = Value;
    } else if (Name === 'family_name') {
      attrs.familyName = Value;
    }
  });

  return attrs;
}

module.exports = serializeUser;
