import { IncomingMessage, ServerResponse } from 'http';
import { mockRequest, mockResponse } from 'mock-req-res';

import { CorsOptions, CORS_HEADERS } from 'middleware/lib/cors';
import { STATUS_CODE } from 'utils/lib/types/status_code';
import { METHOD } from 'utils/lib/types/method';

describe('CORS', () => {
  let cors: (
    req: IncomingMessage,
    res: ServerResponse,
    options?: CorsOptions
  ) => Promise<boolean>;
  const ORIGIN = 'http://example.com';

  let headersSent = false;
  let statusCode: number;
  const headers = new Map<CORS_HEADERS, string | number>();

  const req = mockRequest({
    headers: {
      [CORS_HEADERS.ORIGIN]: ORIGIN,
    },
  });

  const res = mockResponse({
    headersSent,
    statusCode,
    flushHeaders: jest.fn(() => headers.clear()),
    getHeader: jest.fn((key: CORS_HEADERS) => headers.get(key)),
    setHeader: jest.fn((key: CORS_HEADERS, value: string | number) =>
      headers.set(key, value)
    ),
    writeHead: jest.fn(
      (
        status: STATUS_CODE,
        header: { [key in CORS_HEADERS]: string | number }
      ) => {
        res.headersSent = true;
        (res.statusCode = status),
          Object.keys(header).forEach(
            (key: CORS_HEADERS, value: string | number) =>
              headers.set(key, value)
          );
      }
    ),
  });

  beforeEach(async () => {
    jest.resetModules();

    process.env.ALLOWED_ORIGINS = ORIGIN;

    cors = await (await import('middleware/lib/cors')).default;

    headers.clear();
    headersSent = false;
    statusCode = undefined;
  });

  it('responds to a simple GET request', async () => {
    const customReq = mockRequest({});

    const isPreflight = await cors(customReq, res);

    expect(isPreflight).toBeFalsy();
    expect(res.setHeader).not.toHaveBeenCalled();
  });

  it('responds to a simple GET request with mirrorOrigin enabled', async () => {
    const isPreflight = await cors(req, res, { mirrorOrigin: true });

    expect(isPreflight).toBeFalsy();
    expect(res.setHeader).toHaveBeenCalledWith(
      CORS_HEADERS.ALLOW_ORIGIN,
      ORIGIN
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      CORS_HEADERS.VARY,
      CORS_HEADERS.ORIGIN
    );
  });

  it('responds to a simple GET request when ALLOWED_ORIGINS is set', async () => {
    const isPreflight = await cors(req, res);

    expect(isPreflight).toBeFalsy();
    expect(res.setHeader).toHaveBeenCalledWith(
      CORS_HEADERS.ALLOW_ORIGIN,
      ORIGIN
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      CORS_HEADERS.VARY,
      CORS_HEADERS.ORIGIN
    );
  });

  it('responds to a CORS preflight request', async () => {
    const customReq = mockRequest({
      headers: {
        [CORS_HEADERS.ORIGIN]: ORIGIN,
        [CORS_HEADERS.REQUEST_METHOD]: METHOD.GET,
      },
      method: METHOD.OPTIONS,
    });

    const isPreflight = await cors(customReq, res, { mirrorOrigin: true });

    expect(isPreflight).toBeTruthy();
    expect(res.setHeader).toHaveBeenCalledWith(
      CORS_HEADERS.ALLOW_ORIGIN,
      ORIGIN
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      CORS_HEADERS.ALLOW_METHODS,
      [METHOD.GET, METHOD.HEAD].join(', ')
    );
    expect(res.writeHead).toHaveBeenCalledWith(STATUS_CODE.NO_CONTENT, {
      'Content-Length': 0,
    });
  });

  it('returns predefined Access-Control-Allow-Headers HTTP header', async () => {
    const isPreflight = await cors(req, res, {
      credentials: true,
      headers: ['Content-Type'],
    });

    expect(isPreflight).toBeFalsy();
    expect(res.setHeader).toHaveBeenCalledWith(
      CORS_HEADERS.ALLOW_HEADERS,
      'Content-Type'
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      CORS_HEADERS.ALLOW_CREDENTIALS,
      'true'
    );
  });

  it('responds to Access-Control-Request-Headers HTTP header', async () => {
    const customReq = mockRequest({
      headers: {
        [CORS_HEADERS.ORIGIN]: ORIGIN,
        [CORS_HEADERS.REQUEST_METHOD]: METHOD.GET,
        [CORS_HEADERS.REQUEST_HEADERS]: 'Content-Type, Content-Language',
      },
      method: METHOD.OPTIONS,
    });

    const isPreflight = await cors(customReq, res);

    expect(isPreflight).toBeTruthy();
    expect(res.setHeader).toHaveBeenCalledWith(
      CORS_HEADERS.ALLOW_HEADERS,
      customReq.headers[CORS_HEADERS.REQUEST_HEADERS]
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      CORS_HEADERS.VARY,
      [CORS_HEADERS.ORIGIN, CORS_HEADERS.REQUEST_HEADERS].join(', ')
    );
  });

  it('responds to Access-Control-Request-Headers HTTP header set as array', async () => {
    const customReq = mockRequest({
      headers: {
        [CORS_HEADERS.ORIGIN]: ORIGIN,
        [CORS_HEADERS.REQUEST_METHOD]: METHOD.GET,
        [CORS_HEADERS.REQUEST_HEADERS]: ['Content-Type', 'Content-Language'],
      },
      method: METHOD.OPTIONS,
    });

    const isPreflight = await cors(customReq, res);

    expect(isPreflight).toBeTruthy();
    expect(res.setHeader).toHaveBeenCalledWith(
      CORS_HEADERS.ALLOW_HEADERS,
      (customReq.headers[CORS_HEADERS.REQUEST_HEADERS] as string[]).join(', ')
    );
  });

  it('responds to non-preflight OPTIONS request with Allow header', async () => {
    const customReq = mockRequest({
      method: METHOD.OPTIONS,
    });

    const isPreflight = await cors(customReq, res, { mirrorOrigin: true });

    expect(isPreflight).toBeFalsy();
    expect(res.flushHeaders).toHaveBeenCalledTimes(1);
    expect(res.setHeader).toHaveBeenCalledWith(
      'Allow',
      [METHOD.GET, METHOD.HEAD].join(', ')
    );
  });
});
