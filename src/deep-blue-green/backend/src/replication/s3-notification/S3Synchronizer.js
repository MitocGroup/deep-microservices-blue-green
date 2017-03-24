/**
 * Created by CCristi on 2/21/17.
 */

'use strict';

const BucketType = require('./BucketType');
const ignore = require('ignore');

const EOL_DELIMITER = '__EOL__';

module.exports = class S3Synchronizer {
  /**
   * @param {Object} s3Client
   * @param {String} sourceBucket
   * @returns {S3Synchronizer}
   */
  static create(s3Client, sourceBucket) {
    let envVars = process.env;
    let destBucket = envVars[sourceBucket.replace(/\./g, '_')];
    let ignoreGlob = null;

    if (!destBucket) {
      throw new Error(`Missing destination bucket for "${sourceBucket}" source.`);
    }

    if (BucketType.isPublic(destBucket)) {
      ignoreGlob = process.env.publicIgnoreGlob;
    } else if (BucketType.isPrivate(destBucket)) {
      ignoreGlob = process.env.privateIgnoreGlob;
    }

    if (!ignoreGlob) {
      throw new Error(`Missing ignore glob for "${destBucket}" bucket.`)
    }

    return new this(s3Client, destBucket, ignoreGlob.split(EOL_DELIMITER));
  }

  /**
   * @param {Object} s3
   * @param {String} destinationBucket
   * @param {String[]} ignoreGlobs
   */
  constructor(s3, destinationBucket, ignoreGlobs) {
    this._s3 = s3;
    this._destinationBucket = destinationBucket;
    this._ignoreFilter = ignore().add(ignoreGlobs).createFilter();
  }

  /**
   * @param {Record[]} records
   * @returns {Promise}
   */
  syncRecords(records) {
    return Promise.all(
      records
        .filter(record => this._ignoreFilter(record.key))
        .map(r => this.syncRecord(r))
    );
  }

  /**
   * @param {S3Record} s3Record
   * @returns {Promise}
   */
  syncRecord(s3Record) {
    return Promise.all([
      this.getSourceMd5(s3Record),
      this.getDestMd5(s3Record),
    ]).then(result => {
      const sourceMd5 = result[0];
      const destMd5 = result[1];

      if (sourceMd5 !== destMd5) {
        console.log(`Copying "${s3Record.source}" into "${this._destinationBucket}"`);

        return this._s3.copyObject({
          Bucket: this._destinationBucket,
          Key: s3Record.key,
          CopySource: s3Record.source,
        }).promise();
      }

      return {
        ETag: destMd5,
      };
    });
  }

  /**
   * @param {S3Record} record
   * @returns {Promise}
   */
  getDestMd5(record) {
    return this._getS3ETag(this._destinationBucket, record.key);
  }

  /**
   * @param {S3Record} s3Record
   * @returns {Promise.<String>}
   */
  getSourceMd5(s3Record) {
    return s3Record.eTag
      ? Promise.resolve(s3Record.eTag)
      : this._getS3ETag(s3Record.bucket, s3Record.key);
  }

  /**
   * @param {String} bucket
   * @param {String} key
   * @returns {Promise}
   * @private
   */
  _getS3ETag(bucket, key) {
    let payload = {
      Bucket: bucket,
      Key: key,
    };

    return this._s3.headObject(payload)
      .promise()
      .then(headObj => headObj.ETag.replace(/^"|"$/g, ''))
      .catch(e => {
        if (e.code === 'NotFound') {
          return Promise.resolve(null);
        }

        throw e;
      });
  }
};
