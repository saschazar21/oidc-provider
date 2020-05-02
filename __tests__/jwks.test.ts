import { mockRequest, mockResponse } from 'mock-req-res';
import { NextApiRequest, NextApiResponse } from 'next';

describe('/api/jwks', () => {
  let req: NextApiRequest;
  let res: NextApiResponse;

  beforeEach(() => {
    jest.resetModules();
    console.error = console.log;

    const json = jest.fn().mockName('mockJSON');
    const setHeader = jest.fn().mockName('mockSetHeader');
    const status = jest.fn().mockName('status');
    const end = jest.fn().mockName('mockEnd');

    req = mockRequest({
      method: 'GET',
      url: '/api/jwks',
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

  it('should throw, when no MASTER_KEY is set', async () => {
    process.env = {
      ...process.env,
      MASTER_KEY: undefined,
    };

    const { default: fetchJWKS } = await import('~/pages/api/jwks');

    await fetchJWKS(req, res);

    expect(res.setHeader).toHaveBeenCalledWith(
      'X-Robots-Tag',
      'noindex, nofollow',
    );
    expect(res.json).not.toHaveBeenCalled();
    expect(res.end).toHaveBeenCalledWith('Internal Server Error');
  });

  it('should throw, when no MASTER_KEY is set', async () => {
    process.env = {
      ...process.env,
      MASTER_KEY: 'testkey',
    };

    const { default: fetchJWKS } = await import('~/pages/api/jwks');

    await fetchJWKS(req, res);

    expect(res.setHeader).toHaveBeenCalledWith(
      'X-Robots-Tag',
      'noindex, nofollow',
    );
    expect(res.json).toHaveBeenCalled();
    expect(res.end).not.toHaveBeenCalled();
  });
});
