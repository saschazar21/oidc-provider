import { Mongoose, connection } from 'mongoose';
import MockReq from 'mock-req';
import MockRes from 'mock-res';

import { UserSchema } from 'database/lib/schemata/user';
import loginMiddleware from 'middleware/lib/login';
import { STATUS_CODE } from 'utils/lib/types/status_code';
import { LoginForm } from 'utils/lib/types/login';

const createReq = (configuration?: { [key: string]: string | number }) =>
  new MockReq({
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    method: 'POST',
    protocol: 'https',
    url: '/api/login',
    ...configuration,
  });

const payloadToUrlEncoded = (payload: LoginForm): string =>
  Object.keys(payload).reduce((str: string, key: string) => {
    const s = `${encodeURIComponent(key)}=${encodeURIComponent(payload[key])}`;
    return str.length ? `${str}&${s}` : s;
  }, '');

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

    const dbImports = await import('database/lib');
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
    req.write(payloadToUrlEncoded(payload));
    req.end();

    res = new MockRes();
  });

  it('should successfully authenticate user', async () => {
    await loginMiddleware(req, res);
    expect(res.getHeader('location')).toEqual('/');
    expect(res.statusCode).toEqual(STATUS_CODE.SEE_OTHER);
  });

  it('should fail when no user given', async () => {
    const { email, ...body } = payload;
    const updatedReq = createReq();
    updatedReq.write(payloadToUrlEncoded({ ...body }));
    updatedReq.end();

    await expect(loginMiddleware(updatedReq, res)).rejects.toThrowError(
      'E-Mail and/or Password missing!'
    );
  });

  it('should fail when no password given', async () => {
    const { password, ...body } = payload;

    const updatedReq = createReq();
    updatedReq.write(payloadToUrlEncoded({ ...body }));
    updatedReq.end();

    await expect(loginMiddleware(updatedReq, res)).rejects.toThrowError(
      'E-Mail and/or Password missing!'
    );
  });

  it('should fail when wrong password given', async () => {
    const updatedPayload = {
      ...payload,
      password: `not-${user.password}`,
    };

    const updatedReq = createReq();
    updatedReq.write(payloadToUrlEncoded(updatedPayload));
    updatedReq.end();

    await expect(loginMiddleware(updatedReq, res)).rejects.toThrowError();
  });
});
