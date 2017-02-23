/**
 * Created by CCristi on 2/23/17.
 */

'use strict';

const SimpleFilter = require('./SimpleFilter');

module.exports = class MaxDateFilter extends SimpleFilter {
  /**
   * @param {String|Date|Number} date
   */
  constructor(date) {
    super();

    this._maxModifiedDate = date instanceof Date ? date : new Date(date);
  }

  /**
   * @param {Entry} entry
   * @returns {Boolean}
   * @private
   */
  _filterSingle(entry) {
    return entry.lastModified < this._maxModifiedDate;
  }
};
