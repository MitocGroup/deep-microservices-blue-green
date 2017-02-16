/* eslint no-use-before-define:0 */
/* eslint max-len:0 */

'use strict';

let aws = require('aws-sdk');
let crypto = require('crypto');

exports.handler = (event, context, callback) => {
  let records = Record.fromEvent(event);
  // table replication map is stored in lambda environment variables
  // p.s. lambda env variables are restricted to short alphanumerical expressions.
  // JSON.stringify-ed expressions don't work
  let tableReplicationMap = process.env;

  if (records.length === 0) {
    return callback(null, {});
  }

  let recordsMap = records.reduce((map, currentRecord) => {
    map[currentRecord.table] = map[currentRecord.table] || [];
    map[currentRecord.table].push(currentRecord);

    return map;
  }, {});

  let replicatePromises = Object.keys(recordsMap).map(table => {
    let records = recordsMap[table];
    let replicaTable = ReplicaTable.create(tableReplicationMap[table]);

    console.log(`"${table}" ---> "${tableReplicationMap[table]}"`);

    return replicaTable.replicate(records);
  });

  Promise.all(replicatePromises).then(() => {
    console.log(`${records.length} records have been successfully replicated.`);

    callback(null, {});
  }).catch(error => {
    console.error(`Error while replicating records: ${error}`);

    callback(error, null);
  });
};

class RecordType {
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
}

class Record {
  constructor(data) {
    this._data = data;

    if (this._data.eventSource !== 'aws:dynamodb') {
      throw new Error(
        `Trying to initialize DynamoDB stream Record from an invalid event source ${this._data.eventSource}`
      );
    }
  }

  get replicationHash() {
    let hashMainPart = `${this.creationDate.toISOString()}/${this.primaryKey}`;
    let mainHash = crypto.createHash('md5').update(hashMainPart).digest('hex');

    return `${mainHash}-${this.id}`;
  }

  get primaryKey() {
    return this._data.dynamodb.Keys.Id.S;
  }

  get creationDate() {
    return new Date(this._data.dynamodb.ApproximateCreationDateTime * 1000);
  }

  get data() {
    return this._data.dynamodb.NewImage;
  }

  get sequence() {
    return this._data.dynamodb.SequenceNumber;
  }

  get size() {
    return this._data.dynamodb.SizeBytes;
  }

  get id() {
    return this._data.eventID;
  }

  get table() {
    return this.source.table;
  }

  get type() {
    return RecordType.fromRawType(this._data.eventName);
  }

  get source() {
    let parts = this.sourceArn.match(/^arn:aws:dynamodb:([^:]*):([^:]*):table\/([^\/]+)/i);

    return {
      region: parts[1] || this._data.awsRegion,
      account: parts[2],
      table: parts[3]
    };
  }

  get sourceArn() {
    return this._data.eventSourceARN;
  }

  static fromEvent(event) {
    return (event.Records || []).map(recordData => new Record(recordData));
  }

  get rawData() {
    return this._data;
  }

  toString() {
    return JSON.stringify({
      primaryKey: this.primaryKey,
      creationDate: this.creationDate,
      data: this.data,
      sequence: this.sequence,
      size: this.size,
      id: this.id,
      type: this.type,
      replicationHash: this.replicationHash,
    }, null, 2);
  }

  toJSON() {
    return JSON.stringify(this.data);
  }
}

class ReplicaTableConfig {
  constructor(tableName, region, config) {
    this._name = tableName;
    this._region = region || null;
    this._config = config || {};
  }

  get name() {
    return this._name;
  }

  get region() {
    return this._region;
  }

  set region(region) {
    this._region = region;
  }

  get rawConfig() {
    return this._config;
  }
}

class ReplicaTable {
  constructor(replicaConfig) {
    this._config = replicaConfig;
  }

  static getInstanceFor(tableName) {
    if (!ReplicaTable.__INSTANES__.hasOwnProperty(tableName)) {
      ReplicaTable.__INSTANES__[tableName] = ReplicaTable.create(tableName);
    }

    return ReplicaTable.__INSTANES__[tableName];
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
}

ReplicaTable.__INSTANES__ = {};

class Replicate {
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
}

class ReplicatePutDelete extends Replicate {
  replicate(records) {
    let promises = [];

    promises.push(Promise.all(
      this._chunksVector(this._getCreatePayload(records))
        .map(chunk => this._execBatchWrite(chunk))
    ));

    promises.push(Promise.all(
      this._chunksVector(this._getDeletePayload(records))
        .map(chunk => this._execBatchWrite(chunk))
    ));

    return Promise.all(promises);
  }

  _chunksVector(source, groupsize) {
    groupsize = groupsize || ReplicatePutDelete.MAX_WRITE_ITEMS;

    if (source.length <= groupsize) {
      return [source];
    }

    let sets = [];
    let chunks = source.length / groupsize;

    for (let i = 0, j = 0; i < chunks; i++, j += groupsize) {
      sets[i] = source.slice(j, j + groupsize);
    }

    return sets;
  }

  _execBatchWrite(items, _timeout) {
    _timeout = _timeout || 0;

    return new Promise((resolve, reject) => {
      if (items.length <= 0) {
        return resolve();
      }

      let tableName = this._replicaTable.config.name;
      let dynamodb = this._replicaTable.dynamodb;
      let payload = {
        RequestItems: {},
        ReturnConsumedCapacity: 'NONE',
        ReturnItemCollectionMetrics: 'NONE',
      };

      payload.RequestItems[tableName] = items;

      setTimeout(() => {
        dynamodb.batchWriteItem(payload, (error, data) => {
          if (error) {
            if (!this._isDynamodbErrorToSkip(error)) {
              return this._execBatchWrite(
                items,
                this._calculateBackoffTimeout(_timeout)
              ).then(resolve).catch(reject);
            }

            return reject(error);
          }

          let unprocessedItems = (data.UnprocessedItems || {})[tableName];

          if (!unprocessedItems || unprocessedItems.length <= 0) {
            return resolve();
          }

          this._execBatchWrite(
            unprocessedItems,
            this._calculateBackoffTimeout(_timeout)
          ).then(resolve).catch(reject);
        });
      }, _timeout);
    });
  }

  _getDeletePayload(records) {
    let uniqueKeysVector = []; // avoid duplicates

    return records
      .filter(record => {
        let primaryKey = record.primaryKey;

        if (!RecordType.isDelete(record) ||
          uniqueKeysVector.indexOf(primaryKey) !== -1) {

          return false;
        }

        uniqueKeysVector.push(primaryKey);

        return true;
      })
      .map(record => {
        return {
          DeleteRequest: {
            Key: {
              Id: {
                S: record.primaryKey,
              },
            },
          },
        };
      });
  }

  _getCreatePayload(records) {
    let uniqueKeysVector = []; // avoid duplicates

    return records
      .filter(record => {
        let primaryKey = record.primaryKey;

        if (!RecordType.isCreate(record) ||
          record.data.hasOwnProperty('DeepReplicationHash') ||
          uniqueKeysVector.indexOf(primaryKey) !== -1) {

          return false;
        }

        uniqueKeysVector.push(primaryKey);

        return true;
      })
      .map(record => {
        let itemPayload = record.data;
        itemPayload.DeepReplicationHash = { // to avoid infinite sync on creating an item
          S: record.replicationHash,
        };

        return {
          PutRequest: {
            Item: itemPayload,
          },
        };
      });
  }

  static get MAX_WRITE_ITEMS() {
    return 25;
  }
}

class ReplicateUpdate extends Replicate {
  replicate(records) {
    return new Promise((resolve, reject) => {
      let promises = this._getItemsPayload(records).map(itemPayload => this._execUpdate(itemPayload));

      if (promises.length <= 0) {
        return resolve();
      }

      Promise.all(promises).then(resolve).catch(reject);
    });
  }

  _execUpdate(itemPayload, _timeout) {
    _timeout = _timeout || 0;

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        this._replicaTable.dynamodb.updateItem(itemPayload, error => {
          if (error) {
            if (!this._isDynamodbErrorToSkip(error)) {
              return this._execUpdate(
                itemPayload,
                this._calculateBackoffTimeout(_timeout)
              ).then(resolve).catch(reject);
            }

            return reject(error);
          }

          resolve();
        });
      }, _timeout);
    });
  }

  _getItemsPayload(records) {
    let tableName = this._replicaTable.config.name;

    return records
      .filter(record => RecordType.isUpdate(record))
      .map(record => {
        let expressionNames = {};
        let recordData = record.data;

        let updateExpression = 'SET DeepReplicationHash = :rHash';
        let expressionAttributes = {
          ':rHash': {
            S: record.replicationHash,
          },
        };

        for (let attributeName in recordData) {
          if (!recordData.hasOwnProperty(attributeName) || attributeName === 'Id' || attributeName === 'DeepReplicationHash') {
            continue;
          }

          expressionNames[`#${attributeName}`] = attributeName;
          updateExpression += `, #${attributeName} = :${attributeName}`;
          expressionAttributes[`:${attributeName}`] = recordData[attributeName];
        }

        return {
          ReturnConsumedCapacity: 'NONE',
          ReturnItemCollectionMetrics: 'NONE',
          ReturnValues: 'NONE',
          TableName: tableName,
          UpdateExpression: updateExpression,
          ConditionExpression: 'attribute_not_exists(DeepReplicationHash) OR DeepReplicationHash <> :rHash',
          ExpressionAttributeValues: expressionAttributes,
          ExpressionAttributeNames: expressionNames,
          Key: {
            Id: {
              S: record.primaryKey,
            },
          },
        };
      });
  }
}
