import type { IncomingMessage, ServerResponse } from 'http';

import { ALLOWED_ORIGINS } from 'config/lib/origin';
import { STATUS_CODE } from 'utils/lib/types/status_code';
import { METHOD } from 'utils/lib/types/method';
import HTTPError from 'utils/lib/util/http_error';

const MAX_AGE = 86400;
const ALLOW_HEADERS = [
  'Accept',
  'Accept-Language',
  'Content-Language',
  'Content-Type',
];
const ALLOW_METHODS = [METHOD.GET, METHOD.HEAD];

export type CorsOptions = {
  credentials?: boolean;
  headers?: string[];
  hosts?: string[];
  maxAge?: number;
  methods?: STATUS_CODE[];
};

enum CORS_HEADERS {
  ALLOW_ORIGIN = 'access-control-allow-origin',
  ALLOW_CREDENTIALS = 'access-control-allow-credentials',
  ALLOW_HEADERS = 'access-control-allow-headers',
  ALLOW_METHODS = 'access-control-allow-methods',
  EXPOSE_HEADERS = 'access-control-expose-headers',
  MAX_AGE = 'access-control-max-age',
  REQUEST_HEADERS = 'access-control-request-headers',
  REQUEST_METHOD = 'access-control-request-method',
  ORIGIN = 'origin',
}

const middleware = async (
  req: IncomingMessage,
  res: ServerResponse,
  options: CorsOptions
): Promise<boolean> =>
  new Promise((resolve) => {
    // TODO: handle CORS_HEADERS.ALLOW_ORIGIN header!

    const headers = new Map<CORS_HEADERS, number | string>([
      [CORS_HEADERS.MAX_AGE, options.maxAge ?? MAX_AGE],
      [
        CORS_HEADERS.ALLOW_HEADERS,
        (options.headers || ALLOW_HEADERS).join(', '),
      ],
      [
        CORS_HEADERS.ALLOW_METHODS,
        (options.methods || ALLOW_METHODS).join(', '),
      ],
    ]);
    options.credentials && headers.set(CORS_HEADERS.ALLOW_CREDENTIALS, 'true');

    if (req.method !== METHOD.OPTIONS) {
      return resolve(false);
    }

    if (
      !req.headers[CORS_HEADERS.REQUEST_METHOD] ||
      !req.headers[CORS_HEADERS.ORIGIN]
    ) {
      res.setHeader('Allow', headers.get(CORS_HEADERS.ALLOW_METHODS));
      throw new HTTPError(
        'Missing Access-Control-Request-Method and/or Origin in CORS preflight request!',
        STATUS_CODE.METHOD_NOT_ALLOWED,
        req.method,
        req.url
      );
    }

    headers.forEach((value: number | string, key: CORS_HEADERS) =>
      res.setHeader(key, value)
    );
    return resolve(true);
  });

export default middleware;
