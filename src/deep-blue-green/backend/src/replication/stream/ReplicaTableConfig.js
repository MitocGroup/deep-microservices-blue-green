/**
 * Created by CCristi on 2/16/17.
 */

'use strict';

module.exports = class ReplicaTableConfig {
  constructor(tableName, region, config) {
    this._name = tableName;
    this._region = region || null;
    this._config = config || {};
  }

  get name() {
    return this._name;
  }

  get region() {
    return this._region;
  }

  set region(region) {
    this._region = region;
  }

  get rawConfig() {
    return this._config;
  }
};
