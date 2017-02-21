/**
 * Created by CCristi on 2/20/17.
 */

'use strict';

const AWS = require('aws-sdk');
const S3Record = require('./S3Record');
const S3Synchronizer = require('./S3Synchronizer');
const S3DeleteSynchronizer = require('./S3DeleteSynchronizer');

exports.handler = function(event, context, callback) {
  const s3 = new AWS.S3();
  const records = event.Records.map(rawRecord => new S3Record(rawRecord));
  const recordsMap = records.reduce((map, record) => {
    map[record.bucket] = map[record.bucket] || [];
    map[record.bucket].push(record);

    return map;
  }, {});

  const promises = [];

  for (let bucketName in recordsMap) {
    if (!recordsMap.hasOwnProperty(bucketName)) {
      continue;
    }

    const s3PutPostSynchronizer = S3Synchronizer.create(s3, bucketName);
    const s3DeleteSynchronizer = S3DeleteSynchronizer.create(s3, bucketName);
    const records = recordsMap[bucketName];
    const createRecords = records.filter(S3Record.isCreate);
    const deleteRecords = records.filter(S3Record.isDelete);

    promises.push(s3PutPostSynchronizer.syncRecords(createRecords));
    promises.push(s3DeleteSynchronizer.syncRecords(deleteRecords));
  }

  Promise
    .all(promises)
    .then(result => callback(null, result))
    .catch(e => callback(e, null));
};
