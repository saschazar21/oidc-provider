import { ServerResponse } from 'http';
import { Document } from 'mongoose';
import MockRequest from 'mock-req';

import connection, { disconnect } from 'database/lib';
import {
  AccessTokenModel,
  AuthorizationCodeModel,
  AuthorizationCodeSchema,
  RefreshTokenModel,
} from 'database/lib/schemata/token';
import AuthorizationModel, {
  AuthorizationSchema,
} from 'database/lib/schemata/authorization';
import ClientModel, { ClientSchema } from 'database/lib/schemata/client';
import UserModel, { UserSchema } from 'database/lib/schemata/user';
import tokenMiddleware from 'middleware/lib/token';
import { SCOPE } from 'utils/lib/types/scope';
import { METHOD } from 'utils/lib/types/method';
import { ENDPOINT } from 'utils/lib/types/endpoint';
import { RESPONSE_TYPE } from 'utils/lib/types/response_type';
import { mockResponse } from 'utils/lib/util/test-utils';
import { encode } from 'querystring';
import { GRANT_TYPE } from 'utils/lib/types/grant_type';

describe('Token middleware', () => {
  let authorizationDoc: Document<AuthorizationSchema>;
  let clientDoc: Document<ClientSchema>;
  let userDoc: Document<UserSchema>;

  let res: ServerResponse;

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

  it('returns an AccessToken & RefreshToken', async () => {
    const code = await getAuthorizationCode();

    const req = new MockRequest(baseRequest);
    req.write(
      encode({
        client_id: clientDoc.get('_id'),
        client_secret: clientDoc.get('client_secret'),
        code: code.get('_id'),
        grant_type: GRANT_TYPE.AUTHORIZATION_CODE,
        redirect_uri: baseClient.redirect_uris[0],
      })
    );
    req.end();

    const response = await tokenMiddleware(req, res);
    expect(response).toHaveProperty('access_token');
    expect(response).toHaveProperty('refresh_token');

    await connection();
    const [accessToken, refreshToken] = await Promise.all([
      AccessTokenModel.findOne({ authorization: code.get('authorization') }),
      RefreshTokenModel.findOne({ authorization: code.get('authorization') }),
    ]);
    await disconnect();

    expect(accessToken.get('_id')).toEqual(response.access_token);
    expect(refreshToken.get('_id')).toEqual(response.refresh_token);
  });

  it('throws error when Authorization Code is used twice', async () => {
    const code = await getAuthorizationCode();

    const auth = Buffer.from(
      `${clientDoc.get('_id')}:${clientDoc.get('client_secret')}`
    ).toString('base64');

    const req = new MockRequest({
      ...baseRequest,
      headers: { authorization: `Basic ${auth}` },
    });

    req.write(
      encode({
        code: code.get('_id'),
        grant_type: GRANT_TYPE.AUTHORIZATION_CODE,
        redirect_uri: baseClient.redirect_uris[0],
      })
    );
    req.end();

    const payload = await tokenMiddleware(req, res);

    expect(payload).toHaveProperty('access_token');
    expect(payload).toHaveProperty('refresh_token');

    const newRes = mockResponse();
    const newReq = new MockRequest({
      ...baseRequest,
      headers: { authorization: `Basic ${auth}` },
    });

    newReq.write(
      encode({
        code: code.get('_id'),
        grant_type: GRANT_TYPE.AUTHORIZATION_CODE,
        redirect_uri: baseClient.redirect_uris[0],
      })
    );
    newReq.end();

    await expect(tokenMiddleware(newReq, newRes)).rejects.toThrowError();
  });
});
