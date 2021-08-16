import { ServerResponse } from 'http';
import { Document } from 'mongoose';
import MockRequest from 'mock-req';

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
import consent from '@saschazar/oidc-provider-middleware/endpoints/consent';
import { METHOD } from 'types/lib/method';
import { ENDPOINT } from 'types/lib/endpoint';
import { mockResponse } from 'utils/lib/util/test-utils';
import { encode } from 'querystring';
import { SCOPE } from 'types/lib/scope';
import { RESPONSE_TYPE } from 'types/lib/response_type';
import getUrl from 'config/lib/url';
import { ERROR_CODE } from 'types/lib/error_code';

describe('Consent endpoint', () => {
  let authorizationDoc: Document<AuthorizationSchema>;
  let userDoc: Document<UserSchema>;
  let clientDoc: Document<ClientSchema>;
  let res: ServerResponse;

  const baseUser: UserSchema = {
    email: 'test-consent-endpoint@example.com',
    password: 'testpassword',
  };

  const baseClient: ClientSchema = {
    name: 'consent-endpoint-test-client',
    redirect_uris: ['https://redirect.uri'],
    owner: '',
  };

  const baseAuthorization: AuthorizationSchema = {
    scope: [SCOPE.OPENID],
    response_type: [RESPONSE_TYPE.CODE],
    user: '',
    client_id: '',
    redirect_uri: baseClient.redirect_uris[0],
  };

  const baseRequest = {
    method: METHOD.POST,
    protocol: 'https',
    url: ENDPOINT.CONSENT,
  };

  afterAll(async () => {
    await connection();
    await Promise.all([
      AuthorizationModel.collection.drop(),
      ClientModel.findByIdAndDelete(clientDoc.get('_id')),
      UserModel.findByIdAndDelete(userDoc.get('_id')),
    ]);
    await disconnect();
  });

  beforeAll(async () => {
    await connection()
      .then(() => UserModel.create(baseUser))
      .then((u) => {
        userDoc = u;
        baseClient.owner = u.get('_id');
        baseAuthorization.user = u.get('_id');
        return ClientModel.create(baseClient);
      })
      .then((c) => {
        clientDoc = c;
        baseAuthorization.client_id = c.get('_id');
        return AuthorizationModel.create(baseAuthorization);
      })
      .then((a) => {
        authorizationDoc = a;
        return disconnect();
      });
  });

  beforeEach(() => {
    res = mockResponse();
  });

  it('follows happy path and redirects to authorization endpoint', async () => {
    const userId = userDoc.get('_id');
    const authorizationId = authorizationDoc.get('_id');
    const req = new MockRequest({
      ...baseRequest,
      headers: {
        cookie: `user=${userId}; authorization=${authorizationId}`,
      },
    });

    req.write(
      encode({
        consent: true,
        redirect_to: getUrl(ENDPOINT.AUTHORIZATION),
      })
    );

    req.end();

    await consent(req, res);

    expect(res.getHeader('location')).toEqual(getUrl(ENDPOINT.AUTHORIZATION));

    await connection();
    const u = await UserModel.findById(userDoc.get('_id'));
    await disconnect();

    expect(u.get('consents').includes(clientDoc.get('_id'))).toEqual(true);
  });

  it('redirects to redirect_uri if consent was denied', async () => {
    const userId = userDoc.get('_id');
    const authorizationId = authorizationDoc.get('_id');
    const req = new MockRequest({
      ...baseRequest,
      headers: {
        cookie: `user=${userId}; authorization=${authorizationId}`,
      },
    });

    req.write(
      encode({
        consent: false,
        redirect_to: getUrl(ENDPOINT.AUTHORIZATION),
      })
    );

    req.end();

    await consent(req, res);

    const url = new URL(authorizationDoc.get('redirect_uri'));
    url.search = encode({
      error: ERROR_CODE.ACCESS_DENIED,
    });

    expect(res.getHeader('location')).toMatch(url.toString());
  });

  it('returns HTTP error code, when no User ID found', async () => {
    const authorizationId = authorizationDoc.get('_id');
    const req = new MockRequest({
      ...baseRequest,
      headers: {
        cookie: `authorization=${authorizationId}`,
      },
    });

    req.write(
      encode({
        consent: true,
        redirect_to: getUrl(ENDPOINT.AUTHORIZATION),
      })
    );

    req.end();

    await consent(req, res);

    const url = new URL(authorizationDoc.get('redirect_uri'));
    url.search = encode({ error: ERROR_CODE.LOGIN_REQUIRED });

    expect(res.getHeader('location')).toMatch(url.toString());
  });

  it('returns 400, when no Authorization ID found', async () => {
    const userId = userDoc.get('_id');
    const req = new MockRequest({
      ...baseRequest,
      headers: {
        cookie: `user=${userId}`,
      },
    });

    req.write(
      encode({
        consent: true,
        redirect_to: getUrl(ENDPOINT.AUTHORIZATION),
      })
    );

    req.end();

    await consent(req, res);

    expect(res.statusCode).toEqual(400);
  });

  it('returns 500, when invalid User ID found', async () => {
    const authorizationId = authorizationDoc.get('_id');
    const req = new MockRequest({
      ...baseRequest,
      headers: {
        cookie: `user=invalid; authorization=${authorizationId}`,
      },
    });

    req.write(
      encode({
        consent: true,
        redirect_to: getUrl(ENDPOINT.AUTHORIZATION),
      })
    );

    req.end();

    await consent(req, res);

    expect(res.statusCode).toEqual(500);
  });
});
