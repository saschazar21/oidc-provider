import { NextApiRequest, NextApiResponse } from 'next';
import { mockRequest, mockResponse } from 'mock-req-res';

describe('/.well-known/openid-configuration', () => {
  console.error = console.log;
  let req: NextApiRequest;
  let res: NextApiResponse;

  beforeEach(() => {
    jest.resetModules();

    const json = jest.fn().mockName('mockJSON');
    const setHeader = jest.fn().mockName('mockSetHeader');
    const status = jest.fn().mockName('mockStatus');
    const end = jest.fn().mockName('mockEnd');

    req = mockRequest({
      method: 'GET',
      url: '/.well-known/openid-configuration',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;

    res = mockResponse({
      json,
      setHeader,
      status,
      end,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;
  });

  it('should fetch the OpenID Configuration', async () => {
    const { default: fetchConfiguration } = await import(
      '~/pages/api/well-known/openid-configuration'
    );
    const { default: configuration } = await import(
      '~/lib/shared/config/openid-configuration'
    );

    await fetchConfiguration(req, res);

    expect(res.setHeader).toHaveBeenCalledWith(
      'X-Robots-Tag',
      'noindex, nofollow',
    );
    expect(res.json).toHaveBeenCalledWith(configuration());
    expect(res.end).not.toHaveBeenCalled();
  });

  it('should return status 405, if method != GET', async () => {
    const { default: fetchConfiguration } = await import(
      '~/pages/api/well-known/openid-configuration'
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await fetchConfiguration({ ...req, method: 'POST' } as any, res);

    expect(res.setHeader).toHaveBeenCalledWith(
      'X-Robots-Tag',
      'noindex, nofollow',
    );
    expect(res.setHeader).toHaveBeenCalledTimes(2);
    expect(res.setHeader).toHaveBeenCalledWith('Allow', 'HEAD, OPTIONS, GET');
    expect(res.json).not.toHaveBeenCalled();
    expect(res.end).toHaveBeenCalled();
  });

  it('should return status 500 upon failure', async () => {
    process.env = {
      ...process.env,
      PROVIDER_URL: undefined,
    };
    const { default: fetchConfiguration } = await import(
      '~/pages/api/well-known/openid-configuration'
    );

    await fetchConfiguration(req, res);

    expect(res.setHeader).toHaveBeenCalledWith(
      'X-Robots-Tag',
      'noindex, nofollow',
    );
    expect(res.json).not.toHaveBeenCalled();
    expect(res.end).toHaveBeenCalledWith('Internal Server Error');
  });
});
