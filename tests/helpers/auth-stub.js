const { cognito } = require('../../lib/aws');

class AuthStub {
  stub(sandbox, userGroup, user = {}) {
    this.user = user;
    this.setUserGroup(userGroup);

    sandbox.stub(cognito, 'setupExpress').callsFake((app) => {
      app.use((req, res, next) => {
        res.locals.user = this.user;
        next();
      });
    });
  }

  setUserGroup(group) {
    this.user['cognito:groups'] = group;
  }
}

module.exports = new AuthStub();
