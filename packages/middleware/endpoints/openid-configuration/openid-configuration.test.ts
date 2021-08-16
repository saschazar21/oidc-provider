import { IncomingMessage, ServerResponse } from 'http';
import MockRequest from 'mock-req';

import { STATUS_CODE } from 'types/lib/status_code';
import { METHOD } from 'types/lib/method';
import { mockResponse } from 'utils/lib/util/test-utils';

describe('/.well-known/openid-configuration', () => {
  console.error = console.log;

  let fetchConfiguration: (
    req: IncomingMessage,
    res: ServerResponse
  ) => Promise<void>;

  let req;
  let res;

  beforeEach(async () => {
    jest.resetModules();

    fetchConfiguration = await (
      await import(
        '@saschazar/oidc-provider-middleware/endpoints/openid-configuration'
      )
    ).default;

    req = new MockRequest({
      method: 'GET',
      url: '/.well-known/openid-configuration',
    });

    res = mockResponse();
  });

  it('should fetch the OpenID Configuration', async () => {
    const { default: configuration } = await import(
      'config/lib/openid-configuration'
    );

    await fetchConfiguration(req, res);

    expect(res.getHeader('x-robots-tag')).toEqual('noindex, nofollow');
    expect(res.statusCode).toEqual(STATUS_CODE.OK);
    expect(res._getJSON()).toEqual(configuration());
  });

  it('should return status 405, if method != GET', async () => {
    await fetchConfiguration({ ...req, method: 'POST' }, res);

    expect(res.getHeader('x-robots-tag')).toEqual('noindex, nofollow');
    expect(res.getHeader('allow')).toEqual(
      [METHOD.HEAD, METHOD.OPTIONS, METHOD.GET].join(', ')
    );
  });

  it('should return status 500 upon failure', async () => {
    jest.resetModules();

    process.env = {
      ...process.env,
      PROVIDER_URL: undefined,
    };

    fetchConfiguration = await (
      await import(
        '@saschazar/oidc-provider-middleware/endpoints/openid-configuration'
      )
    ).default;

    const res = mockResponse();

    await fetchConfiguration(req, res);
    expect(res.statusCode).toEqual(STATUS_CODE.INTERNAL_SERVER_ERROR);

    expect(res.getHeader('x-robots-tag')).toEqual('noindex, nofollow');
  });
});
