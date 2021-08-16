import { Document } from 'mongoose';
import MockRequest from 'mock-req';

import {
  AccessTokenModel,
  AuthorizationCodeModel,
  AuthorizationModel,
  ClientModel,
  KeyModel,
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
  AuthorizationCodeSchema,
  RefreshTokenSchema,
} from '@saschazar/oidc-provider-database/lib/schemata/token';
import tokenEndpoint from '@saschazar/oidc-provider-middleware/endpoints/token';
import { RefreshTokenEndpointPayload } from '@saschazar/oidc-provider-middleware/lib/token/validator';
import { ENDPOINT } from 'types/lib/endpoint';
import { METHOD } from 'types/lib/method';
import { RESPONSE_TYPE } from 'types/lib/response_type';
import { SCOPE } from 'types/lib/scope';
import { mockResponse } from 'utils/lib/util/test-utils';
import { encode } from 'querystring';
import { GRANT_TYPE } from 'types/lib/grant_type';

describe('Token endpoint', () => {
  let authorizationDoc: Document<AuthorizationSchema>;
  let clientDoc: Document<ClientSchema>;
  let userDoc: Document<UserSchema>;

  let res;

  const getAuthorizationCode = async (): Promise<
    Document<AuthorizationCodeSchema>
  > => {
    await connection();
    const code = await AuthorizationCodeModel.create({
      authorization: authorizationDoc.get('_id'),
    });
    await disconnect();

    return code;
  };

  const getRefreshToken = async (): Promise<Document<RefreshTokenSchema>> => {
    await connection();
    const token = await RefreshTokenModel.create({
      authorization: authorizationDoc.get('_id'),
    });
    await disconnect();
    return token;
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
      KeyModel.collection.drop(),
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

  it('creates a token set using grant_type=authorization_code', async () => {
    const authorizationCode = await getAuthorizationCode();

    const authorization = `Basic ${Buffer.from(
      clientDoc.get('_id') + ':' + clientDoc.get('client_secret')
    ).toString('base64')}`;
    const req = new MockRequest({
      ...baseRequest,
      headers: { authorization },
    });
    req.write(
      encode({
        grant_type: GRANT_TYPE.AUTHORIZATION_CODE,
        code: authorizationCode.get('_id'),
        redirect_uri: baseClient.redirect_uris[0],
      })
    );
    req.end();

    await tokenEndpoint(req, res);

    const body = res._getJSON();

    expect(res.statusCode).toBe(200);
    expect(res.getHeader('Content-Type')).toBe(
      'application/json; charset=UTF-8'
    );
    expect(res.getHeader('Pragma')).toBe('no-cache');
    expect(res.getHeader('Cache-Control')).toBe('no-store');
    expect(body).toHaveProperty('access_token');
    expect(body).toHaveProperty('refresh_token');
  });

  it('creates a token set using grant_type=refresh_token', async () => {
    const refreshToken = await getRefreshToken();

    const authorization = `Basic ${Buffer.from(
      clientDoc.get('_id') + ':' + clientDoc.get('client_secret')
    ).toString('base64')}`;
    const req = new MockRequest({
      ...baseRequest,
      headers: { authorization },
    });
    req.write(
      encode({
        grant_type: GRANT_TYPE.REFRESH_TOKEN,
        refresh_token: refreshToken.get('_id'),
      })
    );
    req.end();

    await tokenEndpoint(req, res);

    const body = res._getJSON() as RefreshTokenEndpointPayload;

    expect(res.statusCode).toBe(200);
    expect(res.getHeader('Content-Type')).toBe(
      'application/json; charset=UTF-8'
    );
    expect(res.getHeader('Pragma')).toBe('no-cache');
    expect(res.getHeader('Cache-Control')).toBe('no-store');
    expect(body).toHaveProperty('access_token');
    expect(body).toHaveProperty('refresh_token');
    expect(body.refresh_token).not.toBe(refreshToken.get('_id'));

    await connection();
    await expect(
      RefreshTokenModel.findById(refreshToken.get('_id'))
    ).resolves.toBeNull();
    await disconnect();
  });

  it('throws when refresh token grant contains invalid scope parameters', async () => {
    const refreshToken = await getRefreshToken();
    const authorization = `Basic ${Buffer.from(
      clientDoc.get('_id') + ':' + clientDoc.get('client_secret')
    ).toString('base64')}`;
    const req = new MockRequest({
      ...baseRequest,
      headers: { authorization },
    });
    req.write(
      encode({
        grant_type: GRANT_TYPE.REFRESH_TOKEN,
        refresh_token: refreshToken.get('_id'),
        scope: 'invalid',
      })
    );
    req.end();

    await tokenEndpoint(req, res);

    expect(res.statusCode).toBe(400);
  });
});
