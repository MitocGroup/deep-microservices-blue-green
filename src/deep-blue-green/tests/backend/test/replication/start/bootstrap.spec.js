'use strict';

import chai from 'chai';
import bootstrap from '../../../../../backend/src/replication/start/bootstrap';

suite('Bootstraps', () => {
  test(' bootstrap exists in replication-stream module', () => {
    chai.expect(bootstrap).to.be.an('object');
  });
});
