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
} from 'database/lib';
import { AuthorizationSchema } from 'database/lib/schemata/authorization';
import { ClientSchema } from 'database/lib/schemata/client';
import { UserSchema } from 'database/lib/schemata/user';
import tokenRevocationMiddleware from 'middleware/lib/token/revocation';
import { RESPONSE_TYPE } from 'utils/lib/types/response_type';
import { SCOPE } from 'utils/lib/types/scope';
import { mockResponse } from 'utils/lib/util/test-utils';
import {
  AccessTokenSchema,
  RefreshTokenSchema,
} from 'database/lib/schemata/token';
import { encode } from 'querystring';
import { ENDPOINT } from 'utils/lib/types/endpoint';

describe('Token Revocation middleware', () => {
  let authorizationDoc: Document<AuthorizationSchema>;
  let clientDoc: Document<ClientSchema>;
  let userDoc: Document<UserSchema>;

  let res: ServerResponse;

  const baseUser: UserSchema = {
    email: 'token-revocation-test-user@example.com',
    password: 'testpassword',
  };

  const baseClient: ClientSchema = {
    name: 'test-client-token-revocation-middleware',
    redirect_uris: ['https://client.example.com/cb'],
    owner: '',
  };

  const baseAuthorization: AuthorizationSchema = {
    scope: [SCOPE.OPENID],
    redirect_uri: baseClient.redirect_uris[0],
    response_type: [RESPONSE_TYPE.CODE],
    client_id: '',
    user: '',
  };

  const baseRequest = {
    method: 'POST',
    https: true,
    headers: {},
    url: ENDPOINT.TOKEN_REVOCATION,
  };

  const createTokens = async (
    authorization?: string
  ): Promise<[Document<AccessTokenSchema>, Document<RefreshTokenSchema>]> => {
    await connection();
    const tokens = await Promise.all([
      AccessTokenModel.create({
        authorization: authorization ?? authorizationDoc.get('_id'),
      }),
      RefreshTokenModel.create({
        authorization: authorization ?? authorizationDoc.get('_id'),
      }),
    ]);
    await disconnect();
    return tokens;
  };

  afterAll(async () => {
    await connection();
    await Promise.all([
      AccessTokenModel.collection.drop(),
      AuthorizationModel.findByIdAndDelete(authorizationDoc.get('_id')),
      UserModel.findByIdAndDelete(userDoc.get('_id')),
      ClientModel.findByIdAndDelete(clientDoc.get('_id')),
    ]);
    await disconnect();
  });

  beforeAll(async () => {
    await connection();
    await UserModel.create(baseUser)
      .then((u) => {
        userDoc = u;
        baseAuthorization.user = u.get('_id');
        baseClient.owner = u.get('_id');
        return ClientModel.create(baseClient);
      })
      .then((c) => {
        clientDoc = c;
        baseAuthorization.client_id = c.get('_id');
        return AuthorizationModel.create(baseAuthorization);
      })
      .then((a) => {
        authorizationDoc = a;
      });
    await disconnect();
  });

  beforeEach(() => {
    res = mockResponse();
  });

  it('revokes refresh token and access token at once', async () => {
    const [accessToken, refreshToken] = await createTokens();

    const req = new MockRequest({
      ...baseRequest,
      headers: {
        authorization:
          'Basic ' +
          Buffer.from(
            `${clientDoc.get('_id')}:${clientDoc.get('client_secret')}`
          ).toString('base64'),
      },
    });
    req.write(
      encode({
        token: refreshToken.get('_id'),
        token_type_hint: 'refresh_token',
      })
    );
    req.end();

    const result = await tokenRevocationMiddleware(req, res);

    expect(result).toBeTruthy();

    await connection();
    const accessTokenDoc = await AccessTokenModel.findById(
      accessToken.get('_id')
    );
    const refreshTokenDoc = await RefreshTokenModel.findById(
      refreshToken.get('_id')
    );
    await disconnect();

    expect(accessTokenDoc).toBeNull();
    expect(refreshTokenDoc).toBeNull();
  });

  it('revokes access token, but leaves refresh token unchanged', async () => {
    const [accessToken, refreshToken] = await createTokens();

    const req = new MockRequest({
      ...baseRequest,
      headers: {
        authorization:
          'Basic ' +
          Buffer.from(
            `${clientDoc.get('_id')}:${clientDoc.get('client_secret')}`
          ).toString('base64'),
      },
    });
    req.write(
      encode({
        token: accessToken.get('_id'),
        token_type_hint: 'access_token',
      })
    );
    req.end();

    const result = await tokenRevocationMiddleware(req, res);

    expect(result).toBeTruthy();

    await connection();
    const accessTokenDoc = await AccessTokenModel.findById(
      accessToken.get('_id')
    );
    const refreshTokenDoc = await RefreshTokenModel.findById(
      refreshToken.get('_id')
    );
    await disconnect();

    expect(accessTokenDoc).toBeNull();
    expect(refreshTokenDoc.get('authorization')).toEqual(
      authorizationDoc.get('_id')
    );
  });

  it('returns false even when invalid token was given', async () => {
    const req = new MockRequest({
      ...baseRequest,
      headers: {
        authorization:
          'Basic ' +
          Buffer.from(
            `${clientDoc.get('_id')}:${clientDoc.get('client_secret')}`
          ).toString('base64'),
      },
    });
    req.write(
      encode({
        token: 'invalid',
        token_type_hint: 'refresh_token',
      })
    );
    req.end();

    const result = await tokenRevocationMiddleware(req, res);

    expect(result).toBeTruthy();
  });
});
