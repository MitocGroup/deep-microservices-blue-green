
/**
 * Created by CCristi on 2/16/17.
 */

'use strict';

const Marshaler = require('./Marshaler');

module.exports = class TableManager {
  /**
   * @param {Object} dynamoDb
   * @param {String} tableName
   */
  constructor(dynamoDb, tableName) {
    this._dynamoDb = dynamoDb;
    this._tableName = tableName;
  }

  /**
   * @param {Object} item
   * @param {String} updateExpression
   * @param {Object} updateValues
   * @returns {*}
   */
  updateItem(item, updateExpression, updateValues) {
    return this._dynamoDb.updateItem(
      this._buildUpdatePayload(item, updateExpression, updateValues)
    ).promise();
  }

  /**
   * @param {String[]} fields
   * @param {String} filterExpression
   * @param {Object} filterValues
   * @returns {Promise}
   */
  scan(fields, filterExpression, filterValues) {
    return this._dynamoDb.scan(
      this._buildScanPayload(fields, filterExpression, filterValues)
    ).promise();
  }

  /**
   * @param {Object} item
   * @param {String} updateExpression
   * @param {Object} updateValues
   * @returns {Object}
   */
  _buildUpdatePayload(item, updateExpression, updateValues) {
    let payload = {};

    payload.TableName = this._tableName;
    payload.Key = Marshaler.marshalItem({Id: item.Id});
    payload.UpdateExpression = updateExpression;
    payload.ExpressionAttributeValues = updateValues;
    payload.ReturnValues = 'NONE';
    payload.ReturnConsumedCapacity = 'NONE';
    payload.ReturnItemCollectionMetrics = 'NONE';

    return payload;
  }

  /**
   * @param {String[]} fields
   * @param {String} filterExpression
   * @param {Object} filterValues
   * @returns {Object}
   */
  _buildScanPayload(fields, filterExpression, filterValues) {
    let payload = {};

    payload.TableName = this._tableName;
    payload.FilterExpression = filterExpression;
    payload.ProjectionExpression = fields.map(f => `#${f}`).join(',');
    payload.ExpressionAttributeNames = fields.reduce((obj, f) => ((obj[`#${f}`] = f) && obj), {});
    payload.ExpressionAttributeValues = filterValues;
    payload.ReturnConsumedCapacity = 'NONE';

    return payload;

  }

  /**
   * @returns {String}
   */
  static get BACKFILL_FILTER() {
    return `attribute_not_exists(${TableManager.BACKFILL_FIELD}) or ${TableManager.BACKFILL_FIELD} <> :hash`;
  }

  /**
   * @returns {String}
   */
  static get BACKFILL_FIELD() {
    return 'DeepReplicationHash';
  }
};
