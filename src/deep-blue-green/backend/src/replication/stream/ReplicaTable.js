/**
 * Created by CCristi on 2/16/17.
 */

'use strict';

const ReplicaTableConfig = require('./ReplicaTableConfig');
const RecordType = require('./RecordType');
const ReplicatePutDelete = require('./ReplicatePutDelete');
const ReplicateUpdate = require('./ReplicateUpdate');
const aws = require('aws-sdk');

module.exports = class ReplicaTable {
  constructor(replicaConfig) {
    this._config = replicaConfig;
  }

  static create(tableName, region, config) {
    return new ReplicaTable(new ReplicaTableConfig(tableName, region, config));
  }

  changeTable(tableName) {
    this._config._table = tableName;
    return this;
  }

  get dynamodb() {
    let config = {};

    if (this._config.region) {
      config.region = this._config.region;
    }

    return new aws.DynamoDB(config);
  }

  replicate(records) {
    return new Promise((resolve, reject) => {
      let promises = [];

      let updateRecords = [];
      let nonUpdateRecords = records.filter(record => {
        if (RecordType.isUpdate(record)) {
          updateRecords.push(record);

          return false;
        }

        return true;
      });

      promises.push(new ReplicatePutDelete(this).replicate(nonUpdateRecords));
      promises.push(new ReplicateUpdate(this).replicate(updateRecords));

      Promise.all(promises).then(resolve).catch(reject);
    });
  }

  get config() {
    return this._config;
  }
};
