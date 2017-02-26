'use strict';

import chai from 'chai';
import bootstrap from '../../../../../backend/src/replication/s3-notification/bootstrap';

suite('Bootstraps', () => {
  test(' bootstrap exists in replication-s3-notification module', () => {
    chai.expect(bootstrap).to.be.an('object');
  });
});
