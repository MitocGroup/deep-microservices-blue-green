/**
 * Created by CCristi on 2/23/17.
 */

'use strict';

module.exports = class Entry {
  /**
   * @param {Object} rawData
   */
  constructor(rawData) {
    this._data = rawData;
  }

  /**
   * @returns {Object}
   */
  get data() {
    return this._data;
  }

  /**
   * @returns {Object}
   */
  get key() {
    return decodeURIComponent(this._data.Key).replace(/\+/g, ' ');
  }

  /**
   * @returns {*}
   */
  get lastModified() {
    return this._data.LastModified;
  }
};
