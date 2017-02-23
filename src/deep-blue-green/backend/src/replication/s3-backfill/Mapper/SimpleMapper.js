/**
 * Created by CCristi on 2/23/17.
 */

'use strict';

module.exports = class SimpleMapper {
  /**
   * @param {Entry[]} entries
   * @returns {*}
   */
  map(entries) {
    return this._map(entries);
  }

  /**
   * @param {Entry[]} entries
   * @returns {*}
   * @private
   */
  _map(entries) {
    if (entries.length === 0) {
      return Promise.resolve();
    }

    let cloneEntries = [].concat(entries);
    let entry = cloneEntries.shift();

    return this._mapSingle(entry).then(() => {
      return this._map(cloneEntries);
    });
  }

  /**
   * @param {Entry} entry
   * @returns {Promise}
   * @private
   */
  _mapSingle(entry) {
    return Promise.resolve(entry);
  }
};
