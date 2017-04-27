/**
 * Created by CCristi on 3/6/17.
 */

'use strict';

exports.handler = function(event, context, callback) {
  const response = event.Records[0].cf.response;
  const headers = response.headers;

  if (headers.hasOwnProperty('Set-Cookie')) {
    for (let header of headers['Set-Cookie']) {
      if (/__deep_blue_green_env__/i.test(header)) {
        return callback(null, response);
      }

      headers['Set-Cookie'].push('__deep_blue_green_env__=blue;domain=[domain-name];path=/');
    }
  } else {
    headers['Set-Cookie'] = ['__deep_blue_green_env__=blue;domain=[domain-name];path=/'];
  }

  callback(null, response);
};
