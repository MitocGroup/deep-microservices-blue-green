'use strict';

import chai from 'chai';
import bootstrap from '../../../../../backend/src/replication/s3-backfill/bootstrap';

suite('Bootstraps', () => {
  test(' bootstrap exists in replication-s3-backfill module', () => {
    chai.expect(bootstrap).to.be.an('object');
  });
});
