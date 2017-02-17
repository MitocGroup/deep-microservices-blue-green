/**
 * Created by CCristi on 2/16/17.
 */

'use strict';

const RecordType = require('./RecordType');
const Marshaler = require('./Marshaler');
const Replicate = require('./Replicate');

module.exports = class ReplicateUpdate extends Replicate {
  /**
   * @param {Record[]} records
   * @returns {Promise}
   */
  replicate(records) {
    return new Promise((resolve, reject) => {
      let promises = this._getItemsPayload(records).map(itemPayload => this._execUpdate(itemPayload));

      if (promises.length <= 0) {
        return resolve();
      }

      Promise.all(promises).then(resolve).catch(reject);
    });
  }

  /**
   * @param {Object} itemPayload
   * @param {Number} _timeout
   * @returns {Promise}
   * @private
   */
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

  /**
   * @param {Record[]} records
   * @returns {Object}
   * @private
   */
  _getItemsPayload(records) {
    let tableName = this._replicaTable.config.name;

    return records
      .filter(record => RecordType.isUpdate(record))
      .map(record => {
        let expressionNames = {};
        let recordData = record.data;

        let updateExpression = 'SET DeepReplicationHash = :rHash';
        let expressionAttributes = Marshaler.marshalItem({
          ':rHash': record.replicationHash,
        });

        for (let attributeName in recordData) {
          if (!recordData.hasOwnProperty(attributeName)
            || attributeName === 'Id'
            || attributeName === 'DeepReplicationHash') {
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
          Key: Marshaler.marshalItem({
            Id: record.primaryKey
          }),
        };
      });
  }
};
