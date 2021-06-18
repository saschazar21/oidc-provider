import { IncomingMessage } from 'http';
import { connection } from 'mongoose';
import MockRequest from 'mock-req';
import { encode } from 'querystring';

import { disconnect } from 'database/lib';
import { ClientSchema } from 'database/lib/schemata/client';
import { UserSchema } from 'database/lib/schemata/user';
import consentMiddleware from 'middleware/lib/consent';
import { ENDPOINT } from 'utils/lib/types/endpoint';
import { SCOPE } from 'utils/lib/types/scope';
import { RESPONSE_TYPE } from 'utils/lib/types/response_type';
import { STATUS_CODE } from 'utils/lib/types/status_code';
import { mockResponse } from 'utils/lib/util/test-utils';

describe('Consent', () => {
  let AuthorizationModel;
  let ClientModel;
  let UserModel;

  let authorizationId: string;
  let client_id: string;
  let connect;
  let req;
  let res;
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

  const body = {
    consent: true,
    redirect_to: '/',
  };

  afterAll(async () => disconnect());

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

    const dbImports = await import('database/lib');
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

    req = (config: { [key: string]: string | number }): IncomingMessage =>
      new MockRequest({
        headers: {
          cookie: `authorization=${authorizationId}; sub=${sub}`,
        },
        method: 'POST',
        url: ENDPOINT.CONSENT,
        protocol: 'https',
        ...config,
      });

    res = mockResponse();
  });

  it('validates a consent', async () => {
    let user = await connect().then(() => UserModel.findById(sub));
    let authorization = await connect().then(() =>
      AuthorizationModel.findById(authorizationId)
    );
    expect(user.get('consents')).not.toContain(client_id);
    expect(authorization.get('consent')).toBeFalsy();

    const r = req();
    r.write(encode(body));
    r.end();

    await consentMiddleware(r, res);

    expect(res.getHeader('location')).toEqual('/');
    expect(res.statusCode).toEqual(STATUS_CODE.SEE_OTHER);

    authorization = await connect().then(() =>
      AuthorizationModel.findById(authorizationId)
    );
    expect(authorization.get('consent')).toBeTruthy();

    user = await connect().then(() => UserModel.findById(sub));
    expect(user.get('consents')).toContain(client_id);
  });

  it('redirects to / when redirect_to is missing', async () => {
    const updatedReq = req();
    updatedReq.write(
      encode({
        ...body,
        redirect_to: undefined,
      })
    );
    updatedReq.end();

    await consentMiddleware(updatedReq, res);

    expect(res.getHeader('location')).toEqual('/');
    expect(res.statusCode).toEqual(STATUS_CODE.SEE_OTHER);
  });

  it('fails when no consent is given', async () => {
    const updatedReq = req();
    updatedReq.write({
      ...body,
      consent: false,
    });

    expect(consentMiddleware(updatedReq, res)).rejects.toThrowError();
  });

  it('fails when user is not logged in', async () => {
    const updatedReq = req({
      headers: {
        cookie: `authorization=${authorizationId}`,
      },
    });

    expect(consentMiddleware(updatedReq, res)).rejects.toThrowError();
  });

  it('fails when no authorization cookie is set', async () => {
    const updatedReq = req({
      headers: {
        cookie: `sub=${sub}`,
      },
    });

    expect(consentMiddleware(updatedReq, res)).rejects.toThrowError();
  });

  it('fails when invalid authorization cookie is set', async () => {
    const updatedReq = req({
      headers: {
        cookie: `authorization=not_da_real_authorization; sub=${sub}`,
      },
    });

    expect(consentMiddleware(updatedReq, res)).rejects.toThrowError();
  });
});
