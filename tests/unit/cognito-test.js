const { expect } = require('chai');
const Cognito = require('../../lib/cognito');
const env = require('../../lib/environment');
const sinon = require('sinon');

describe('cognito', function() {
  let cognito;

  beforeEach(function() {
    cognito = new Cognito(env);
  });

  function userReq(group) {
    return {
      locals: {
        user: {
          'cognito:groups': [ group ]
        }
      }
    };
  }

  it('isAdmin', function() {
    expect(cognito.isAdmin(userReq('admins'))).to.be.true;
    expect(cognito.isAdmin(userReq('hosts'))).to.be.false;
    expect(cognito.isAdmin(userReq('caseworkers'))).to.be.false;
  });

  it('isHost', function() {
    expect(cognito.isHost(userReq('admins'))).to.be.false;
    expect(cognito.isHost(userReq('hosts'))).to.be.true;
    expect(cognito.isHost(userReq('caseworkers'))).to.be.false;
  });

  it('isCaseworker', function() {
    expect(cognito.isCaseworker(userReq('admins'))).to.be.false;
    expect(cognito.isCaseworker(userReq('hosts'))).to.be.false;
    expect(cognito.isCaseworker(userReq('caseworkers'))).to.be.true;
  });

  describe('createUser', function() {
    let createUserPromiseStub;
    let addUserToGroupPromiseStub;

    beforeEach(function() {
      createUserPromiseStub = sinon.stub().resolves({ User: { Username: 'fakeuser' } });
      addUserToGroupPromiseStub = sinon.stub();
      sinon.stub(cognito.provider, 'adminCreateUser').returns({ promise: createUserPromiseStub });
      sinon.stub(cognito.provider, 'adminAddUserToGroup').returns({ promise: addUserToGroupPromiseStub });
    });

    it('works', async function() {
      await expect(cognito.createUser({
        type: 'admin',
        email: 'user@domain.com',
        givenName: 'Person',
        familyName: 'McHuman'
      })).to.eventually.deep.equal({ Username: 'fakeuser' });

      expect(cognito.provider.adminCreateUser).to.have.been.calledWith({
        UserPoolId: process.env.USER_POOL,
        Username: 'user@domain.com',
        UserAttributes: [
          {
            Name: 'email',
            Value: 'user@domain.com'
          },
          {
            Name: 'given_name',
            Value: 'Person'
          },
          {
            Name: 'family_name',
            Value: 'McHuman'
          },
          {
            Name: 'email_verified',
            Value: 'true'
          }
        ],
        DesiredDeliveryMediums: [ 'EMAIL' ]
      });
      expect(createUserPromiseStub).to.have.been.called;

      expect(cognito.provider.adminAddUserToGroup).to.have.been.calledWith({
        GroupName: 'admins',
        UserPoolId: process.env.USER_POOL,
        Username: 'fakeuser'
      });
    });

    it('works for host', async function() {
      await expect(cognito.createUser({
        type: 'host',
        email: 'user@domain.com',
        givenName: 'Person',
        familyName: 'McHuman'
      })).to.eventually.deep.equal({ Username: 'fakeuser' });

      expect(cognito.provider.adminCreateUser).to.have.been.called;
      expect(createUserPromiseStub).to.have.been.called;

      expect(cognito.provider.adminAddUserToGroup).to.have.been.calledWith({
        GroupName: 'hosts',
        UserPoolId: process.env.USER_POOL,
        Username: 'fakeuser'
      });
    });

    it('works for caseworkers', async function() {
      await expect(cognito.createUser({
        type: 'caseworker',
        email: 'user@domain.com',
        givenName: 'Person',
        familyName: 'McHuman'
      })).to.eventually.deep.equal({ Username: 'fakeuser' });

      expect(cognito.provider.adminCreateUser).to.have.been.called;
      expect(createUserPromiseStub).to.have.been.called;

      expect(cognito.provider.adminAddUserToGroup).to.have.been.calledWith({
        GroupName: 'caseworkers',
        UserPoolId: process.env.USER_POOL,
        Username: 'fakeuser'
      });
    });
  });

  describe('listUsers', function() {
    let listUsersPromiseStub;

    beforeEach(function() {
      listUsersPromiseStub = sinon.stub();
      sinon.stub(cognito.provider, 'listUsersInGroup').returns({ promise: listUsersPromiseStub });
    });

    it('works with no users', async function() {
      listUsersPromiseStub.resolves({ Users: [] });
      await expect(cognito.listUsers('admins')).to.eventually.deep.equal([]);

      expect(cognito.provider.listUsersInGroup).to.have.been.calledOnce;
      expect(cognito.provider.listUsersInGroup).to.have.been.calledWith({
        GroupName: 'admins',
        UserPoolId: process.env.USER_POOL,
        Limit: 60,
        NextToken: undefined
      });

      expect(listUsersPromiseStub).to.have.been.called;
    });

    it('works with one page of users', async function() {
      listUsersPromiseStub.resolves({
        Users: [
          { Username: 'steve' },
          { Username: 'george' }
        ]
      });
      await expect(cognito.listUsers('admins')).to.eventually.deep.equal([
        { Username: 'steve' },
        { Username: 'george' }
      ]);

      expect(cognito.provider.listUsersInGroup).to.have.been.calledOnce;
      expect(cognito.provider.listUsersInGroup).to.have.been.calledWith({
        GroupName: 'admins',
        UserPoolId: process.env.USER_POOL,
        Limit: 60,
        NextToken: undefined
      });

      expect(listUsersPromiseStub).to.have.been.called;
    });

    it('works with multiple pages of users', async function() {
      let page1 = [];
      for (let i = 1; i <= 60; i++) {
        page1.push({ Username: `user${i}` });
      }
      let page2 = [];
      for (let i = 61; i <= 80; i++) {
        page2.push({ Username: `user${i}` });
      }

      listUsersPromiseStub.onCall(0).resolves({
        Users: page1,
        NextToken: 'next'
      });
      listUsersPromiseStub.onCall(1).resolves({
        Users: page2
      });
      await expect(cognito.listUsers('hosts')).to.eventually.deep.equal([
        ...page1,
        ...page2
      ]);

      expect(cognito.provider.listUsersInGroup).to.have.been.calledTwice;
      expect(cognito.provider.listUsersInGroup.firstCall).to.have.been.calledWith({
        GroupName: 'hosts',
        UserPoolId: process.env.USER_POOL,
        Limit: 60,
        NextToken: undefined
      });
      expect(cognito.provider.listUsersInGroup.secondCall).to.have.been.calledWith({
        GroupName: 'hosts',
        UserPoolId: process.env.USER_POOL,
        Limit: 60,
        NextToken: 'next'
      });

      expect(listUsersPromiseStub).to.have.been.calledTwice;
    });
  });

  describe('getUser', async function() {
    let getUserPromiseStub;

    beforeEach(function() {
      getUserPromiseStub = sinon.stub();
      sinon.stub(cognito.provider, 'adminGetUser').returns({ promise: getUserPromiseStub });
    });

    it('works', async function() {
      getUserPromiseStub.resolves({
        Username: 'steve',
        UserAttributes: [
          { Name: 'key', Value: 'value' }
        ]
      });
      await expect(cognito.getUser('steve')).to.eventually.deep.equal({
        Username: 'steve',
        Attributes: [
          { Name: 'key', Value: 'value' }
        ]
      });

      expect(cognito.provider.adminGetUser).to.have.been.calledOnce;
      expect(cognito.provider.adminGetUser).to.have.been.calledWith({
        UserPoolId: process.env.USER_POOL,
        Username: 'steve'
      });

      expect(getUserPromiseStub).to.have.been.called;
    });
  });
});
