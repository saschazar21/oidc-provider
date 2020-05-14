import mongoose from 'mongoose';
import { mockRequest, mockResponse } from 'mock-req-res';
import { NextApiRequest, NextApiResponse } from 'next';

describe('/api/jwks', () => {
  let KeyModel;
  let connect;
  let req: NextApiRequest;
  let res: NextApiResponse;

  afterEach(async () => {
    await connect().then(() => KeyModel.findByIdAndDelete('master'));
    mongoose.connection.close();
  });

  beforeEach(async () => {
    jest.resetModules();

    const importedDb = await import('~/lib/shared/db');
    connect = importedDb.default;
    KeyModel = importedDb.KeyModel;

    await connect().then(() => KeyModel.findByIdAndDelete('master'));
    console.error = console.log;

    const json = jest.fn().mockName('mockJSON');
    const setHeader = jest.fn().mockName('mockSetHeader');
    const status = jest.fn().mockName('mockStatus');
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

  it('should return 500, when no MASTER_KEY is set', async () => {
    process.env = {
      ...process.env,
      MASTER_KEY: undefined,
    };

    const { default: fetchJWKS } = await import('~/pages/api/jwks');

    await fetchJWKS(req, res);

    expect(res.setHeader).toHaveBeenCalledWith(
      'X-Robots-Tag',
      'noindex, nofollow'
    );
    expect(res.json).not.toHaveBeenCalled();
    expect(res.end).toHaveBeenCalledWith('Internal Server Error');
  });

  it('should return 405, when method != GET', async () => {
    process.env = {
      ...process.env,
      MASTER_KEY: 'testkey',
    };

    const { default: fetchJWKS } = await import('~/pages/api/jwks');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await fetchJWKS({ ...req, method: 'POST' } as any, res);

    expect(res.setHeader).toHaveBeenCalledTimes(2);
    expect(res.setHeader).toHaveBeenCalledWith('Allow', 'HEAD, OPTIONS, GET');
    expect(res.json).not.toHaveBeenCalled();
    expect(res.end).toHaveBeenCalled();
  });

  it('should return 200, when MASTER_KEY is set', async () => {
    process.env = {
      ...process.env,
      MASTER_KEY: 'testkey',
    };

    const { default: fetchJWKS } = await import('~/pages/api/jwks');

    await fetchJWKS(req, res);

    expect(res.setHeader).toHaveBeenCalledWith(
      'X-Robots-Tag',
      'noindex, nofollow'
    );
    expect(res.json).toHaveBeenCalled();
    expect(res.end).not.toHaveBeenCalled();
  });
});
