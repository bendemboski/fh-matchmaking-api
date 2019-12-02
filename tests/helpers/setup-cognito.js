const aws = require('../../src/aws');

class FakeCognitoProvider {
  constructor() {
    this.reset();
    this.usernameIndex = 0;
  }

  reset() {
    this.users = {};
    this.groups = {
      admins: [],
      hosts: [],
      caseworkers: []
    };
  }

  adminCreateUser({ UserAttributes: attributes }) {
    let username = this._username();
    this.users[username] = { attributes, creationTime: this.testCreationTime || new Date() };
    return promise({ User: this.buildUser(username) });
  }

  adminUpdateUserAttributes({ Username: username, UserAttributes: attributes }) {
    let user = this.users[username];
    if (!user) {
      let e = new Error('User does not exist.');
      e.code = 'UserNotFoundException';
      e.statusCode = 400;
      return promiseError(e);
    }

    attributes.forEach((attr) => {
      let old = user.attributes.find(({ Name: name }) => name === attr.Name);
      if (old) {
        old.Value = attr.Value;
      } else {
        user.attributes.push(attr);
      }
    });

    return promise();
  }

  adminDeleteUserAttributes({ Username: username, UserAttributeNames: names }) {
    let user = this.users[username];
    if (!user) {
      let e = new Error('User does not exist.');
      e.code = 'UserNotFoundException';
      e.statusCode = 400;
      return promiseError(e);
    }

    names.forEach((name) => {
      let index = user.attributes.findIndex((attr) => attr.Name === name);
      if (index !== -1) {
        user.attributes.splice(index, 1);
      }
    });

    return promise();
  }

  adminAddUserToGroup({ Username: username, GroupName: group }) {
    this.groups[group].push(username);
    return promise();
  }

  listUsersInGroup({ GroupName: group }) {
    return promise({
      Users: this.groups[group].map((username) => this.buildUser(username))
    });
  }

  adminGetUser({ Username: username }) {
    if (!this.users[username]) {
      let e = new Error('User does not exist.');
      e.code = 'UserNotFoundException';
      e.statusCode = 400;
      return promiseError(e);
    }

    return promise(this.buildUser(username, 'UserAttributes'));
  }

  adminListGroupsForUser({ Username: username }) {
    return promise({
      Groups: [ { GroupName: this._group(username) } ]
    });
  }

  testAddUsers(usersByGroup) {
    Object.keys(usersByGroup).forEach((group) => {
      usersByGroup[group].forEach((attributes) => {
        let username = this._username();

        let creationTime = attributes.creation_time || this.testCreationTime || new Date();
        delete attributes.creation_time;

        this.users[username] = {
          attributes: Object.keys(attributes).map((name) => {
            return { Name: name, Value: attributes[name] };
          }),
          creationTime
        };
        this.groups[group].push(username);
      });
    });
  }

  testGetUsers() {
    return Object.keys(this.users).map((username) => {
      let { attributes, creationTime } = this.users[username];
      return {
        username,
        attributes,
        creationTime,
        group: this._group(username)
      };
    });
  }

  buildUser(username, attributesKey = 'Attributes') {
    if (!this.users[username]) {
      throw new Error(`User not found: ${username}`);
    }

    let { attributes, creationTime } = this.users[username];

    return {
      Username: username,
      [attributesKey]: attributes,
      UserCreateDate: creationTime
    };
  }

  _username() {
    return `fakeuser${this.usernameIndex++}`;
  }

  _group(username) {
    return Object.keys(this.groups).find((name) => this.groups[name].includes(username));
  }
}

function promise(response) {
  return { promise: () => Promise.resolve(response) };
}

function promiseError(e) {
  return { promise: () => Promise.reject(e) };
}

module.exports = function setupCognito() {
  let oldProvider;
  let provider = new FakeCognitoProvider();

  before(function() {
    oldProvider = aws.cognito.provider;
    aws.cognito.provider = provider;
  });

  after(function() {
    aws.cognito.provider = oldProvider;
  });

  afterEach(function() {
    provider.reset();
  });

  return provider;
};
