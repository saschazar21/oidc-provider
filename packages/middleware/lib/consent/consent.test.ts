import { IncomingMessage } from 'http';
import MockRequest from 'mock-req';
import { encode } from 'querystring';
import { Document } from 'mongoose';

import connection, { disconnect } from '@saschazar/oidc-provider-database/lib/';
import AuthorizationModel, {
  AuthorizationSchema,
} from '@saschazar/oidc-provider-database/lib/schemata/authorization';
import ClientModel, {
  ClientSchema,
} from '@saschazar/oidc-provider-database/lib/schemata/client';
import UserModel, {
  UserSchema,
} from '@saschazar/oidc-provider-database/lib/schemata/user';
import consentMiddleware from '@saschazar/oidc-provider-middleware/lib/consent';
import { ENDPOINT } from 'types/lib/endpoint';
import { ERROR_CODE } from 'types/lib/error_code';
import { METHOD } from 'types/lib/method';
import { SCOPE } from 'types/lib/scope';
import { RESPONSE_TYPE } from 'types/lib/response_type';
import { STATUS_CODE } from 'types/lib/status_code';
import { mockResponse } from 'utils/lib/util/test-utils';

describe('Consent', () => {
  let authorizationDoc: Document<AuthorizationSchema>;
  let userDoc: Document<UserSchema>;

  let authorizationId: string;
  let client_id: string;
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

  afterAll(async () => {
    try {
      await connection().then(() =>
        Promise.all([
          AuthorizationModel.findByIdAndDelete(authorizationId),
          ClientModel.findByIdAndDelete(client_id),
          UserModel.findByIdAndDelete(sub),
        ])
      );
    } finally {
      await disconnect();
    }
  });

  beforeAll(async () => {
    await connection()
      .then(() => UserModel.create(user))
      .then((user) => {
        sub = user.get('sub');
        userDoc = user;
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
        authorizationDoc = authorization;
      })
      .then(() => disconnect());

    console.error = console.log;
  });

  beforeEach(() => {
    req = (config: { [key: string]: string | number }): IncomingMessage =>
      new MockRequest({
        headers: {
          cookie: `authorization=${authorizationId}; sub=${sub}`,
        },
        method: METHOD.POST,
        url: ENDPOINT.CONSENT,
        protocol: 'https',
        ...config,
      });

    res = mockResponse();
  });

  it('validates a consent', async () => {
    expect(userDoc.get('consents')).not.toContain(client_id);
    expect(authorizationDoc.get('consent')).toBeFalsy();

    const r = req();
    r.write(encode(body));
    r.end();

    await consentMiddleware(r, res);

    expect(res.getHeader('location')).toEqual('/');
    expect(res.statusCode).toEqual(STATUS_CODE.SEE_OTHER);

    await connection();
    const updatedUser = await UserModel.findById(sub);
    await disconnect();

    expect(updatedUser.get('consents')).toContain(client_id);
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
    updatedReq.end();

    await consentMiddleware(updatedReq, res);

    const url = new URL(authorizationDoc.get('redirect_uri'));
    url.search = encode({ error: ERROR_CODE.ACCESS_DENIED });

    expect(res.getHeader('location')).toMatch(url.toString());
  });

  it('fails when user is not logged in', async () => {
    const updatedReq = req({
      headers: {
        cookie: `authorization=${authorizationId}`,
      },
      method: METHOD.GET,
    });

    await consentMiddleware(updatedReq, res);

    const url = new URL(authorizationDoc.get('redirect_uri'));
    url.search = encode({ error: ERROR_CODE.LOGIN_REQUIRED });
    expect(res.getHeader('location')).toMatch(url.toString());
  });

  it('fails when no authorization cookie is set', async () => {
    const updatedReq = req({
      headers: {
        cookie: `sub=${sub}`,
      },
      method: METHOD.GET,
    });

    await expect(consentMiddleware(updatedReq, res)).rejects.toThrowError();
  });

  it('fails when invalid authorization cookie is set', async () => {
    const updatedReq = req({
      headers: {
        cookie: `authorization=not_da_real_authorization; sub=${sub}`,
      },
      method: METHOD.GET,
    });

    await expect(consentMiddleware(updatedReq, res)).rejects.toThrowError();
  });
});
