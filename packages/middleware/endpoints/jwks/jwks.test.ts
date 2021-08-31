import { STATUS_CODE } from '@saschazar/oidc-provider-types/lib/status_code';
import { METHOD } from '@saschazar/oidc-provider-types/lib/method';
import MockRequest from 'mock-req';
import retry from 'jest-retries';

import connection, {
  KeyModel,
  disconnect,
} from '@saschazar/oidc-provider-database/lib/';
import { mockResponse } from '@saschazar/oidc-provider-utils/lib/util/test-utils';

describe('/api/jwks', () => {
  let req;
  let res;

  afterEach(async () => {
    await connection().then(() => KeyModel.findByIdAndDelete('master'));
    await disconnect();
  });

  beforeEach(async () => {
    jest.resetModules();

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

    const { default: fetchJWKS } = await import(
      '@saschazar/oidc-provider-middleware/endpoints/jwks'
    );

    await fetchJWKS(req, res);

    expect(res.statusCode).toEqual(500);
    expect(res.getHeader('Content-Type')).toMatch(/^text\/plain/);
  });

  it('should return 405, when method != GET', async () => {
    process.env = {
      ...process.env,
      MASTER_KEY: 'testkey',
    };

    const { default: fetchJWKS } = await import(
      '@saschazar/oidc-provider-middleware/endpoints/jwks'
    );

    await fetchJWKS({ ...req, method: 'POST' }, res);

    expect(res.statusCode).toEqual(405);
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

    const { default: fetchJWKS } = await import(
      '@saschazar/oidc-provider-middleware/endpoints/jwks'
    );

    await connection()
      .then(() => KeyModel.findByIdAndDelete('master'))
      .then(() => fetchJWKS(req, customRes))
      .then(() => disconnect());

    expect(customRes.statusCode).toEqual(STATUS_CODE.OK);
    expect(customRes.getHeader('x-robots-tag')).toEqual('noindex, nofollow');
    expect(customRes.getHeader('content-type')).toEqual('application/json');
  });
});
