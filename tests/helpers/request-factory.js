const chai = require('chai');
const buildApp = require('../../lib/build-app');

const jsonApiContentType = 'application/vnd.api+json';

class RequestFactory {
  async get(url) {
    return await chai.request(buildApp())
      .get(url)
      .set('Accept', jsonApiContentType);
  }

  async post(url, data) {
    return await chai.request(buildApp())
      .post(url)
      .set('Accept', jsonApiContentType)
      .set('Content-Type', jsonApiContentType)
      .send(data);
  }

  async patch(url, data) {
    return await chai.request(buildApp())
      .patch(url)
      .set('Accept', jsonApiContentType)
      .set('Content-Type', jsonApiContentType)
      .send(data);
  }

  async delete(url, data) {
    return await chai.request(buildApp())
      .delete(url)
      .send(data);
  }
}

module.exports = new RequestFactory();
