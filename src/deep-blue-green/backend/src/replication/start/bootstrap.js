/**
 * Created by CCristi on 2/10/17.
 */

/* eslint no-use-before-define:0 */

'use strict';

const AWS = require('aws-sdk');
const CHUNK_SIZE = 100;

exports.handler = (event, context, callback) => {
  const tableManager = new TableManager(new AWS.DynamoDB(), event.Table);
  const backFillExecutor = new BackFillExecutor(tableManager, event.Hash);
  const scanPayload = {};

  scanPayload[':hash'] = {
    S: event.Hash,
  };

  const backFillProcessor = () => {
    tableManager
      .scan(['Id'], TableManager.BACKFILL_FILTER, scanPayload)
      .then(result => {
        let itemChunks = result.Items
          .map(i => new Item(i))
          .reduce(arrayChunkReducer(CHUNK_SIZE), []);

        return backFillExecutor.backFillChunks(itemChunks).then(() => result.length);
      })
      .then(itemsProcessed => {
        if (itemsProcessed > 0) {
          console.log(`"${itemsProcessed}" items have been marked`);
          backFillProcessor();
        } else {
          callback(null, {});
        }
      })
      .catch(e => {
        callback({
          error: e,
          stack: e.stack.toString(),
        }, null);
      });
  };

  backFillProcessor();
};

class BackFillExecutor {
  constructor(tableManager, hash) {
    this._tableManager = tableManager;
    this._hash = hash;
  }

  backFillChunks(chunks) {
    if (chunks.length === 0) {
      return Promise.resolve();
    }

    let chunksClone = [].concat(chunks);
    let currentChunk = chunksClone.shift();

    console.log(`Updating "${currentChunk.length}" items.`);

    return this._backFillSingleChunk(currentChunk)
      .then(() => this.backFillChunks(chunksClone))
  }

  _backFillSingleChunk(chunk) {
    return Promise.all(
      chunk.map(this._backFillSingleItem.bind(this))
    );
  }

  _backFillSingleItem(item) {
    let updateValues = {};

    updateValues[':hash'] = {
      S: this._hash,
    };

    return this._tableManager.updateItem(
      item,
      BackFillExecutor.BACKFILL_UPDATE_EXPRESSION,
      updateValues
    );
  }

  static get BACKFILL_UPDATE_EXPRESSION() {
    return `SET ${TableManager.BACKFILL_FIELD} = :hash`;
  }
}

class TableManager {
  constructor(dynamoDb, tableName) {
    this._dynamoDb = dynamoDb;
    this._tableName = tableName;
  }

  updateItem(item, updateExpression, updateValues) {
    return this._dynamoDb.updateItem(
      this._buildUpdatePayload(item, updateExpression, updateValues)
    ).promise();
  }

  scan(fields, filterExpression, filterValues) {
    return this._dynamoDb.scan(
      this._buildScanPayload(fields, filterExpression, filterValues)
    ).promise();
  }

  _buildUpdatePayload(item, updateExpression, updateValues) {
    let payload = {};

    payload.TableName = this._tableName;
    payload.Key = {Id: {S: item.Id}};
    payload.UpdateExpression = updateExpression;
    payload.ExpressionAttributeValues = updateValues;
    payload.ReturnValues = 'NONE';
    payload.ReturnConsumedCapacity = 'NONE';
    payload.ReturnItemCollectionMetrics = 'NONE';

    return payload;
  }

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
}

class Item {
  constructor(rawData) {
    this._rawData = rawData;
    this._data = this.extract();
  }

  extract() {
    let data = {};

    for (let key in this._rawData) {
      if (!this._rawData.hasOwnProperty(key)) {
        continue;
      }

      for (let type in this._rawData[key]) {
        if (this._rawData[key].hasOwnProperty(type)) {
          data[key] = (Serializer[type] || Serializer.defaultSerializer)(this._rawData[key][type]);
        }
      }
    }

    return data;
  }

  get fields() {
    return Object.keys(this._rawData);
  }

  get Id() {
    return this._data.Id;
  }

  get data() {
    return this._data;
  }
}

class Serializer {
  static S(i) {
    return i.toString();
  }

  static defaultSerializer(i) {
    return Serializer.S(i);
  }
}

function arrayChunkReducer(chunkSize) {
  return function(chunks, item) {
    let workingChunk;

    for (let chunk of chunks) {
      if (chunk.length < chunkSize) {
        workingChunk = chunk;
      }
    }

    if (!workingChunk) {
      workingChunk = [];
      chunks.push(workingChunk);
    }

    workingChunk.push(item);

    return chunks;
  }
}
