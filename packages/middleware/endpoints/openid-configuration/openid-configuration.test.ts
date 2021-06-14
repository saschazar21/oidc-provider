import { IncomingMessage, ServerResponse } from 'http';
import MockRequest from 'mock-req';

import { STATUS_CODE } from 'utils/lib/types/status_code';
import { METHOD } from 'utils/lib/types/method';
import { mockResponse } from 'utils/lib/util/test-utils';

describe('/.well-known/openid-configuration', () => {
  console.error = console.log;

  let fetchConfiguration: (
    req: IncomingMessage,
    res: ServerResponse
  ) => Promise<void>;

  let req;

  beforeEach(async () => {
    jest.resetModules();

    fetchConfiguration = await (
      await import('middleware/endpoints/openid-configuration')
    ).default;

    req = new MockRequest({
      method: 'GET',
      url: '/.well-known/openid-configuration',
    });
  });

  it('should fetch the OpenID Configuration', async () => {
    const { default: configuration } = await import(
      'config/lib/openid-configuration'
    );

    const res = mockResponse();

    await fetchConfiguration(req, res);

    expect(res.getHeader('x-robots-tag')).toEqual('noindex, nofollow');
    expect(res.statusCode).toEqual(STATUS_CODE.OK);
    expect(res._getJSON()).toEqual(configuration());
  });

  it('should return status 405, if method != GET', async () => {
    const res = mockResponse();

    await expect(() =>
      fetchConfiguration({ ...req, method: 'POST' }, res)
    ).rejects.toThrowError();

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
      await import('middleware/endpoints/openid-configuration')
    ).default;

    const res = mockResponse();

    await expect(() => fetchConfiguration(req, res)).rejects.toThrowError();

    expect(res.getHeader('x-robots-tag')).toEqual('noindex, nofollow');
  });
});
