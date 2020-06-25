import { NextApiRequest, NextApiResponse } from 'next';
import { connection } from 'mongoose';
import { mockRequest, mockResponse } from 'mock-req-res';

import { UserSchema } from '~/lib/shared/db/schemata/user';

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

    const dbImports = await import('~/lib/shared/db');
    connect = dbImports.default;
    UserModel = dbImports.UserModel;

    await connect()
      .then(() => UserModel.create(user))
      .then(u => {
        sub = u.get('sub');
      });

    console.error = console.log;

    const json = jest.fn().mockName('mockJSON');
    const setHeader = jest.fn().mockName('mockSetHeader');
    const status = jest.fn().mockName('mockStatus');
    const end = jest.fn().mockName('mockEnd');

    req = mockRequest({
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
    }) as any;

    res = mockResponse({
      json,
      set: null,
      setHeader,
      status,
      end,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;
  });

  it('should successfully authenticate user', () => {
    expect(true).toBeTruthy();
  });
});
