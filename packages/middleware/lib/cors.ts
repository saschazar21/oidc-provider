import type { IncomingMessage, ServerResponse } from 'http';

import { ALLOWED_ORIGINS } from 'config/lib/origin';
import { STATUS_CODE } from 'utils/lib/types/status_code';
import { METHOD } from 'utils/lib/types/method';
import HTTPError from 'utils/lib/util/http_error';

const MAX_AGE = 86400;
const ALLOW_METHODS = [METHOD.GET, METHOD.HEAD];

export type CorsOptions = {
  credentials?: boolean;
  headers?: string[];
  hosts?: string[];
  maxAge?: number;
  methods?: STATUS_CODE[];
  mirrorOrigin?: boolean;
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
  VARY = 'vary',
}

const middleware = async (
  req: IncomingMessage,
  res: ServerResponse,
  options: CorsOptions
): Promise<boolean> =>
  new Promise((resolve) => {
    const vary: string[] = [];

    const requestHeaders = req.headers[CORS_HEADERS.REQUEST_HEADERS] as string;
    const requestHeadersArray: string[] = Array.isArray(requestHeaders)
      ? requestHeaders
      : requestHeaders?.length > 0
      ? requestHeaders
          .split(',')
          .map((header: string) => header.trim())
          .filter((header: string) => header.length > 0)
      : [];

    const headers = new Map<CORS_HEADERS, number | string>([
      [CORS_HEADERS.MAX_AGE, options.maxAge ?? MAX_AGE],
      [
        CORS_HEADERS.ALLOW_METHODS,
        (options.methods || ALLOW_METHODS).join(', '),
      ],
    ]);

    options.credentials && headers.set(CORS_HEADERS.ALLOW_CREDENTIALS, 'true');

    options.mirrorOrigin
      ? headers.set(
          CORS_HEADERS.ALLOW_ORIGIN,
          req.headers[CORS_HEADERS.ORIGIN] as string
        )
      : ALLOWED_ORIGINS.includes(req.headers[CORS_HEADERS.ORIGIN] as string)
      ? headers.set(
          CORS_HEADERS.ALLOW_ORIGIN,
          req.headers[CORS_HEADERS.ORIGIN] as string
        )
      : null;

    headers.get(CORS_HEADERS.ALLOW_ORIGIN) && vary.push(CORS_HEADERS.ORIGIN);

    (options.headers ?? requestHeadersArray).length > 0 &&
      headers.set(
        CORS_HEADERS.ALLOW_HEADERS,
        (options.methods || requestHeadersArray).join(', ')
      ) &&
      vary.push(CORS_HEADERS.REQUEST_HEADERS);

    headers.set(CORS_HEADERS.VARY, vary.join(', '));

    headers.get(CORS_HEADERS.ALLOW_ORIGIN) &&
      headers.forEach((value: number | string, key: CORS_HEADERS) =>
        res.setHeader(key, value)
      );

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

    res.writeHead(STATUS_CODE.NO_CONTENT, { 'Content-Length': 0 });

    return resolve(true);
  });

export default middleware;
