/**
 * Created by CCristi on 2/23/17.
 */

'use strict';

module.exports = class SimpleFilter {
  /**
   * @param {Entry[]} entries
   * @returns {*}
   */
  filter(entries) {
    return entries.filter(this._filterSingle.bind(this));
  }

  /**
   * @param {Entry} entry
   * @returns {Boolean}
   * @private
   */
  _filterSingle(entry) {
    return true;
  }
};
