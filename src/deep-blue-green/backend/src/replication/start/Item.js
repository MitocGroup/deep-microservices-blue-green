
/**
 * Created by CCristi on 2/16/17.
 */

'use strict';

const Marshaler = require('./Marshaler');

module.exports = class Item {
  /**
   * @param {Object} rawData
   */
  constructor(rawData) {
    this._rawData = rawData;
    this._data = Marshaler.unmarshalItem(rawData);
  }

  /**
   * @returns {Array}
   */
  get fields() {
    return Object.keys(this._rawData);
  }

  /**
   * @returns {String}
   */
  get Id() {
    return this._data.Id;
  }

  /**
   * @returns {Object}
   */
  get data() {
    return this._data;
  }
};
