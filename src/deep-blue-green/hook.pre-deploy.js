/**
 * Created by CCristi on 2/8/17.
 */

'use strict';

module.exports = function(callback) {
  this.microservice.overwriteRolePolicyCb(function (type, policy) {
    if (type === 'lambda') {
      console.log('Adding statement to Lambda IAM Policy for DynamoDB Streams');

      let dynamoDbStreamStatement = policy.statement.add();

      dynamoDbStreamStatement.action.add('dynamodb', '*');
      dynamoDbStreamStatement.resource.add(dynamoDbStreamStatement.resource.create().any());
    }
  });

  callback();
};
