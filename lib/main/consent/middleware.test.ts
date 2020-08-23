import { NextApiRequest, NextApiResponse } from 'next';
import { connection } from 'mongoose';
import { mockRequest, mockResponse } from 'mock-req-res';

import { AuthorizationSchema } from '~/lib/shared/db/schemata/authorization';
import { ClientSchema } from '~/lib/shared/db/schemata/client';
import { UserSchema } from '~/lib/shared/db/schemata/user';
import { consentMiddleware } from '~/lib/main/consent';
import { SCOPE } from '~/lib/shared/types/scope';
import { RESPONSE_TYPE } from '~/lib/shared/types/response_type';

describe('Consent', () => {
  let AuthorizationModel;
  let ClientModel;
  let UserModel;

  let authorizationId: string;
  let client_id: string;
  let connect;
  let req: NextApiRequest;
  let res: NextApiResponse;
  let sub: string;

  const client: ClientSchema = {
    name: 'Test Consent Client',
    owner: '',
    redirect_uris: ['https://redirect-consent.uri'],
  };

  const user: UserSchema = {
    email: 'someone-consent@test.com',
    password: 'some test password',
  };

  afterEach(async () => {
    try {
      await connect().then(() =>
        Promise.all([
          AuthorizationModel.findByIdAndDelete(authorizationId),
          ClientModel.findByIdAndDelete(client_id),
          UserModel.findByIdAndDelete(sub),
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
    UserModel = dbImports.UserModel;

    await connect()
      .then(() => UserModel.create(user))
      .then((user) => {
        sub = user.get('sub');
        return ClientModel.create({ ...client, owner: sub });
      })
      .then((client) => {
        client_id = client.get('client_id');
        return AuthorizationModel.create({
          scope: [SCOPE.OPENID],
          response_type: [RESPONSE_TYPE.CODE],
          client_id,
          redirect_uri: client.redirect_uris[0],
        });
      })
      .then((authorization) => {
        authorizationId = authorization.get('_id');
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
      headers: {
        cookie: `authorization=${authorizationId}; sub=${sub}`,
      },
      method: 'POST',
      url: '/api/consent',
      body: {
        consent: true,
        redirect_to: '/',
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

  it('validates a consent', async () => {
    let user = await connect().then(() => UserModel.findById(sub));
    let authorization = await connect().then(() =>
      AuthorizationModel.findById(authorizationId)
    );
    expect(user.get('consents')).not.toContain(client_id);
    expect(authorization.get('consent')).toBeFalsy();

    await consentMiddleware(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Location', '/');
    expect(res.status).toHaveBeenCalledWith(303);

    authorization = await connect().then(() =>
      AuthorizationModel.findById(authorizationId)
    );
    expect(authorization.get('consent')).toBeTruthy();

    user = await connect().then(() => UserModel.findById(sub));
    expect(user.get('consents')).toContain(client_id);
  });

  it('redirects to / when redirect_to is missing', async () => {
    const updatedReq = {
      ...req,
      body: {
        ...req.body,
        redirect_to: undefined,
      },
    } as any;

    await consentMiddleware(updatedReq, res);

    expect(res.setHeader).toHaveBeenCalledWith('Location', '/');
    expect(res.status).toHaveBeenCalledWith(303);
  });

  it('fails when no consent is given', async () => {
    const updatedReq = {
      ...req,
      body: {
        ...req.body,
        consent: false,
      },
    } as any;

    expect(consentMiddleware(updatedReq, res)).rejects.toThrowError();
  });

  it('fails when user is not logged in', async () => {
    const updatedReq = {
      ...req,
      headers: {
        ...req.headers,
        cookie: `authorization=${authorizationId}`,
      },
    } as any;

    expect(consentMiddleware(updatedReq, res)).rejects.toThrowError();
  });

  it('fails when no authorization cookie is set', async () => {
    const updatedReq = {
      ...req,
      headers: {
        ...req.headers,
        cookie: `sub=${sub}`,
      },
    } as any;

    expect(consentMiddleware(updatedReq, res)).rejects.toThrowError();
  });

  it('fails when invalid authorization cookie is set', async () => {
    const updatedReq = {
      ...req,
      headers: {
        ...req.headers,
        cookie: `authorization=not_da_real_authorization; sub=${sub}`,
      },
    } as any;

    expect(consentMiddleware(updatedReq, res)).rejects.toThrowError();
  });
});
