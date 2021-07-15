import { ServerResponse } from 'http';
import { decode, encode, ParsedUrlQuery } from 'querystring';
import cookie from 'cookie-parse';
import { Document } from 'mongoose';
import MockRequest from 'mock-req';

import getUrl from 'config/lib/url';
import connection, {
  AccessTokenModel,
  AuthorizationCodeModel,
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
import { RESPONSE_MODE } from 'utils/lib/types/response_mode';

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

  afterAll(async () => {
    await connection();
    await Promise.all([
      AuthorizationCodeModel.collection.drop(),
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
        return user.update({ $addToSet: { consents: [client.get('_id')] } });
      })
      .then(() => disconnect());
  });

  beforeEach(() => {
    res = mockResponse();
  });

  describe('Authorization Code', () => {
    let authorizationId: string;

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

    beforeAll(() => {
      baseAuthorization.client_id = client.get('_id');
    });

    it('follows happy path and redirects to login endpoint', async () => {
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
      const payload = decode(url.search.substr(1));

      expect(`${url.protocol}//${url.hostname}`).toEqual(
        baseAuthorization.redirect_uri
      );

      await connection();
      const code = await AuthorizationCodeModel.findOne({
        authorization: authorizationId,
      });
      await disconnect();

      expect(payload).toHaveProperty('code', code.get('_id'));
    });
  });

  describe('Implicit', () => {
    let authorizationId: string;

    const baseAuthorization = {
      client_id: '',
      scope: [SCOPE.OPENID],
      redirect_uri: baseClient.redirect_uris[0],
      response_type: [RESPONSE_TYPE.ID_TOKEN, RESPONSE_TYPE.TOKEN].join(' '),
      nonce: 'testnonce',
      state: 'teststate',
    };

    const baseRequest = {
      method: METHOD.GET,
      protocol: 'https',
      url: ENDPOINT.AUTHORIZATION,
    };

    beforeAll(() => {
      baseAuthorization.client_id = client.get('_id');
    });

    it('follows happy path and redirects to login endpoint', async () => {
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

    it('returns JWT and access token after user has been authenticated and asked for consent', async () => {
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

      const payload = decode(url.hash.substr(1));

      expect(`${url.protocol}//${url.hostname}`).toEqual(
        baseAuthorization.redirect_uri
      );
      expect(payload).toHaveProperty('id_token');
      expect(payload).toHaveProperty('access_token');
      expect(payload).toHaveProperty('state', baseAuthorization.state);

      await connection();
      const token = await AccessTokenModel.findById(payload.access_token);
      await disconnect();
      expect(token.get('authorization')).toEqual(authorizationId);
    });

    it('returns JWT and access token using response_mode=form_post', async () => {
      await connection();
      const authorization = await AuthorizationModel.create({
        ...baseAuthorization,
        response_type: [RESPONSE_TYPE.ID_TOKEN, RESPONSE_TYPE.TOKEN],
        response_mode: RESPONSE_MODE.FORM_POST,
        user: user.get('_id'),
        consent: true,
      });
      await disconnect();

      const req = new MockRequest({
        ...baseRequest,
        headers: {
          cookie: `authorization=${authorization.get('_id')}; sub=${user.get(
            '_id'
          )}`,
        },
      });
      await authorizationEndpoint(req, res);
      res.end();

      expect(res.getHeader('content-type')).toEqual('text/html; charset=UTF-8');
    });
  });

  describe('Hybrid', () => {
    let authorizationId: string;

    const baseAuthorization = {
      client_id: '',
      scope: [SCOPE.OPENID],
      redirect_uri: baseClient.redirect_uris[0],
      response_type: [
        RESPONSE_TYPE.CODE,
        RESPONSE_TYPE.ID_TOKEN,
        RESPONSE_TYPE.TOKEN,
      ].join(' '),
      response_mode: RESPONSE_MODE.QUERY,
      nonce: 'testnonce',
      state: 'teststate',
    };

    const baseRequest = {
      method: METHOD.GET,
      protocol: 'https',
      url: ENDPOINT.AUTHORIZATION,
    };

    beforeAll(() => {
      baseAuthorization.client_id = client.get('_id');
    });

    it('follows happy path and redirects to login endpoint', async () => {
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

    it('returns Authorization code, JWT and access token after user has been authenticated and asked for consent', async () => {
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

      await connection();
      const code = await AuthorizationCodeModel.findOne({
        authorization: authorizationId,
      });
      await disconnect();

      const url = new URL(res.getHeader('location') as string);

      const payload = decode(url.search.substr(1));

      expect(`${url.protocol}//${url.hostname}`).toEqual(
        baseAuthorization.redirect_uri
      );

      expect(payload).toHaveProperty('code', code.get('_id'));
      expect(payload).toHaveProperty('id_token');
      expect(payload).toHaveProperty('access_token');
      expect(payload).toHaveProperty('state', baseAuthorization.state);

      await connection();
      const token = await AccessTokenModel.findById(payload.access_token);
      await disconnect();
      expect(token.get('authorization')).toEqual(authorizationId);
    });
  });
});
