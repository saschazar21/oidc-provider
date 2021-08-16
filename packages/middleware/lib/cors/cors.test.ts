import { IncomingMessage, ServerResponse } from 'http';
import MockRequest from 'mock-req';

import {
  CorsOptions,
  CORS_HEADERS,
} from '@saschazar/oidc-provider-middleware/lib/cors';
import { STATUS_CODE } from 'types/lib/status_code';
import { METHOD } from 'types/lib/method';
import { mockResponse } from 'utils/lib/util/test-utils';

describe('CORS', () => {
  let cors: (
    req: IncomingMessage,
    res: ServerResponse,
    options?: CorsOptions
  ) => Promise<boolean>;
  const ORIGIN = 'http://example.com';

  const req = new MockRequest({
    headers: {
      [CORS_HEADERS.ORIGIN]: ORIGIN,
    },
  });

  const res = mockResponse();

  beforeEach(async () => {
    jest.resetModules();

    process.env.ALLOWED_ORIGINS = ORIGIN;

    cors = await (
      await import('@saschazar/oidc-provider-middleware/lib/cors')
    ).default;
  });

  it('responds to a simple GET request', async () => {
    const customReq = new MockRequest({});

    const isPreflight = await cors(customReq, res);

    expect(isPreflight).toBeFalsy();
    expect(res.getHeaders()).toMatchObject({});
  });

  it('responds to a simple GET request with mirrorOrigin enabled', async () => {
    const isPreflight = await cors(req, res, { mirrorOrigin: true });

    expect(isPreflight).toBeFalsy();
    expect(res.getHeader(CORS_HEADERS.ALLOW_ORIGIN)).toEqual(ORIGIN);
    expect(res.getHeader(CORS_HEADERS.VARY)).toEqual(CORS_HEADERS.ORIGIN);
  });

  it('responds to a simple GET request when ALLOWED_ORIGINS is set', async () => {
    const isPreflight = await cors(req, res);

    expect(isPreflight).toBeFalsy();
    expect(res.getHeader(CORS_HEADERS.ALLOW_ORIGIN)).toEqual(ORIGIN);
    expect(res.getHeader(CORS_HEADERS.VARY)).toEqual(CORS_HEADERS.ORIGIN);
  });

  it('responds to a CORS preflight request', async () => {
    const customReq = new MockRequest({
      headers: {
        [CORS_HEADERS.ORIGIN]: ORIGIN,
        [CORS_HEADERS.REQUEST_METHOD]: METHOD.GET,
      },
      method: METHOD.OPTIONS,
    });

    const isPreflight = await cors(customReq, res, { mirrorOrigin: true });

    expect(isPreflight).toBeTruthy();
    expect(res.getHeader(CORS_HEADERS.ALLOW_ORIGIN)).toEqual(ORIGIN);
    expect(res.getHeader(CORS_HEADERS.ALLOW_METHODS)).toEqual(
      [METHOD.GET, METHOD.HEAD].join(', ')
    );
    expect(res.getHeader('content-length')).toEqual(0);
    expect(res.statusCode).toEqual(STATUS_CODE.NO_CONTENT);
  });

  it('returns predefined Access-Control-Allow-Headers HTTP header', async () => {
    const isPreflight = await cors(req, res, {
      credentials: true,
      headers: ['Content-Type'],
    });

    expect(isPreflight).toBeFalsy();
    expect(res.getHeader(CORS_HEADERS.ALLOW_HEADERS)).toEqual('Content-Type');
    expect(res.getHeader(CORS_HEADERS.ALLOW_CREDENTIALS)).toEqual('true');
  });

  it('responds to Access-Control-Request-Headers HTTP header', async () => {
    const customReq = new MockRequest({
      headers: {
        [CORS_HEADERS.ORIGIN]: ORIGIN,
        [CORS_HEADERS.REQUEST_METHOD]: METHOD.GET,
        [CORS_HEADERS.REQUEST_HEADERS]: 'Content-Type, Content-Language',
      },
      method: METHOD.OPTIONS,
    });

    const isPreflight = await cors(customReq, res);

    expect(isPreflight).toBeTruthy();
    expect(res.getHeader(CORS_HEADERS.ALLOW_HEADERS)).toEqual(
      customReq.headers[CORS_HEADERS.REQUEST_HEADERS]
    );
    expect(res.getHeader(CORS_HEADERS.VARY)).toEqual(
      [CORS_HEADERS.ORIGIN, CORS_HEADERS.REQUEST_HEADERS].join(', ')
    );
  });

  it('responds to Access-Control-Request-Headers HTTP header set as array', async () => {
    const requestHeaders = ['Content-Type', 'Content-Language'];
    const customReq = new MockRequest({
      headers: {
        [CORS_HEADERS.ORIGIN]: ORIGIN,
        [CORS_HEADERS.REQUEST_METHOD]: METHOD.GET,
        [CORS_HEADERS.REQUEST_HEADERS]: requestHeaders,
      },
      method: METHOD.OPTIONS,
    });

    const isPreflight = await cors(customReq, res);

    expect(isPreflight).toBeTruthy();
    expect(res.getHeader(CORS_HEADERS.ALLOW_HEADERS)).toEqual(
      requestHeaders.join(', ')
    );
  });

  it('responds to non-preflight OPTIONS request with Allow header', async () => {
    const customReq = new MockRequest({
      method: METHOD.OPTIONS,
    });

    const isPreflight = await cors(customReq, res, { mirrorOrigin: true });

    expect(isPreflight).toBeFalsy();
    expect(res.flushHeaders).toHaveBeenCalledTimes(1);
    expect(res.getHeader('Allow')).toEqual(
      [METHOD.GET, METHOD.HEAD].join(', ')
    );
  });
});
