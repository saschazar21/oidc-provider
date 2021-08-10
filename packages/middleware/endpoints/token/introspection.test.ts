import { ServerResponse } from 'http';
import { Document } from 'mongoose';
import MockRequest from 'mock-req';

import {
  AccessTokenModel,
  AuthorizationModel,
  ClientModel,
  RefreshTokenModel,
  UserModel,
} from 'database/lib';
import connection, { disconnect } from 'database/lib/connect';
import { AuthorizationSchema } from 'database/lib/schemata/authorization';
import { ClientSchema } from 'database/lib/schemata/client';
import { UserSchema } from 'database/lib/schemata/user';
import {
  AccessTokenSchema,
  RefreshTokenSchema,
} from 'database/lib/schemata/token';
import tokenIntrospectionEndpoint from 'middleware/endpoints/token/introspection';
import { IntrospectionResponsePayload } from 'middleware/lib/token/introspection';
import { ENDPOINT } from 'utils/lib/types/endpoint';
import { METHOD } from 'utils/lib/types/method';
import { RESPONSE_TYPE } from 'utils/lib/types/response_type';
import { SCOPE } from 'utils/lib/types/scope';
import { mockResponse } from 'utils/lib/util/test-utils';
import { encode } from 'querystring';

describe('Token endpoint', () => {
  let authorizationDoc: Document<AuthorizationSchema>;
  let clientDoc: Document<ClientSchema>;
  let userDoc: Document<UserSchema>;

  let res: ServerResponse & {
    _getJSON: () => IntrospectionResponsePayload;
  };

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
    res = mockResponse() as ServerResponse & {
      _getJSON: () => IntrospectionResponsePayload;
    };
  });

  it('returns information about access token', async () => {
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

    await tokenIntrospectionEndpoint(req, res);

    const body = res._getJSON();

    expect(res.statusCode).toBe(200);
    expect(res.getHeader('Content-Type')).toBe(
      'application/json; charset=UTF-8'
    );
    expect(body).toHaveProperty('active', true);
    expect(body).toHaveProperty('client_id', clientDoc.get('_id'));
    expect(body).toHaveProperty('sub', userDoc.get('_id'));
  });

  it('returns active: false, when refresh token is given', async () => {
    const [_accessToken, refreshToken] = await createTokens();

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

    await tokenIntrospectionEndpoint(req, res);

    const body = res._getJSON();

    expect(res.statusCode).toBe(200);
    expect(res.getHeader('Content-Type')).toBe(
      'application/json; charset=UTF-8'
    );
    expect(body).toHaveProperty('active', false);
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

    await expect(tokenIntrospectionEndpoint(req, res)).rejects.toThrowError();
  });
});
