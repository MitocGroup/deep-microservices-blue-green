/**
 * Created by CCristi on 2/16/17.
 */

'use strict';

const Marshaler = require('./Marshaler');
const TableManager = require('./TableManager');

module.exports = class BackFillExecutor {
  /**
   * @param {TableManager} tableManager
   * @param {String} hash
   */
  constructor(tableManager, hash) {
    this._tableManager = tableManager;
    this._hash = hash;
  }

  /**
   * @param {Object[]} chunks
   * @returns {*}
   */
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

  /**
   * @param {Item[]} chunk
   * @returns {Promise}
   * @private
   */
  _backFillSingleChunk(chunk) {
    return Promise.all(
      chunk.map(this._backFillSingleItem.bind(this))
    );
  }

  /**
   * @param {Object} item
   * @returns {*}
   * @private
   */
  _backFillSingleItem(item) {
    let updateValues = Marshaler.marshalItem({
      ':hash': this._hash,
    });

    return this._tableManager.updateItem(
      item,
      BackFillExecutor.BACKFILL_UPDATE_EXPRESSION,
      updateValues
    );
  }

  /**
   * @returns {String}
   */
  static get BACKFILL_UPDATE_EXPRESSION() {
    return `SET ${TableManager.BACKFILL_FIELD} = :hash`;
  }
};
