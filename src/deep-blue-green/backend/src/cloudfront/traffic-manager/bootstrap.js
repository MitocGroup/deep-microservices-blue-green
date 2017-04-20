'use strict';

const ENV_BLUE = 'blue';
const ENV_GREEN = 'green';

// parameters are compiled by deep-pacakge-manager::Replication::LambdaCompiler
'edge-params-start';
var edgeParams = {blueBase: '', greenBase: '', domain: '', percentage: 0};
'edge-params-end';

exports.handler = (event, context, callback) => {
  const request = event.Records[0].cf.request;
  const requestHandlers = [
    envCookieRequestHandler,
    randomEnvRequestHandler,
  ];

  for (let handler of requestHandlers) {
    const response = handler(request);

    if (response) {
      return callback(null, response);
    }
  }

  callback(null, request);
};

function envCookieRequestHandler(request) {
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
          return createBlueRedirectResponse(request);
      }
    }
  }

  return null;
}

function randomEnvRequestHandler(request) {
  // [percentage] is replaced by deep-package-manager:LambdaCompiler 
  return Math.random() < (edgeParams.percentage / 100)
    ? createGreenRedirectResponse(request)
    : createBlueRedirectResponse(request);
}

function createGreenRedirectResponse(request) {
  return {
    status: '302',
    statusDescription: '302 Found',
    httpVersion: request.httpVersion,
    headers: {
      Location: [edgeParams.greenBase + (request.uri || '')],
      'Set-Cookie': [
        `__deep_blue_green_env__=green;domain=${edgeParams.domain};path=/`,
      ],
    },
  }
}

function createBlueRedirectResponse(request) {
  return {
    status: '302',
    statusDescription: '302 Found',
    httpVersion: request.httpVersion,
    headers: {
      Location: [edgeParams.blueBase + (request.uri || '')],
      'Set-Cookie': [
        `__deep_blue_green_env__=blue;domain=${edgeParams.domain};path=/`,
      ],
    },
  }
}
