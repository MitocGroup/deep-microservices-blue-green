/**
 * DynamoDB Stream based replication Lambda
 * To get replication working you should setup replication Lambda in each deployment
 *
 * Usage: {tableName: 'green'}
 */

/*eslint no-use-before-define: 0 */

'use strict';

let aws = require('aws-sdk');
let dynamodb = new aws.DynamoDB({
  region: 'us-west-2'
});

exports.handler = (event, context, callback) => {
  if (!event.tableName) {
    throw new Error('Missing event.tableName');
  }

  let throughput = new DynamoDBThroughput(event.tableName, dynamodb);
    
  throughput
        .retrieve()
        .catch(error => callback(error, null))
        .then(throughputInfo => {
          console.log('Current throughput:', JSON.stringify(throughputInfo));
            
          throughput
                .calculate({read: 100, write: 30})
                .catch(error => callback(error, null))
                .then(throughputInfo => callback(null, throughputInfo));
        });
};

class DynamoDBThroughput {
  constructor(tableName, dynamodb) {
    this._dynamodb = dynamodb || new aws.DynamoDB();
    this._tableName = tableName;
    this._cache = null;
  }
    
  get tableName() {
    return this._tableName;
  }
    
  get dynamodb() {
    return this._dynamodb;
  }
    
  set dynamodb(dynamodb) {
    this._dynamodb = dynamodb;
  }
    
  calculate(desiredThrouputObject, cached) {
    desiredThrouputObject = desiredThrouputObject || {};    
    desiredThrouputObject.read = desiredThrouputObject.read || 1;
    desiredThrouputObject.write = desiredThrouputObject.write || 1;
        
    return new Promise((resolve, reject) => {
      this.stats(cached).catch(reject).then(tableStats => {
        resolve(this._calculateThrouput(tableStats, desiredThrouputObject));
      });
    });
  }
    
  _calculateThrouput(tableStats, desiredThrouputObject) {
        
        // setup default in case it's not yet updated (10 items * 64 bytes each)
    tableStats.ItemCount = tableStats.ItemCount || 10;
    tableStats.TableSizeBytes = tableStats.TableSizeBytes || 64 * 10;
        
    let entrySizeKb = tableStats.TableSizeBytes / tableStats.ItemCount / 1024;

    return {
      read: Math.ceil(entrySizeKb * desiredThrouputObject.read * DynamoDBThroughput.CONSISTENT_OP_COEF),
      write: Math.ceil(entrySizeKb * desiredThrouputObject.write * DynamoDBThroughput.CONSISTENT_OP_COEF),
    };
  }
    
  retrieve(cached) {
    return new Promise((resolve, reject) => {
      this.stats(cached).catch(reject).then(tableStats => {
        resolve({
          read: tableStats.ProvisionedThroughput.ReadCapacityUnits,
          write: tableStats.ProvisionedThroughput.WriteCapacityUnits,
        });
      });
    });
  }
    
  stats(cached) {
    cached = typeof cached === 'undefined' ? true : cached;
        
    return new Promise((resolve, reject) => {
      if (cached && this._cache) {
        return resolve(this._cache);
      }
            
      this.dynamodb.describeTable({TableName: this._tableName}, (error, data) => {
        if (error) {
          return reject(error);
        }
                
        this._cache = data.Table;
                
        resolve(data.Table);
      });
    });
  }
    
  static get CONSISTENT_OP_COEF() {
    return 1.2;
  }
}
