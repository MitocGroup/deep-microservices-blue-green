/* eslint no-use-before-define:0 */
/* eslint max-len:0 */

'use strict';

const Record = require('./Record');
const ReplicaTable = require('./ReplicaTable');

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
