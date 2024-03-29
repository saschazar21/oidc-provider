import { ServerResponse } from 'http';
import { Document } from 'mongoose';
import MockRequest from 'mock-req';

import connection, {
  disconnect,
  UserModel,
} from '@saschazar/oidc-provider-database/lib/';
import { UserSchema } from '@saschazar/oidc-provider-database/lib/schemata/user';
import loginEndpoint from '@saschazar/oidc-provider-middleware/endpoints/login';
import { mockResponse } from '@saschazar/oidc-provider-utils/lib/util/test-utils';
import { METHOD } from '@saschazar/oidc-provider-types/lib/method';
import { ENDPOINT } from '@saschazar/oidc-provider-types/lib/endpoint';
import getUrl from '@saschazar/oidc-provider-config/lib/url';
import { encode } from 'querystring';

describe('Login endpoint', () => {
  let userDoc: Document<UserSchema>;
  let res: ServerResponse;

  const baseUser: UserSchema = {
    email: 'test-user-endpoint@example.com',
    password: 'testpassword',
  };

  const baseRequest = {
    method: METHOD.POST,
    url: ENDPOINT.LOGIN,
    protocol: 'https',
  };

  afterAll(async () => {
    await connection();
    await userDoc.delete();
    await disconnect();
  });

  beforeAll(async () => {
    await connection();
    userDoc = await UserModel.create(baseUser);
    await disconnect();

    console.error = console.log;
  });

  beforeEach(() => {
    res = mockResponse();
  });

  it('logs in user using short-lived session', async () => {
    const body = {
      email: baseUser.email,
      password: baseUser.password,
      redirect_to: getUrl(ENDPOINT.AUTHORIZATION),
    };

    const req = new MockRequest(baseRequest);
    req.write(encode(body));
    req.end();

    await loginEndpoint(req, res);

    expect(res.getHeader('location')).toMatch(body.redirect_to);

    const cookies = res.getHeader('set-cookie') as string[];

    expect(
      cookies.findIndex((cookie: string) =>
        new RegExp(`^sub=${userDoc.get('_id')}; `).test(cookie)
      )
    ).toBeGreaterThan(-1);

    expect(
      cookies.findIndex((cookie: string) =>
        new RegExp(`^user=${userDoc.get('_id')}; `).test(cookie)
      )
    ).toEqual(-1);
  });

  it('logs in user using long-lived session', async () => {
    const body = {
      email: baseUser.email,
      password: baseUser.password,
      session: 'on',
      redirect_to: getUrl(ENDPOINT.AUTHORIZATION),
    };

    const req = new MockRequest(baseRequest);
    req.write(encode(body));
    req.end();

    await loginEndpoint(req, res);

    expect(res.getHeader('location')).toMatch(body.redirect_to);

    const cookies = res.getHeader('set-cookie') as string[];

    expect(
      cookies.findIndex((cookie: string) =>
        new RegExp(`^user=${userDoc.get('_id')}; `).test(cookie)
      )
    ).toBeGreaterThan(-1);

    expect(
      cookies.findIndex((cookie: string) =>
        new RegExp(`^sub=${userDoc.get('_id')}; `).test(cookie)
      )
    ).toEqual(-1);
  });

  it('fails to login user, when credentials partly missing', async () => {
    const body = {
      password: baseUser.password,
      redirect_to: getUrl(ENDPOINT.AUTHORIZATION),
    };

    const req = new MockRequest(baseRequest);
    req.write(encode(body));
    req.end();

    await loginEndpoint(req, res);
    expect(res.statusCode).toEqual(401);
  });

  it('fails to login user, when e-mail is invalid', async () => {
    const body = {
      email: 'invalid',
      password: baseUser.password,
      redirect_to: getUrl(ENDPOINT.AUTHORIZATION),
    };

    const req = new MockRequest(baseRequest);
    req.write(encode(body));
    req.end();

    await loginEndpoint(req, res);
    expect(res.statusCode).toEqual(401);
  });

  it('fails to login user, when password is invalid', async () => {
    const body = {
      email: baseUser.email,
      password: 'invalid',
      redirect_to: getUrl(ENDPOINT.AUTHORIZATION),
    };

    const req = new MockRequest(baseRequest);
    req.write(encode(body));
    req.end();

    await loginEndpoint(req, res);
    expect(res.statusCode).toEqual(401);
  });
});
