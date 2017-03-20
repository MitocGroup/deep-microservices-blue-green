'use strict';

const ENV_BLUE = 'blue';
const ENV_GREEN = 'green';

exports.handler = (event, context, callback) => {
  const request = event.Records[0].cf.request;
  const requestListeners = [
    envCookieRequestListener,
    randomEnvRequestListener,
  ];

  for (let listener of requestListeners) {
    const response = listener(request);

    if (response) {
      return callback(null, response);
    }
  }

  callback(null, request);
};

const envCookieRequestListener = function(request) {
  const cookies = request.headers.Cookie || [];

  for (let cookie of cookies) {
    const matches = cookie.match(/__deep_blue_green_env__=([^;]+)/);

    if (matches) {
      let env = matches[1];

      switch(env) {
        case ENV_GREEN:
          return createGreenRedirectResponse(request);
        case ENV_BLUE:
        default:
          return request;
      }
    }
  }

  return null;
};

function randomEnvRequestListener(request) {
  // [percentage] is replaced by deep-package-manager:LambdaCompiler 
  return Math.random() < ([percentage] / 100)
    ? createGreenRedirectResponse(request)
    : request;
}

function createGreenRedirectResponse(blueRequest) {
  return {
    status: '302',
    statusDescription: '302 Found',
    httpVersion: blueRequest.httpVersion,
    headers: {
      Location: ['[green-hostname]' + (blueRequest.uri || '')],
      'Set-Cookie': [
        '__deep_blue_green_env__=green;domain=[domain-name];path=/',
      ],
    },
  }
}
