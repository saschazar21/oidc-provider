import MockRequest from 'mock-req';

import getUrl from 'config/lib/url';
import bearerMiddleware from '@saschazar/oidc-provider-middleware/lib/bearer';
import { METHOD } from 'types/lib/method';
import idAsync from 'utils/lib/util/id';
import { mockResponse } from 'utils/lib/util/test-utils';
import { encode } from 'querystring';

describe('Bearer middleware', () => {
  let res;
  const createToken = idAsync();

  beforeEach(() => {
    res = mockResponse();
  });

  it('parses access token from Authorization header', async () => {
    const token = await createToken();

    const baseRequest = {
      method: METHOD.GET,
      https: true,
      headers: {
        authorization: `Bearer ${token}`,
      },
    };

    const req = new MockRequest(baseRequest);

    const extracted = await bearerMiddleware(req, res);

    expect(extracted).toEqual(token);
  });

  it('parses access token from form body', async () => {
    const token = await createToken();

    const baseRequest = {
      method: METHOD.POST,
      https: true,
    };

    const req = new MockRequest(baseRequest);
    req.write(
      encode({
        access_token: token,
      })
    );
    req.end();

    const extracted = await bearerMiddleware(req, res);

    expect(extracted).toEqual(token);
  });

  it('parses access token from query params', async () => {
    const token = await createToken();

    const baseRequest = {
      method: METHOD.GET,
      https: true,
      url: `${getUrl()}/userinfo?access_token=${token}`,
    };

    const req = new MockRequest(baseRequest);

    const extracted = await bearerMiddleware(req, res);

    expect(extracted).toEqual(token);
  });

  it('returns null, when no token present in Authorization header', async () => {
    const baseRequest = {
      method: METHOD.GET,
      https: true,
      headers: {},
    };

    const req = new MockRequest(baseRequest);

    const extracted = await bearerMiddleware(req, res);

    expect(extracted).toBeNull();
  });

  it('returns null, when no token could be extracted from Authorization header', async () => {
    const baseRequest = {
      method: METHOD.GET,
      https: true,
      headers: {
        authorization: 'Basic invalid:invalid',
      },
    };

    const req = new MockRequest(baseRequest);

    const extracted = await bearerMiddleware(req, res);

    expect(extracted).toBeNull();
  });

  it('returns null, when body has unsupported content-type', async () => {
    const baseRequest = {
      method: METHOD.POST,
      https: true,
      headers: {
        'content-type': 'application/json',
      },
    };

    const req = new MockRequest(baseRequest);
    req.write(JSON.stringify({ hello: 'invalid' }));
    req.end();

    const extracted = await bearerMiddleware(req, res);

    expect(extracted).toBeNull();
  });

  it('returns null, when no access token is present in query params', async () => {
    const baseRequest = {
      method: METHOD.GET,
      https: true,
      url: `${getUrl()}/userinfo`,
    };

    const req = new MockRequest(baseRequest);

    const extracted = await bearerMiddleware(req, res);

    expect(extracted).toBeNull();
  });

  it('throws, when multiple access tokens are present', async () => {
    const token = await createToken();

    const baseRequest = {
      method: METHOD.GET,
      https: true,
      headers: {
        authorization: `Bearer ${token}`,
      },
      url: `${getUrl()}/userinfo?access_token=${token}`,
    };

    const req = new MockRequest(baseRequest);

    await expect(bearerMiddleware(req, res)).rejects.toThrow(
      /Multiple access tokens/
    );
  });
});
