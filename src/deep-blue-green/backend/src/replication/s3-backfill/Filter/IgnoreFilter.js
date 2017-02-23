/**
 * Created by CCristi on 2/23/17.
 */

'use strict';

const SimpleFilter = require('./SimpleFilter');
const BucketType = require('../BucketType');
const ignore = require('ignore');

const EOL_DELIMITER = 'EOL_DELIMITER';

module.exports = class IgnoreFilter extends SimpleFilter {
  /**
   * @param {String[]} ignoreGlobs
   */
  constructor(ignoreGlobs) {
    super();

    this._ignoreFilter = ignore().add(ignoreGlobs).createFilter();
  }

  /**
   * @param {Entry} entry
   * @returns {Boolean}
   * @private
   */
  _filterSingle(entry) {
    return this._ignoreFilter(entry.key);
  }

  /**
   * @param {String} bucket
   * @returns {IgnoreFilter}
   */
  static create(bucket) {
    let rawIgnoreGlobs = null;

    if (BucketType.isPrivate(bucket)) {
      rawIgnoreGlobs = process.env.privateIgnoreGlob;
    } else if (BucketType.isPublic(bucket)) {
      rawIgnoreGlobs = process.env.publicIgnoreGlob;
    }

    if (!rawIgnoreGlobs) {
      throw new Error(`Unknown bucket type "${bucket}"`);
    }

    return new IgnoreFilter(rawIgnoreGlobs.split(EOL_DELIMITER));
  }
};
