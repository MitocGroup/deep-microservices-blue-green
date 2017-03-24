/**
 * Created by CCristi on 2/23/17.
 */

'use strict';

const Entry = require('./Entry');
const SimpleFilter = require('./Filter/SimpleFilter');
const SimpleMapper = require('./Mapper/SimpleMapper');

module.exports = class S3Iterator {
  /**
   * @param {Object} s3
   * @param {String} bucket
   */
  constructor(s3, bucket) {
    this._s3 = s3;
    this._bucket = bucket;
    this._mapper = new SimpleMapper();
    this._filter = new SimpleFilter();
  }

  /**
   * @param {SimpleMapper} mapper
   * @returns {S3Iterator}
   */
  mapper(mapper) {
    this._mapper = mapper;

    return this;
  }

  /**
   * @param {SimpleFilter} filter
   * @returns {S3Iterator}
   */
  filter(filter) {
    this._filter = filter;

    return this;
  }

  /**
   * @param {String|undefined} [_token=undefined]
   * @returns {Promise}
   */
  iterate(_token) {
    let payload = {
      Bucket: this._bucket,
    };

    if (_token) {
      payload.ContinuationToken = _token;
    }

    return this._s3.listObjectsV2(payload).promise().then(response => {
      let entries = this._filter.filter(this._extractEntries(response));

      return this._mapper.map(entries).then(() => {
        return response.IsTruncated ?
          this.iterate(response.NextContinuationToken) :
          entries.pop();
      });
    });
  }

  /**
   * @param {Object} response
   * @returns {Entry[]}
   * @private
   */
  _extractEntries(response) {
    return response.Contents.map(e => new Entry(e));
  }
};

