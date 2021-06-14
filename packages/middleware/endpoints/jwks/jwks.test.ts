import { STATUS_CODE } from 'utils/lib/types/status_code';
import { METHOD } from 'utils/lib/types/method';
import mongoose from 'mongoose';
import MockRequest from 'mock-req';
import retry from 'jest-retries';

import { mockResponse } from 'utils/lib/util/test-utils';

describe('/api/jwks', () => {
  let KeyModel;
  let connect;
  let req;
  let res;

  afterEach(async () => {
    await connect().then(() => KeyModel.findByIdAndDelete('master'));
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    jest.resetModules();

    const importedDb = await import('database/lib');
    connect = importedDb.default;
    KeyModel = importedDb.KeyModel;

    console.error = console.log;

    req = new MockRequest({
      method: 'GET',
      url: '/api/jwks',
    });

    res = mockResponse();
  });

  it('should return 500, when no MASTER_KEY is set', async () => {
    process.env = {
      ...process.env,
      MASTER_KEY: undefined,
    };

    const { default: fetchJWKS } = await import('middleware/endpoints/jwks');

    await expect(() => fetchJWKS(req, res)).rejects.toThrowError();
  });

  it('should return 405, when method != GET', async () => {
    process.env = {
      ...process.env,
      MASTER_KEY: 'testkey',
    };

    const { default: fetchJWKS } = await import('middleware/endpoints/jwks');

    await expect(() =>
      fetchJWKS({ ...req, method: 'POST' }, res)
    ).rejects.toThrowError();
    expect(res.getHeader('Allow')).toEqual(
      [METHOD.HEAD, METHOD.OPTIONS, METHOD.GET].join(', ')
    );
  });

  retry('should return 200, when MASTER_KEY is set', 10, async () => {
    process.env = {
      ...process.env,
      MASTER_KEY: 'testkey',
    };

    const customRes = mockResponse();

    const { default: fetchJWKS } = await import('middleware/endpoints/jwks');

    await connect()
      .then(() => KeyModel.findByIdAndDelete('master'))
      .then(() => fetchJWKS(req, customRes))
      .then(() => mongoose.connection.close());

    expect(customRes.statusCode).toEqual(STATUS_CODE.OK);
    expect(customRes.getHeader('x-robots-tag')).toEqual('noindex, nofollow');
    expect(customRes.getHeader('content-type')).toEqual('application/json');
  });
});
