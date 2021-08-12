import { Document } from 'mongoose';
import MockRequest from 'mock-req';

import connection, {
  AuthorizationModel,
  AccessTokenModel,
  ClientModel,
  disconnect,
  RefreshTokenModel,
  UserModel,
} from 'database/lib';
import {
  AccessTokenSchema,
  RefreshTokenSchema,
} from 'database/lib/schemata/token';
import { AuthorizationSchema } from 'database/lib/schemata/authorization';
import { ClientSchema } from 'database/lib/schemata/client';
import { UserSchema } from 'database/lib/schemata/user';
import userinfoEndpoint from 'middleware/endpoints/userinfo';
import { SCOPE } from 'utils/lib/types/scope';
import { RESPONSE_TYPE } from 'utils/lib/types/response_type';
import { METHOD } from 'utils/lib/types/method';
import { ENDPOINT } from 'utils/lib/types/endpoint';
import { mockResponse, mockUser } from 'utils/lib/util/test-utils';

describe('Userinfo endpoint', () => {
  let authorizationDoc: Document<AuthorizationSchema>;
  let clientDoc: Document<ClientSchema>;
  let userDoc: Document<UserSchema>;

  let res;

  const createTokens = async (
    id?: string
  ): Promise<[Document<AccessTokenSchema>, Document<RefreshTokenSchema>]> => {
    await connection();
    const tokens = await Promise.all([
      AccessTokenModel.create({
        authorization: id ?? authorizationDoc.get('_id'),
      }),
      RefreshTokenModel.create({
        authorization: id ?? authorizationDoc.get('_id'),
      }),
    ]);
    await disconnect();

    return tokens;
  };

  const baseUser: UserSchema = {
    ...mockUser,
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
    method: METHOD.GET,
    https: true,
    url: ENDPOINT.USERINFO,
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

  it('should return claims from access token', async () => {
    const [accessToken] = await createTokens();

    const req = new MockRequest({
      ...baseRequest,
      headers: { authorization: `Bearer ${accessToken.get('_id')}` },
    });

    await userinfoEndpoint(req, res);

    const claims = res._getJSON();

    expect(res.statusCode).toBe(200);
    expect(claims).toMatchObject({
      sub: userDoc.get('_id'),
    });
  });

  it('should return additional claims when scope contains email', async () => {
    await connection();
    const authorization = await AuthorizationModel.create({
      ...baseAuthorization,
      scope: [SCOPE.OPENID, SCOPE.EMAIL],
    });
    await disconnect();

    const [accessToken] = await createTokens(authorization.get('_id'));

    const req = new MockRequest({
      ...baseRequest,
      headers: { authorization: `Bearer ${accessToken.get('_id')}` },
    });

    await userinfoEndpoint(req, res);

    const claims = res._getJSON();

    expect(res.statusCode).toBe(200);
    expect(claims).toMatchObject({
      email: baseUser.email,
      sub: userDoc.get('_id'),
    });
  });

  it('throws, when access token is missing in request', async () => {
    const req = new MockRequest(baseRequest);
    await userinfoEndpoint(req, res);

    const response = res._getJSON();

    expect(res.statusCode).toBe(400);
    expect(res.getHeader('www-authenticate')).toMatch(/^Bearer/);
    expect(response).toMatchObject({
      error: 'invalid_token',
    });
  });
});
