const { expect } = require('chai');
const factory = require('../helpers/request-factory');
const setupCognito = require('../helpers/setup-cognito');
const authStub = require('../helpers/auth-stub');
const sinon = require('sinon');

describe('create user', function() {
  let provider = setupCognito();

  beforeEach(function() {
    authStub.stub(sinon, 'admins');
  });

  afterEach(function() {
    sinon.restore();
  });

  function sort(attrs) {
    return attrs.sort(({ Name: nameA }, { Name: nameB }) => nameA.localeCompare(nameB));
  }

  [ 'host', 'caseworker', 'admin' ].forEach((type) => {
    describe(type, function() {
      let endpoint = `/${type}s`;
      let postData;

      beforeEach(function() {
        provider.testCreationTime = new Date();

        postData = {
          data: {
            type,
            attributes: {
              email: 'user@domain.com',
              givenName: 'Person',
              familyName: 'McHuman'
            }
          }
        };
      });

      it('fails when not admin', async function() {
        authStub.setUserGroup('hosts');

        let res = await factory.post(endpoint, postData);
        expect(res).to.have.status(403);
      });

      it('fails with a missing/invalid email', async function() {
        delete postData.data.attributes.email;
        let res = await factory.post(endpoint, postData);
        expect(res).to.have.status(400);

        postData.data.attributes.email = 'invalid';
        res = await factory.post(endpoint, postData);
        expect(res).to.have.status(400);
      });

      it('fails with a missing givenName', async function() {
        delete postData.data.attributes.givenName;
        let res = await factory.post(endpoint, postData);
        expect(res).to.have.status(400);
      });

      it('fails with a missing familyName', async function() {
        delete postData.data.attributes.familyName;
        let res = await factory.post(endpoint, postData);
        expect(res).to.have.status(400);
      });

      it('works', async function() {
        let res = await factory.post(endpoint, postData);
        expect(res).to.have.status(201);

        let users = provider.testGetUsers();
        expect(users).to.have.lengthOf(1);

        let { attributes, group } = users[0];
        expect(group).to.equal(`${type}s`);
        expect(sort(attributes)).to.deep.equal(sort([
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
        ]));

        let { id } = res.body.data;
        expect(id).to.be.ok;
        delete res.body.data.relationships;
        delete res.body.data.attributes.residents;
        expect(res.body).to.deep.equal({
          data: {
            type: `${type}s`,
            id,
            attributes: {
              creationTime: provider.testCreationTime.toISOString(),
              email: 'user@domain.com',
              givenName: 'Person',
              familyName: 'McHuman'
            }
          }
        });
      });
    });
  });
});
