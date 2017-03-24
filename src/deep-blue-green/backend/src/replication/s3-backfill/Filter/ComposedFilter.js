/**
 * Created by CCristi on 2/23/17.
 */

'use strict';

const SimpleFilter = require('./SimpleFilter');

module.exports = class ComposedFilter extends SimpleFilter {
  /**
   * @param {SimpleFilter[]} filters
   */
  constructor(filters) {
    super();

    this._filters = filters || [];
  }

  /**
   * @param {SimpleFilter} filter
   * @returns {ComposedFilter}
   */
  addFilter(filter) {
    this._filters.push(filter);
    return this;
  }

  /**
   * @param {Entry[]} entries
   * @returns {*}
   */
  filter(entries) {
    return this._filters.reduce((entries, filter) => {
      return filter.filter(entries);
    }, entries);
  }
};
