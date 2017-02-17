/**
 * Created by CCristi on 2/16/17.
 */

'use strict';

const RecordType = require('./RecordType');
const crypto = require('crypto');

module.exports = class Record {
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
};
