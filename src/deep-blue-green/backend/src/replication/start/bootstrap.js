/**
 * Created by CCristi on 2/10/17.
 */

/* eslint no-use-before-define:0 */

'use strict';

const AWS = require('aws-sdk');
const CHUNK_SIZE = 100;
const TableManager = require('./TableManager');
const Marshaler = require('./Marshaler');
const Item = require('./Item');
const BackFillExecutor = require('./BackFillExecutor');

exports.handler = (event, context, callback) => {
  const tableManager = new TableManager(new AWS.DynamoDB(), event.Table);
  const backFillExecutor = new BackFillExecutor(tableManager, event.Hash);
  const scanPayload = {};

  scanPayload[':hash'] = Marshaler.marshalItem(event.Hash);

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
