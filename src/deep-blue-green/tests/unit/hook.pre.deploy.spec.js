'use strict';

const hookPreDeploy = require('../../hook.pre-deploy');

describe('Check hook.pre-deploy', () => {
  let context = {
    microservice: {
      overwriteRolePolicyCb: function () {}
    }
  };

  it('Test hook.pre-deploy to be executable', done => {
    hookPreDeploy.call(context, function() {
      done();
    });
  });
});
