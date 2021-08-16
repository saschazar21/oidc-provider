import { ClientRequest, IncomingMessage } from 'http';
import { Mongoose, connection } from 'mongoose';
import MockReq from 'mock-req';
import { encode } from 'querystring';

import { UserSchema } from '@saschazar/oidc-provider-database/lib/schemata/user';
import loginMiddleware from '@saschazar/oidc-provider-middleware/lib/login';
import { ENDPOINT } from 'types/lib/endpoint';
import { STATUS_CODE } from 'types/lib/status_code';
import { LoginForm } from 'types/lib/login';
import { mockResponse } from 'utils/lib/util/test-utils';

const createReq = (configuration?: {
  [key: string]: string | number;
}): ClientRequest =>
  new MockReq({
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    method: 'POST',
    protocol: 'https',
    url: ENDPOINT.LOGIN,
    ...configuration,
  });

describe('Login Middleware', () => {
  let UserModel;
  let connect: () => Promise<Mongoose>;

  let payload: LoginForm;
  let sub: string;
  let req;
  let res;

  const user: UserSchema = {
    email: 'someone-login@test.com',
    password: 'some test password',
  };

  afterEach(async () => {
    try {
      await connect().then(() => UserModel.findByIdAndDelete(sub));
    } finally {
      await connection.close();
    }
  });

  beforeEach(async () => {
    jest.resetModules();

    const dbImports = await import('@saschazar/oidc-provider-database/lib/');
    connect = await dbImports.default;
    UserModel = dbImports.UserModel;

    await connect()
      .then(() => UserModel.create(user))
      .then((u) => {
        sub = u.get('sub');
      });

    console.error = console.log;

    payload = {
      email: user.email,
      password: user.password,
      session: false,
    };

    req = createReq();
    req.write(encode(payload as { [key: string]: string | number | boolean }));
    req.end();

    res = mockResponse();
  });

  it('should successfully authenticate user', async () => {
    await loginMiddleware(req, res);
    expect(res.getHeader('location')).toEqual('/');
    expect(res.statusCode).toEqual(STATUS_CODE.SEE_OTHER);
  });

  it('should fail when no user given', async () => {
    const { email, ...body } = payload;
    const updatedReq = createReq();
    updatedReq.write(encode({ ...body }));
    updatedReq.end();

    await expect(
      loginMiddleware(updatedReq as unknown as IncomingMessage, res)
    ).rejects.toThrowError('E-Mail and/or Password missing!');
  });

  it('should fail when no password given', async () => {
    const { password, ...body } = payload;

    const updatedReq = createReq();
    updatedReq.write(encode({ ...body }));
    updatedReq.end();

    await expect(
      loginMiddleware(updatedReq as unknown as IncomingMessage, res)
    ).rejects.toThrowError('E-Mail and/or Password missing!');
  });

  it('should fail when wrong password given', async () => {
    const updatedPayload = {
      ...payload,
      password: `not-${user.password}`,
    };

    const updatedReq = createReq();
    updatedReq.write(encode(updatedPayload));
    updatedReq.end();

    await expect(
      loginMiddleware(updatedReq as unknown as IncomingMessage, res)
    ).rejects.toThrowError();
  });
});
