/**
 * Created by CCristi on 2/21/17.
 */

'use strict';

const S3Synchronizer = require('./S3Synchronizer');

module.exports = class S3DeleteSynchronizer extends S3Synchronizer {
  /**
   * @param {S3Record} s3Record
   * @returns {Promise}
   */
  syncRecord(s3Record) {
    return this.getDestMd5(s3Record).then(md5 => {
      if (md5) {
        console.log(`Removing "${s3Record.key}" from "${this._destinationBucket}"`);

        return this._s3.deleteObject({
          Bucket: this._destinationBucket,
          Key: s3Record.key,
        }).promise();
      }

      return {
        ETag: md5,
      };
    })
  }
};
