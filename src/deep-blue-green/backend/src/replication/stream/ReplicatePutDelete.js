/**
 * Created by CCristi on 2/16/17.
 */

'use strict';

const Replicate = require('./Replicate');
const RecordType = require('./RecordType');
const Marshaler = require('./Marshaler');

module.exports = class ReplicatePutDelete extends Replicate {
  /**
   * @param {Record[]} records
   * @returns {Promise}
   */
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

  /**
   * @param {Object} source
   * @param {Number} groupsize
   * @returns {*}
   * @private
   */
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

  /**
   * @param {Object} items
   * @param {Number} _timeout
   * @returns {Promise}
   * @private
   */
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

  /**
   * @param {Record[]} records
   * @returns {Object}
   * @private
   */
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
            Key: Marshaler.marshalItem({
              Id: record.primaryKey
            }),
          },
        };
      });
  }

  /**
   * @param {Record[]} records
   * @returns {Object}
   * @private
   */
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
        itemPayload.DeepReplicationHash = Marshaler.marshalItem(record.replicationHash); // to avoid infinite sync on creating an item

        return {
          PutRequest: {
            Item: itemPayload,
          },
        };
      });
  }

  /**
   * @returns {Number}
   */
  static get MAX_WRITE_ITEMS() {
    return 25;
  }
};
