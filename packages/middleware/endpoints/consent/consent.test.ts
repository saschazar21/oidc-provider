import { ServerResponse } from 'http';
import { Document } from 'mongoose';
import MockRequest from 'mock-req';

import connection, { disconnect } from 'database/lib';
import AuthorizationModel, {
  AuthorizationSchema,
} from 'database/lib/schemata/authorization';
import ClientModel, { ClientSchema } from 'database/lib/schemata/client';
import UserModel, { UserSchema } from 'database/lib/schemata/user';
import consent from 'middleware/endpoints/consent';
import { METHOD } from 'utils/lib/types/method';
import { ENDPOINT } from 'utils/lib/types/endpoint';
import { mockResponse } from 'utils/lib/util/test-utils';
import { encode } from 'querystring';
import { SCOPE } from 'utils/lib/types/scope';
import { RESPONSE_TYPE } from 'utils/lib/types/response_type';
import getUrl from 'config/lib/url';
import { ERROR_CODE } from 'utils/lib/types/error_code';

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

  it('throws, when no Authorization ID found', async () => {
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

    await expect(consent(req, res)).rejects.toThrowError();
  });

  it('throws, when invalid User ID found', async () => {
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

    await expect(consent(req, res)).rejects.toThrowError();
  });
});