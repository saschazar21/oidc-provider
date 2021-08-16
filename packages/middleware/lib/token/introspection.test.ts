import { ServerResponse } from 'http';
import { Document } from 'mongoose';
import MockRequest from 'mock-req';

import connection, {
  AccessTokenModel,
  AuthorizationModel,
  ClientModel,
  disconnect,
  RefreshTokenModel,
  UserModel,
} from '@saschazar/oidc-provider-database/lib/';
import { AuthorizationSchema } from '@saschazar/oidc-provider-database/lib/schemata/authorization';
import { ClientSchema } from '@saschazar/oidc-provider-database/lib/schemata/client';
import { UserSchema } from '@saschazar/oidc-provider-database/lib/schemata/user';
import introspectionMiddleware from '@saschazar/oidc-provider-middleware/lib/token/introspection';
import { RESPONSE_TYPE } from 'types/lib/response_type';
import { SCOPE } from 'types/lib/scope';
import { mockResponse } from 'utils/lib/util/test-utils';
import {
  AccessTokenSchema,
  RefreshTokenSchema,
} from '@saschazar/oidc-provider-database/lib/schemata/token';
import { METHOD } from 'types/lib/method';
import { encode } from 'querystring';

describe('Token Introspection middleware', () => {
  let authorizationDoc: Document<AuthorizationSchema>;
  let clientDoc: Document<ClientSchema>;
  let userDoc: Document<UserSchema>;

  let res: ServerResponse;

  const baseUser: UserSchema = {
    email: 'test-user-token-introspection@example.com',
    password: 'testpassword',
  };

  const baseClient: ClientSchema = {
    name: 'test-client-token-introspection',
    redirect_uris: ['https://client.example.com/cb'],
    owner: '',
  };

  const baseAuthorization: AuthorizationSchema = {
    scope: [SCOPE.OPENID],
    response_type: [RESPONSE_TYPE.CODE],
    redirect_uri: baseClient.redirect_uris[0],
    client_id: '',
    user: '',
  };

  const baseRequest = {
    method: METHOD.POST,
    https: true,
    headers: {},
  };

  const createTokens = async (): Promise<
    [Document<AccessTokenSchema>, Document<RefreshTokenSchema>]
  > => {
    await connection();
    const tokens = await Promise.all([
      AccessTokenModel.create({ authorization: authorizationDoc.get('_id') }),
      RefreshTokenModel.create({ authorization: authorizationDoc.get('_id') }),
    ]);
    await disconnect();

    return tokens;
  };

  afterAll(async () => {
    await connection();
    await Promise.all([
      AccessTokenModel.collection.drop(),
      userDoc.remove(),
      clientDoc.remove(),
      authorizationDoc.remove(),
    ]);
    await disconnect();
  });

  beforeAll(async () => {
    await connection();

    await UserModel.create(baseUser)
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

  it('should return information about an access token', async () => {
    const [accessToken] = await createTokens();

    const req = new MockRequest(baseRequest);
    req.write(
      encode({
        token: accessToken.get('_id'),
        token_type_hint: 'access_token',
        client_id: clientDoc.get('_id'),
        client_secret: clientDoc.get('client_secret'),
      })
    );
    req.end();

    const payload = await introspectionMiddleware(req, res);

    expect(payload).toHaveProperty('active', true);
    expect(payload).toHaveProperty('aud', clientDoc.get('_id'));
    expect(payload).toHaveProperty(
      'exp',
      Math.floor(accessToken.get('expires_at').valueOf() / 1000)
    );
    expect(payload).toHaveProperty(
      'iat',
      Math.floor(accessToken.get('created_at').valueOf() / 1000)
    );
    expect(payload).toHaveProperty('scope', baseAuthorization.scope.join(' '));
    expect(payload).toHaveProperty('token_type', 'Bearer');
    expect(payload).toHaveProperty('sub', userDoc.get('_id'));
  });

  it('should return active: false, when token could not be found', async () => {
    const req = new MockRequest(baseRequest);
    req.write(
      encode({
        token: 'invalid',
        token_type_hint: 'access_token',
        client_id: clientDoc.get('_id'),
        client_secret: clientDoc.get('client_secret'),
      })
    );
    req.end();

    const payload = await introspectionMiddleware(req, res);

    expect(payload).toHaveProperty('active', false);
  });

  it('should return active: false, when token is inactive', async () => {
    const [accessToken] = await createTokens();
    await connection();
    await accessToken.update({ active: false });
    await disconnect();

    const req = new MockRequest(baseRequest);
    req.write(
      encode({
        token: accessToken.get('_id'),
        token_type_hint: 'access_token',
        client_id: clientDoc.get('_id'),
        client_secret: clientDoc.get('client_secret'),
      })
    );
    req.end();

    const payload = await introspectionMiddleware(req, res);

    expect(payload).toHaveProperty('active', false);
  });

  it('should return active: false, when token is a refresh token', async () => {
    const [_accessToken, refreshToken] = await createTokens();

    const req = new MockRequest(baseRequest);
    req.write(
      encode({
        token: refreshToken.get('_id'),
        token_type_hint: 'refresh_token',
        client_id: clientDoc.get('_id'),
        client_secret: clientDoc.get('client_secret'),
      })
    );
    req.end();

    const payload = await introspectionMiddleware(req, res);

    expect(payload).toHaveProperty('active', false);
  });
});
