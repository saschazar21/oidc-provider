import { NextApiRequest, NextApiResponse } from 'next';
import { connection } from 'mongoose';
import { mockRequest, mockResponse } from 'mock-req-res';

import { UserSchema } from 'database/lib/schemata/user';
import { loginMiddleware } from '~/lib/main/login';

describe('Login Middleware', () => {
  let UserModel;

  let connect;
  let req: NextApiRequest;
  let res: NextApiResponse;
  let sub: string;

  const user: UserSchema = {
    email: 'someone-login@test.com',
    password: 'some test password',
  };

  afterEach(async () => {
    try {
      await connect().then(() => UserModel.findByIdAndDelete(sub));
    } finally {
      connection.close();
    }
  });

  beforeEach(async () => {
    jest.resetModules();

    const dbImports = await import('database/lib');
    connect = dbImports.default;
    UserModel = dbImports.UserModel;

    await connect()
      .then(() => UserModel.create(user))
      .then((u) => {
        sub = u.get('sub');
      });

    console.error = console.log;

    const getHeader = jest.fn().mockName('mockGetHeader');
    const json = jest.fn().mockName('mockJSON');
    const setHeader = jest.fn().mockName('mockSetHeader');
    const status = jest.fn().mockName('mockStatus');
    const end = jest.fn().mockName('mockEnd');

    req = {
      ...mockRequest,
      connection: {
        encrypted: true,
      },
      method: 'POST',
      url: '/api/login',
      body: {
        email: user.email,
        password: user.password,
        session: false,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    res = {
      ...mockResponse,
      json,
      getHeader,
      set: null,
      setHeader,
      status,
      end,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  });

  it('should successfully authenticate user', async () => {
    await loginMiddleware(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Location', '/');
    expect(res.status).toHaveBeenCalledWith(303);
  });

  it('should fail when no user given', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { email, ...body } = req.body;

    const updatedReq = {
      ...req,
      body,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    await expect(loginMiddleware(updatedReq, res)).rejects.toThrowError(
      'E-Mail and/or Password missing!'
    );
  });

  it('should fail when no password given', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...body } = req.body;

    const updatedReq = {
      ...req,
      body,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    await expect(loginMiddleware(updatedReq, res)).rejects.toThrowError(
      'E-Mail and/or Password missing!'
    );
  });

  it('should fail when wrong password given', async () => {
    const updatedReq = {
      ...req,
      body: {
        ...req.body,
        user: user.email,
        password: `not-${user.password}`,
        session: true,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    await expect(loginMiddleware(updatedReq, res)).rejects.toThrowError();
  });
});
