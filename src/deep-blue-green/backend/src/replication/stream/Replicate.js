/**
 * Created by CCristi on 2/16/17.
 */

'use strict';

module.exports = class Replicate {
  constructor(replicaTable) {
    this._replicaTable = replicaTable;
  }

  get replicaTable() {
    return this._replicaTable;
  }

  replicate(records) {
    return new Promise((resolve, reject) => reject(new Error(`${this.constructor.name}.replicate() not implemented.`)));
  }

  _calculateBackoffTimeout(timeout) {
    return timeout ? (timeout * 2 + Math.round(Math.random() * 1000)) : 1000;
  }

  _isDynamodbErrorToSkip(error) {
    return Replicate.ERRORS_TO_SKIP.indexOf(error.code) !== -1;
  }

  static get ERRORS_TO_SKIP() {
    return [
      'MultipleValidationErrors',
      'ValidationException',
      'ResourceNotFoundException',
      'ItemCollectionSizeLimitExceededException',
      'ConditionalCheckFailedException',
    ];
  }
};
