/**
 * Created by CCristi on 2/22/17.
 */

'use strict';

const AWS = require('aws-sdk');
const S3Iterator = require('./S3Iterator');
const MaxDateFilter = require('./Filter/MaxDateFilter');
const IgnoreFilter = require('./Filter/IgnoreFilter');
const ComposedFilter = require('./Filter/ComposedFilter');
const CopyMapper = require('./Mapper/CopyMapper');

exports.handler = function(event, context, callback) {
  const s3 = new AWS.S3();
  const bucket = event.Bucket;

  const iterator = new S3Iterator(s3, bucket)
    .filter(
      new ComposedFilter([
        new MaxDateFilter(event.MaxDateTime),
        IgnoreFilter.create(bucket),
      ])
    )
    .mapper(CopyMapper.create(s3, bucket));

  iterator.iterate()
    .then(lastEntry => callback(null, {LastEntry: lastEntry.data,}))
    .catch(e => callback(e, null));
};
