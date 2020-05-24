import { connection } from 'mongoose';
import { NextApiRequest, NextApiResponse } from 'next';
import { mockRequest, mockResponse } from 'mock-req-res';
import retry from 'jest-retries';

import { ClientSchema } from '~/lib/shared/db/schemata/client';
import { UserSchema } from '~/lib/shared/db/schemata/user';
import { RESPONSE_TYPE } from '~/lib/shared/types/response_type';
import { SCOPE } from '~/lib/shared/types/scope';

describe('Authorization Middleware', () => {
  let AuthorizationModel;
  let ClientModel;
  let KeyModel;
  let UserModel;

  let authorizationId: string;
  let client_id: string;
  let connect;
  let req: NextApiRequest;
  let res: NextApiResponse;
  let sub: string;

  const client: ClientSchema = {
    name: 'Test Client',
    owner: '',
    redirect_uris: ['https://redirect.uri'],
  };

  const user: UserSchema = {
    email: 'someone-authorization@test.com',
    password: 'some test password',
  };

  afterEach(async () => {
    try {
      await connect().then(() =>
        Promise.all([
          AuthorizationModel.findByIdAndDelete(authorizationId),
          ClientModel.findByIdAndDelete(client_id),
          UserModel.findByIdAndDelete(sub),
          KeyModel.findByIdAndDelete('master'),
        ])
      );
    } finally {
      connection.close();
    }
  });

  beforeEach(async () => {
    jest.resetModules();

    const dbImports = await import('~/lib/shared/db');
    connect = dbImports.default;

    AuthorizationModel = dbImports.AuthorizationModel;
    ClientModel = dbImports.ClientModel;
    KeyModel = dbImports.KeyModel;
    UserModel = dbImports.UserModel;

    await connect()
      .then(() => UserModel.create(user))
      .then(user => {
        sub = user.get('sub');
        return ClientModel.create({ ...client, owner: sub });
      })
      .then(client => {
        client_id = client.get('client_id');
        return AuthorizationModel.create({
          scope: [SCOPE.OPENID],
          response_type: [RESPONSE_TYPE.CODE],
          client_id,
          redirect_uri: client.redirect_uris[0],
        });
      })
      .then(authorization => {
        authorizationId = authorization.get('_id');
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
      method: 'GET',
      url: '/api/authorization',
      query: {
        scope: 'openid profile',
        response_type: 'code',
        client_id,
        redirect_uri: client.redirect_uris[0],
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

  retry('should redirect to client on malformed request', 10, async () => {
    const updatedReq = {
      ...req,
      query: {
        ...req.query,
        scope: 'profile',
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const { default: authorizationMiddleware } = await import(
      '~/lib/main/authorization/middleware'
    );

    await connect().then(() => KeyModel.findByIdAndDelete('master'));
    const result = await authorizationMiddleware(updatedReq, res);

    expect(result).toBeFalsy();
    expect(res.setHeader).toHaveBeenCalledWith(
      'Location',
      `${client.redirect_uris[0]}/?error=invalid_request`
    );
  });

  retry('should redirect to /api/login without sub cookie', 10, async () => {
    const { default: authorizationMiddleware } = await import(
      '~/lib/main/authorization/middleware'
    );

    await connect().then(() => KeyModel.findByIdAndDelete('master'));
    const result = await authorizationMiddleware(req, res);

    expect(result).toBeFalsy();
    expect(res.setHeader).toHaveBeenCalledWith(
      'Location',
      '/login?redirect_to=%2Fapi%2Fauthorization'
    );
  });

  retry(
    'should redirect POST to /api/login without sub cookie',
    10,
    async () => {
      const updatedReq = {
        ...req,
        body: { ...req.query },
        method: 'POST',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      const { default: authorizationMiddleware } = await import(
        '~/lib/main/authorization/middleware'
      );

      await connect().then(() => KeyModel.findByIdAndDelete('master'));
      const result = await authorizationMiddleware(updatedReq, res);

      expect(result).toBeFalsy();
      expect(res.setHeader).toHaveBeenCalledWith(
        'Location',
        '/login?redirect_to=%2Fapi%2Fauthorization'
      );
    }
  );

  retry(
    `should redirect to /api/login even when authorization cookie present`,
    10,
    async () => {
      const updatedReq = {
        ...req,
        headers: {
          ...req.headers,
          cookie: `authorization=${authorizationId}`,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      const { default: authorizationMiddleware } = await import(
        '~/lib/main/authorization/middleware'
      );

      await connect().then(() => KeyModel.findByIdAndDelete('master'));
      const result = await authorizationMiddleware(updatedReq, res);

      expect(result).toBeFalsy();
      expect(res.setHeader).toHaveBeenCalledWith(
        'Location',
        '/login?redirect_to=%2Fapi%2Fauthorization'
      );
    }
  );

  retry(
    `should redirect to ${client.redirect_uris[0]} when sub cookie is set`,
    10,
    async () => {
      const updatedReq = {
        ...req,
        headers: {
          ...req.headers,
          cookie: `sub=${sub}`,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      const { default: authorizationMiddleware } = await import(
        '~/lib/main/authorization/middleware'
      );

      await connect().then(() => KeyModel.findByIdAndDelete('master'));
      const result = await authorizationMiddleware(updatedReq, res);

      expect(result).toBeTruthy();
      expect(res.setHeader).not.toHaveBeenCalledWith(
        'Location',
        '/login?redirect_to=%2Fapi%2Fauthorization'
      );
    }
  );
});
