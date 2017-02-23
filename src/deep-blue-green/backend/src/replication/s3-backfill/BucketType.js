/**
 * Created by CCristi on 2/23/17.
 */

'use strict';

module.exports = class BucketType {
  /**
   * @param {String} bucketName
   * @returns {Boolean}
   */
  static isPublic(bucketName) {
    return this._buildRegexp(BucketType.TYPE_PUBLIC).test(bucketName);
  }

  /**
   * @param {String} bucketName
   * @returns {Boolean}
   */
  static isPrivate(bucketName) {
    return this._buildRegexp(BucketType.TYPE_PRIVATE).test(bucketName);
  }

  /**
   * @param {String} typeName
   * @returns {RegExp}
   * @private
   */
  static _buildRegexp(typeName) {
    return new RegExp(`^\\s*deep\\.\\w+\\.${typeName}\\.\\w{8}\\s*$`)
  }

  /**
   * @returns {String}
   */
  static get TYPE_PUBLIC() {
    return 'public';
  }

  /**
   * @returns {String}
   */
  static get TYPE_PRIVATE() {
    return 'private';
  }
};

