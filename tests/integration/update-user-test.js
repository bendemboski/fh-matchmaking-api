const chai = require('chai');
const { expect } = chai;
const setupCognito = require('../helpers/setup-cognito');
const authStub = require('../helpers/auth-stub');
const buildApp = require('../../lib/build-app');
const sinon = require('sinon');

describe('update user', function() {
  let provider = setupCognito();
  let adminId;
  let otherAdminId;
  let hostId;
  let otherHostId;
  let caseworkerId;
  let otherCaseworkerId;

  beforeEach(function() {
    provider.testAddUsers({
      admins: [
        { 'given_name': 'Buster', 'family_name': 'Bluth', email: 'heybrother@bluth.com' },
        { 'given_name': 'Barry', 'family_name': 'Zuckercorn', email: 'verygood@gmail.com' }
      ],
      hosts: [
        { 'given_name': 'Jay', 'family_name': 'Walter-Weatherman', email: 'lessonteacher@gmail.com' },
        { 'given_name': 'Lucille', 'family_name': 'Bluth', email: 'hospitalbar@bluth.com' }
      ],
      caseworkers: [
        { 'given_name': 'Ann', 'family_name': 'Veal', email: 'funnyorsomething@gmail.com' },
        { 'given_name': 'Gob', 'family_name': 'Bluth', email: 'illusions@bluth.com' }
      ]
    });
    ({
      groups: {
        admins: [ adminId, otherAdminId ],
        hosts: [ hostId, otherHostId ],
        caseworkers: [ caseworkerId, otherCaseworkerId ]
      }
    } = provider);
  });

  afterEach(function() {
    sinon.restore();
  });

  function sort(attrs) {
    return attrs.sort(({ Name: nameA }, { Name: nameB }) => nameA.localeCompare(nameB));
  }

  describe('general', function() {
    beforeEach(function() {
      authStub.stub(sinon, 'admins');
    });

    it('fails with invalid email', async function() {
      let res = await chai.request(buildApp()).patch(`/admins/${adminId}`).send({
        data: {
          type: 'admins',
          id: adminId,
          attributes: {
            email: 'notanemail',
            givenName: 'Tony',
            familyName: 'Hale',
            phoneNumber: '2068675309',
            birthdate: '03/18/1980'
          }
        }
      });
      expect(res).to.have.status(400);
    });

    it('fails with invalid phone number', async function() {
      let res = await chai.request(buildApp()).patch(`/admins/${adminId}`).send({
        data: {
          type: 'admins',
          id: adminId,
          attributes: {
            email: 'thale@gmail.com',
            givenName: 'Tony',
            familyName: 'Hale',
            phoneNumber: 'a',
            birthdate: '03/18/1980'
          }
        }
      });
      expect(res).to.have.status(400);
    });

    it('works with all attributes', async function() {
      let res = await chai.request(buildApp()).patch(`/admins/${adminId}`).send({
        data: {
          type: 'admins',
          id: adminId,
          attributes: {
            email: 'thale@gmail.com',
            givenName: 'Tony',
            familyName: 'Hale',
            phoneNumber: '2068675309',
            birthdate: '03/18/1980'
          }
        }
      });
      expect(res).to.have.status(204);

      expect(sort(provider.users[adminId])).to.deep.equal(sort([
        {
          Name: 'email',
          Value: 'thale@gmail.com'
        },
        {
          Name: 'given_name',
          Value: 'Tony'
        },
        {
          Name: 'family_name',
          Value: 'Hale'
        },
        {
          Name: 'phone_number',
          Value: '+12068675309'
        },
        {
          Name: 'birthdate',
          Value: '03/18/1980'
        }
      ]));
    });

    it('works with a subset of attributes', async function() {
      let res = await chai.request(buildApp()).patch(`/admins/${adminId}`).send({
        data: {
          type: 'admins',
          id: adminId,
          attributes: {
            givenName: 'Tony',
            familyName: 'Hale'
          }
        }
      });
      expect(res).to.have.status(204);

      expect(sort(provider.users[adminId])).to.deep.equal(sort([
        {
          Name: 'email',
          Value: 'heybrother@bluth.com'
        },
        {
          Name: 'given_name',
          Value: 'Tony'
        },
        {
          Name: 'family_name',
          Value: 'Hale'
        }
      ]));
    });
  });

  describe('admin', function() {
    beforeEach(function() {
      authStub.stub(sinon, 'admins', provider.buildUser(adminId));
    });

    it('can update self', async function() {
      let res = await chai.request(buildApp()).patch(`/admins/${adminId}`).send({
        data: {
          type: 'admins',
          id: adminId,
          attributes: {
            givenName: 'Tony',
            familyName: 'Hale'
          }
        }
      });
      expect(res).to.have.status(204);
    });

    it('can update other admin', async function() {
      let res = await chai.request(buildApp()).patch(`/admins/${otherAdminId}`).send({
        data: {
          type: 'admins',
          id: otherAdminId,
          attributes: {
            givenName: 'Henry',
            familyName: 'Winkler'
          }
        }
      });
      expect(res).to.have.status(204);
    });

    it('can update host', async function() {
      let res = await chai.request(buildApp()).patch(`/hosts/${hostId}`).send({
        data: {
          type: 'hosts',
          id: hostId,
          attributes: {
            givenName: 'Steve',
            familyName: 'Ryan'
          }
        }
      });
      expect(res).to.have.status(204);
    });

    it('can update caseworker', async function() {
      let res = await chai.request(buildApp()).patch(`/caseworkers/${caseworkerId}`).send({
        data: {
          type: 'caseworkers',
          id: caseworkerId,
          attributes: {
            givenName: 'Mae',
            familyName: 'Whitman'
          }
        }
      });
      expect(res).to.have.status(204);
    });
  });

  describe('host', function() {
    beforeEach(function() {
      authStub.stub(sinon, 'hosts', provider.buildUser(hostId));
    });

    it('can update self', async function() {
      let res = await chai.request(buildApp()).patch(`/hosts/${hostId}`).send({
        data: {
          type: 'hosts',
          id: hostId,
          attributes: {
            givenName: 'Steve',
            familyName: 'Ryan'
          }
        }
      });
      expect(res).to.have.status(204);
    });

    it('cannot update other host', async function() {
      let res = await chai.request(buildApp()).patch(`/hosts/${otherHostId}`).send({
        data: {
          type: 'hosts',
          id: otherHostId,
          attributes: {
            givenName: 'Jessica',
            familyName: 'Walter'
          }
        }
      });
      expect(res).to.have.status(403);
    });

    it('cannot update admin', async function() {
      let res = await chai.request(buildApp()).patch(`/admins/${adminId}`).send({
        data: {
          type: 'admins',
          id: adminId,
          attributes: {
            givenName: 'Tony',
            familyName: 'Hale'
          }
        }
      });
      expect(res).to.have.status(403);
    });

    it('cannot update caseworker', async function() {
      let res = await chai.request(buildApp()).patch(`/caseworkers/${caseworkerId}`).send({
        data: {
          type: 'caseworkers',
          id: caseworkerId,
          attributes: {
            givenName: 'Mae',
            familyName: 'Whitman'
          }
        }
      });
      expect(res).to.have.status(403);
    });
  });

  describe('caseworker', function() {
    beforeEach(function() {
      authStub.stub(sinon, 'caseworkers', provider.buildUser(caseworkerId));
    });

    it('can update self', async function() {
      let res = await chai.request(buildApp()).patch(`/caseworkers/${caseworkerId}`).send({
        data: {
          type: 'caseworkers',
          id: caseworkerId,
          attributes: {
            givenName: 'Mae',
            familyName: 'Whitman'
          }
        }
      });
      expect(res).to.have.status(204);
    });

    it('cannot update other caseworker', async function() {
      let res = await chai.request(buildApp()).patch(`/caseworkers/${otherCaseworkerId}`).send({
        data: {
          type: 'caseworkers',
          id: otherCaseworkerId,
          attributes: {
            givenName: 'Will',
            familyName: 'Arnett'
          }
        }
      });
      expect(res).to.have.status(403);
    });

    it('cannot update host', async function() {
      let res = await chai.request(buildApp()).patch(`/hosts/${hostId}`).send({
        data: {
          type: 'hosts',
          id: hostId,
          attributes: {
            givenName: 'Steve',
            familyName: 'Ryan'
          }
        }
      });
      expect(res).to.have.status(403);
    });

    it('cannot update admin', async function() {
      let res = await chai.request(buildApp()).patch(`/admins/${adminId}`).send({
        data: {
          type: 'admins',
          id: adminId,
          attributes: {
            givenName: 'Tony',
            familyName: 'Hale'
          }
        }
      });
      expect(res).to.have.status(403);
    });
  });
});
