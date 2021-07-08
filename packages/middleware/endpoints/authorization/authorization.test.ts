import { ServerResponse } from 'http';
import { encode, ParsedUrlQuery } from 'querystring';
import cookie from 'cookie-parse';
import { Document } from 'mongoose';
import MockRequest from 'mock-req';

import getUrl from 'config/lib/url';
import connection, {
  AuthorizationModel,
  ClientModel,
  KeyModel,
  UserModel,
} from 'database/lib';
import { disconnect } from 'database/lib/connect';
import { AuthorizationSchema } from 'database/lib/schemata/authorization';
import { ClientSchema } from 'database/lib/schemata/client';
import { UserSchema } from 'database/lib/schemata/user';
import authorizationEndpoint from 'middleware/endpoints/authorization';
import { mockResponse } from 'utils/lib/util/test-utils';
import { SCOPE } from 'utils/lib/types/scope';
import { RESPONSE_TYPE } from 'utils/lib/types/response_type';
import { METHOD } from 'utils/lib/types/method';
import { CLIENT_ENDPOINT, ENDPOINT } from 'utils/lib/types/endpoint';

describe('Authorization Endpoint', () => {
  let res: ServerResponse;

  let client: Document<ClientSchema>;
  let user: Document<UserSchema>;

  const baseClient: ClientSchema = {
    name: 'Authorization Endpoint Test Client',
    redirect_uris: ['https://authorization-endpoint-redirect.example.com'],
    owner: '',
  };

  const baseUser: UserSchema = {
    email: 'authorization-endpoint-test-user@example.com',
    password: 'testpassword',
  };

  const baseAuthorization: AuthorizationSchema = {
    client_id: '',
    scope: [SCOPE.OPENID],
    redirect_uri: baseClient.redirect_uris[0],
    response_type: [RESPONSE_TYPE.CODE],
  };

  const baseRequest = {
    method: METHOD.GET,
    protocol: 'https',
    url: ENDPOINT.AUTHORIZATION,
  };

  afterAll(async () => {
    await connection();
    await Promise.all([
      KeyModel.collection.drop(),
      AuthorizationModel.collection.drop(),
      ClientModel.findByIdAndDelete(client.get('_id')),
      UserModel.findByIdAndDelete(user.get('_id')),
    ]);
    await disconnect();
  });

  beforeAll(async () => {
    await connection()
      .then(() => UserModel.create(baseUser))
      .then((u) => {
        user = u;
        baseClient.owner = u.get('_id');
        return ClientModel.create(baseClient);
      })
      .then((c) => {
        client = c;
        baseAuthorization.client_id = c.get('_id');
        return user.update({ $push: { consents: [client.get('_id')] } });
      })
      .then(() => disconnect());
  });

  beforeEach(() => {
    res = mockResponse();
  });

  describe('Authorization Code', () => {
    let authorizationId: string;
    it('follows happy path and resolves with code query parameter', async () => {
      const req = new MockRequest({
        ...baseRequest,
        url: `${baseRequest.url}?${encode(
          baseAuthorization as unknown as ParsedUrlQuery
        )}`,
      });
      await authorizationEndpoint(req, res);

      const url = new URL(getUrl(CLIENT_ENDPOINT.LOGIN));
      url.search = encode({ redirect_to: getUrl(ENDPOINT.AUTHORIZATION) });
      expect(res.getHeader('location')).toEqual(url.toString());

      const parsed = cookie.parse(res.getHeader('set-cookie')[0]);
      expect(parsed).toHaveProperty('authorization');

      authorizationId = parsed.authorization;
    });

    it('returns Authorization code after user has been authenticated and asked for consent', async () => {
      await connection();
      await AuthorizationModel.findByIdAndUpdate(authorizationId, {
        user: user.get('_id'),
        consent: true,
      });
      await disconnect();

      const req = new MockRequest({
        ...baseRequest,
        headers: {
          cookie: `authorization=${authorizationId}; sub=${user.get('_id')}`,
        },
      });
      await authorizationEndpoint(req, res);

      const url = new URL(res.getHeader('location') as string);

      expect(`${url.protocol}//${url.hostname}`).toEqual(
        baseAuthorization.redirect_uri
      );
    });
  });
});
