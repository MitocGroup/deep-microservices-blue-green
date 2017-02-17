/**
 * Created by CCristi on 2/16/17.
 */

'use strict';

module.exports = class RecordType {
  static get CREATE() {
    return 'INSERT';
  }

  static get UPDATE() {
    return 'MODIFY';
  }

  static get DELETE() {
    return 'REMOVE';
  }

  static fromRawType(rawType) {
    return rawType.toUpperCase();
  }

  static isCreate(recordOrValue) {
    return RecordType._recordsType(recordOrValue) === RecordType.CREATE;
  }

  static isUpdate(recordOrValue) {
    return RecordType._recordsType(recordOrValue) === RecordType.UPDATE;
  }

  static isDelete(recordOrValue) {
    return RecordType._recordsType(recordOrValue) === RecordType.DELETE;
  }

  static _recordsType(recordOrValue) {
    return typeof recordOrValue === 'string' ? recordOrValue : recordOrValue.type;
  }
};
