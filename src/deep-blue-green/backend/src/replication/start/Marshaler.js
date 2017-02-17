
/**
 * Created by CCristi on 2/16/17.
 */

'use strict';

module.exports = class Marshaler {
  /**
   * @param {Object|String|Number} i
   * @returns {String}
   */
  static S(i) {
    return i.toString();
  }

  /**
   * @param {Object} item
   * @returns {Object}
   */
  static unmarshalItem(item) {
    let data = {};

    for (let key in item) {
      if (!item.hasOwnProperty(key)) {
        continue;
      }

      for (let type in item[key]) {
        if (item[key].hasOwnProperty(type)) {
          data[key] = (Marshaler[type] || Marshaler.S)(item[key][type]);
        }
      }
    }

    return data;
  }

  /**
   * @param {String|Number|Object} item
   * @returns {{}}
   */
  static marshalItem(item) {
    let result = {};

    switch (typeof item) {
      case 'string':
      case 'number':
        result = {S: item.toString()};
        break;
      case 'object':
      default:
        for (let key in item) {
          if (!item.hasOwnProperty(key)) {
            continue;
          }

          result[key] = Marshaler.marshalItem(item[key]);
        }
        break;
    }

    return result;
  }
};
