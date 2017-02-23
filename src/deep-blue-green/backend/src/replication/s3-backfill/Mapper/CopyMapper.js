/**
 * Created by CCristi on 2/23/17.
 */

'use strict';

const SimpleMapper = require('./SimpleMapper');

module.exports = class CopyMapper extends SimpleMapper {
  /**
   * @param {Object} s3
   * @param {String} sourceBucket
   * @param {String} destinationBucket
   */
  constructor(s3, sourceBucket, destinationBucket)  {
    super();

    this._s3 = s3;
    this._sourceBucket = sourceBucket;
    this._destinationBucket = destinationBucket;
  }

  /**
   * @private
   * @returns {Promise}
   */
  _mapSingle(entry) {
    console.log(`Copying "${this._sourceBucket}/${entry.key}" into "${this._destinationBucket}/${entry.key}"`);

    return this._s3.copyObject({
      Key: entry.key,
      Bucket: this._destinationBucket,
      CopySource: `${this._sourceBucket}/${entry.key}`,
    }).promise();
  }

  /**
   * @param {Object} s3
   * @param {String} sourceBucket
   * @returns {CopyMapper}
   */
  static create(s3, sourceBucket) {
    const destinationBucket = process.env[sourceBucket.replace(/\./g, '_')];

    if (!destinationBucket) {
      throw new Error(`Missing destination bucket for "${destinationBucket}".`);
    }

    return new CopyMapper(s3, sourceBucket, destinationBucket);
  }
};
