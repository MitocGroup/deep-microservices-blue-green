/**
 * Created by CCristi on 2/21/17.
 */

'use strict';

module.exports = class S3Record {
  /**
   * @returns {Object}
   */
  constructor(rawData) {
    this._data = rawData;
  }

  /**
   * @returns {String}
   */
  get eventName() {
    return this._data.eventName;
  }

  /**
   * @returns {Object}
   */
  get data() {
    return this._data;
  }

  /**
   * @returns {String}
   */
  get key() {
    return decodeURIComponent(this._data.s3.object.key).replace(/\+/g, ' ');
  }

  /**
   * @returns {String}
   */
  get eTag() {
    return this._data.s3.object.eTag;
  }

  /**
   * @returns {String}
   */
  get bucket() {
    return this._data.s3.bucket.name;
  }

  /**
   * @returns {String}
   */
  get source() {
    return `${this.bucket}/${this.key}`;
  }

  /**
   * @param {S3Record} record
   * @returns {Boolean}
   */
  static isDelete(record) {
    return record.eventName === S3Record.RECORD_DELETE;
  }

  /**
   * @param {S3Record} record
   * @returns {Boolean}
   */
  static isCreate(record) {
    return [
        S3Record.RECORD_COPY,
        S3Record.RECORD_POST,
        S3Record.RECORD_PUT,
      ].indexOf(record.eventName) !== -1;
  }

  /**
   * @returns {String}
   */
  static get RECORD_COPY() {
    return 'ObjectCreated:Copy';
  }

  /**
   * @returns {String}
   */
  static get RECORD_PUT() {
    return 'ObjectCreated:Put';
  }

  /**
   * @returns {String}
   */
  static get RECORD_POST() {
    return 'ObjectCreated:Post';
  }

  /**
   * @returns {String}
   */
  static get RECORD_DELETE() {
    return 'ObjectRemoved:Delete';
  }
};
