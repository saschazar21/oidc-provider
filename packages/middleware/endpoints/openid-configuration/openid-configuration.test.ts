import { STATUS_CODE } from 'utils/lib/types/status_code';
import { METHOD } from 'utils/lib/types/method';
import MockRequest from 'mock-req';
import MockResponse from 'mock-res';

describe('/.well-known/openid-configuration', () => {
  console.error = console.log;
  let req;

  const writeHead = jest.fn();
  const write = jest.fn();

  beforeEach(() => {
    jest.resetModules();

    req = new MockRequest({
      method: 'GET',
      url: '/.well-known/openid-configuration',
    });
  });

  it('should fetch the OpenID Configuration', async () => {
    const { default: fetchConfiguration } = await import(
      'middleware/endpoints/openid-configuration'
    );
    const { default: configuration } = await import(
      'config/lib/openid-configuration'
    );

    const res = new MockResponse();
    res.writeHead = writeHead;
    res.write = write;

    await fetchConfiguration(req, res);

    expect(res.getHeader('x-robots-tag')).toEqual('noindex, nofollow');
    expect(res.statusCode).toEqual(STATUS_CODE.OK);
    expect(res.write).toHaveBeenCalledWith(JSON.stringify(configuration()));
  });

  it('should return status 405, if method != GET', async () => {
    const { default: fetchConfiguration } = await import(
      'middleware/endpoints/openid-configuration'
    );

    const res = new MockResponse();
    res.writeHead = writeHead;
    res.write = write;

    await expect(() =>
      fetchConfiguration({ ...req, method: 'POST' }, res)
    ).rejects.toThrowError();

    expect(res.getHeader('x-robots-tag')).toEqual('noindex, nofollow');
    expect(res.getHeader('allow')).toEqual(
      [METHOD.HEAD, METHOD.OPTIONS, METHOD.GET].join(', ')
    );
    expect(res.write).not.toHaveBeenCalled();
  });

  it('should return status 500 upon failure', async () => {
    process.env = {
      ...process.env,
      PROVIDER_URL: undefined,
    };
    const { default: fetchConfiguration } = await import(
      'middleware/endpoints/openid-configuration'
    );

    const res = new MockResponse();
    res.writeHead = writeHead;
    res.write = write;

    await expect(() => fetchConfiguration(req, res)).rejects.toThrowError();

    expect(res.getHeader('x-robots-tag')).toEqual('noindex, nofollow');
    expect(res.write).not.toHaveBeenCalled();
  });
});
