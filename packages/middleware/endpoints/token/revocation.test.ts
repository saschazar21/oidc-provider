import { Document } from 'mongoose';
import MockRequest from 'mock-req';

import {
  AccessTokenModel,
  AuthorizationModel,
  ClientModel,
  RefreshTokenModel,
  UserModel,
} from '@saschazar/oidc-provider-database/lib/';
import connection, {
  disconnect,
} from '@saschazar/oidc-provider-database/lib/connect';
import { AuthorizationSchema } from '@saschazar/oidc-provider-database/lib/schemata/authorization';
import { ClientSchema } from '@saschazar/oidc-provider-database/lib/schemata/client';
import { UserSchema } from '@saschazar/oidc-provider-database/lib/schemata/user';
import {
  AccessTokenSchema,
  RefreshTokenSchema,
} from '@saschazar/oidc-provider-database/lib/schemata/token';
import tokenRevocationEndpoint from '@saschazar/oidc-provider-middleware/endpoints/token/revocation';
import { ENDPOINT } from '@saschazar/oidc-provider-types/lib/endpoint';
import { METHOD } from '@saschazar/oidc-provider-types/lib/method';
import { RESPONSE_TYPE } from '@saschazar/oidc-provider-types/lib/response_type';
import { SCOPE } from '@saschazar/oidc-provider-types/lib/scope';
import { mockResponse } from '@saschazar/oidc-provider-utils/lib/util/test-utils';
import { encode } from 'querystring';

describe('Token revocation endpoint', () => {
  let authorizationDoc: Document<AuthorizationSchema>;
  let clientDoc: Document<ClientSchema>;
  let userDoc: Document<UserSchema>;

  let res;

  const createTokens = async (): Promise<
    [Document<AccessTokenSchema>, Document<RefreshTokenSchema>]
  > => {
    await connection();
    const tokens = await Promise.all([
      AccessTokenModel.create({ authorization: authorizationDoc.get('_id') }),
      RefreshTokenModel.create({
        authorization: authorizationDoc.get('_id'),
      }),
    ]);
    await disconnect();
    return tokens;
  };

  const baseUser: UserSchema = {
    email: 'test-user-token-middleware-validator@example.com',
    password: 'testpassword',
  };

  const baseClient: ClientSchema = {
    name: 'test-client-token-middleware-validator',
    redirect_uris: ['https://redirect.uri'],
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
    protocol: 'https',
    url: ENDPOINT.TOKEN,
  };

  afterAll(async () => {
    await connection();
    await Promise.all([
      AccessTokenModel.collection.drop(),
      AuthorizationModel.collection.drop(),
      ClientModel.findByIdAndDelete(clientDoc.get('_id')),
      UserModel.findByIdAndDelete(userDoc.get('_id')),
    ]);
    await disconnect();
  });

  beforeAll(async () => {
    await connection();
    userDoc = await UserModel.create(baseUser);
    baseClient.owner = userDoc.get('_id');
    baseAuthorization.user = userDoc.get('_id');

    clientDoc = await ClientModel.create(baseClient);
    baseAuthorization.client_id = clientDoc.get('_id');
    await userDoc.update({ $addToSet: { consents: clientDoc.get('_id') } });

    authorizationDoc = await AuthorizationModel.create({
      ...baseAuthorization,
      consent: true,
    });
    await disconnect();
  });

  beforeEach(() => {
    res = mockResponse();
  });

  it('revokes an access token', async () => {
    const [accessToken] = await createTokens();

    const authorization = `Basic ${Buffer.from(
      clientDoc.get('_id') + ':' + clientDoc.get('client_secret')
    ).toString('base64')}`;
    const req = new MockRequest({
      ...baseRequest,
      headers: { authorization },
    });
    req.write(
      encode({
        token: accessToken.get('_id'),
      })
    );
    req.end();

    await tokenRevocationEndpoint(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.getHeader('Content-Length')).toBe(0);

    await connection();
    await expect(
      AccessTokenModel.findById(accessToken.get('_id'))
    ).resolves.toBeNull();
    await disconnect();
  });

  it('revokes both refresh token and access token', async () => {
    const [accessToken, refreshToken] = await createTokens();

    const authorization = `Basic ${Buffer.from(
      clientDoc.get('_id') + ':' + clientDoc.get('client_secret')
    ).toString('base64')}`;
    const req = new MockRequest({
      ...baseRequest,
      headers: { authorization },
    });
    req.write(
      encode({
        token: refreshToken.get('_id'),
      })
    );
    req.end();

    await tokenRevocationEndpoint(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.getHeader('Content-Length')).toBe(0);

    await connection();
    await expect(
      AccessTokenModel.findById(accessToken.get('_id'))
    ).resolves.toBeNull();
    await expect(
      RefreshTokenModel.findById(refreshToken.get('_id'))
    ).resolves.toBeNull();
    await disconnect();
  });

  it('throws when token_type_hint is invalid', async () => {
    const [accessToken] = await createTokens();
    const authorization = `Basic ${Buffer.from(
      clientDoc.get('_id') + ':' + clientDoc.get('client_secret')
    ).toString('base64')}`;
    const req = new MockRequest({
      ...baseRequest,
      headers: { authorization },
    });
    req.write(
      encode({
        token: accessToken.get('_id'),
        token_type_hint: 'invalid',
      })
    );
    req.end();

    await tokenRevocationEndpoint(req, res);

    expect(res.statusCode).toBe(400);
  });
});
