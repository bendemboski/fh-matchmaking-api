const AWS = require('aws-sdk');
const uuid = require('uuid/v4');

class S3 {
  constructor({ region, mediaBucket }) {
    this.client = new AWS.S3({ region });
    this.bucket = mediaBucket;
  }

  async createUploadUrl({ contentType }) {
    let key = uuid();
    let uploadUrl = await new Promise((resolve, reject) => {
      let params = {
        Bucket: this.bucket,
        Key: key,
        ACL: 'public-read',
        ContentType: contentType
      };
      this.client.getSignedUrl('putObject', params, function(err, url) {
        if (err) {
          reject(err);
        } else {
          resolve(url);
        }
      });
    });

    return {
      uploadUrl,
      downloadUrl: `https://${this.bucket}.s3.amazonaws.com/${key}`
    };
  }

}

module.exports = S3;
