import { mockRequest, mockResponse } from 'mock-req-res';

import cors, { CORS_HEADERS } from 'middleware/lib/cors';
import { STATUS_CODE } from 'utils/lib/types/status_code';
import { METHOD } from 'utils/lib/types/method';

describe('CORS', () => {
  const ORIGIN = 'http://example.com';

  const req = mockRequest({
    headers: {
      [CORS_HEADERS.ORIGIN]: ORIGIN,
    },
  });

  const res = mockResponse({
    setHeader: jest.fn(),
    writeHead: jest.fn(),
  });

  it('responds to a simple GET request', async () => {
    const isPreflight = await cors(req, res);

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
    process.env.ALLOWED_ORIGINS = ORIGIN;

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
});
