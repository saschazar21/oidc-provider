import { ServerResponse } from 'http';
import { Document } from 'mongoose';
import MockRequest from 'mock-req';
import { encode, ParsedUrlQueryInput } from 'querystring';
import { URL } from 'url';

import getUrl from 'config/lib/url';
import connection, {
  disconnect,
} from '@saschazar/oidc-provider-database/lib/connect';
import AuthorizationModel, {
  AuthorizationSchema,
} from '@saschazar/oidc-provider-database/lib/schemata/authorization';
import ClientModel, {
  ClientSchema,
} from '@saschazar/oidc-provider-database/lib/schemata/client';
import KeyModel from '@saschazar/oidc-provider-database/lib/schemata/key';
import { AuthorizationCodeModel } from '@saschazar/oidc-provider-database/lib/schemata/token';
import UserModel, {
  UserSchema,
} from '@saschazar/oidc-provider-database/lib/schemata/user';
import authorizationMiddleware from '@saschazar/oidc-provider-middleware/lib/authorization';
import { AuthorizationResponse } from '@saschazar/oidc-provider-middleware/strategies/AuthStrategy';
import AuthorizationCodeStrategy, {
  AuthorizationCodeResponsePayload,
} from '@saschazar/oidc-provider-middleware/strategies/authorization-code';
import ImplicitStrategy, {
  ImplicitResponsePayload,
} from '@saschazar/oidc-provider-middleware/strategies/implicit';
import { verify } from 'utils/lib/jwt/sign';
import { CLIENT_ENDPOINT, ENDPOINT } from 'types/lib/endpoint';
import { METHOD } from 'types/lib/method';
import { PROMPT } from 'types/lib/prompt';
import { RESPONSE_TYPE } from 'types/lib/response_type';
import { SCOPE } from 'types/lib/scope';
import { mockResponse } from 'utils/lib/util/test-utils';

describe('Authorization Middleware', () => {
  let res: ServerResponse;

  let clientDoc: Document<ClientSchema>;
  let userDoc: Document<UserSchema>;

  const client: ClientSchema = {
    name: 'Test Client',
    owner: '',
    redirect_uris: ['https://redirect.uri'],
  };

  const user: UserSchema = {
    email: 'someone-authorization@test.com',
    password: 'some test password',
  };

  const baseAuthorization: AuthorizationSchema = {
    scope: [SCOPE.OPENID],
    response_type: [RESPONSE_TYPE.CODE],
    client_id: '',
    redirect_uri: client.redirect_uris[0],
  };

  const baseRequest = {
    method: METHOD.GET,
    protocol: 'https',
    url: ENDPOINT.AUTHORIZATION,
  };

  afterAll(async () => {
    try {
      await connection().then(() =>
        Promise.all([
          KeyModel.collection.drop(),
          AuthorizationModel.collection.drop(),
          ClientModel.findByIdAndDelete(clientDoc.get('_id')),
          UserModel.findByIdAndDelete(userDoc.get('_id')),
        ])
      );
    } finally {
      await disconnect();
    }
  });

  beforeAll(async () => {
    await connection()
      .then(() => UserModel.create(user))
      .then((user) => {
        userDoc = user;
        client.owner = user.get('sub');
        return ClientModel.create({ ...client });
      })
      .then((client) => {
        clientDoc = client;
        baseAuthorization.client_id = client.get('_id');
      });
    await disconnect();
  });

  beforeEach(async () => {
    res = mockResponse();
  });

  describe('Authorization Code Flow', () => {
    it('should return HTTP Status 400 when redirect_uri omitted', async () => {
      const { redirect_uri, ...customQuery } = baseAuthorization;

      const updatedReq = new MockRequest({
        ...baseRequest,
        url: `${ENDPOINT.AUTHORIZATION}?${encode(
          customQuery as unknown as ParsedUrlQueryInput
        )}`,
      });

      await expect(
        authorizationMiddleware(updatedReq, res)
      ).rejects.toThrowError();
    });

    it('should redirect to client on malformed request', async () => {
      const customQuery = {
        ...baseAuthorization,
        scope: 'profile',
      };

      const updatedReq = new MockRequest({
        ...baseRequest,
        url: `${ENDPOINT.AUTHORIZATION}?${encode(
          customQuery as unknown as ParsedUrlQueryInput
        )}`,
      });
      const result = await authorizationMiddleware(updatedReq, res);

      expect(result).toBeFalsy();
      expect(new URL(res.getHeader('location') as string).hostname).toEqual(
        new URL(client.redirect_uris[0]).hostname
      );
    });

    it(`should redirect to login endpoint without sub cookie`, async () => {
      const query = encode(baseAuthorization as unknown as ParsedUrlQueryInput);

      const updatedReq = new MockRequest({
        ...baseRequest,
        method: METHOD.GET,
        url: `${ENDPOINT.AUTHORIZATION}?${query}`,
      });

      const result = await authorizationMiddleware(updatedReq, res);

      expect(result).toBeFalsy();
      expect(res.getHeader('location')).toEqual(
        getUrl(
          `${CLIENT_ENDPOINT.LOGIN}?${encode({
            redirect_to: getUrl(ENDPOINT.AUTHORIZATION),
          })}`
        )
      );
    });

    it(`should redirect POST to login endpoint without sub cookie`, async () => {
      const updatedReq = new MockRequest({
        ...baseRequest,
        method: METHOD.POST,
      });
      updatedReq.write(
        encode(baseAuthorization as unknown as ParsedUrlQueryInput)
      );
      updatedReq.end();

      const result = await authorizationMiddleware(updatedReq, res);

      expect(result).toBeFalsy();
      expect(res.getHeader('location')).toEqual(
        getUrl(
          `${CLIENT_ENDPOINT.LOGIN}?${encode({
            redirect_to: getUrl(ENDPOINT.AUTHORIZATION),
          })}`
        )
      );
    });

    it(`should redirect to login endpoint even when authorization cookie present`, async () => {
      await connection();
      const authorization = await AuthorizationModel.create(baseAuthorization);
      await disconnect();

      const updatedReq = new MockRequest({
        ...baseRequest,
        headers: {
          cookie: `authorization=${authorization.get('_id')}`,
        },
      });

      const result = await authorizationMiddleware(updatedReq, res);

      expect(result).toBeFalsy();
      expect(res.getHeader('location')).toEqual(
        getUrl(
          `${CLIENT_ENDPOINT.LOGIN}?${encode({
            redirect_to: getUrl(ENDPOINT.AUTHORIZATION),
          })}`
        )
      );
    });

    it(`should redirect to consent endpoint when sub cookie is set, but no consent given`, async () => {
      const uri = new URL(getUrl(ENDPOINT.AUTHORIZATION));
      uri.search = encode(baseAuthorization as unknown as ParsedUrlQueryInput);

      const updatedReq = new MockRequest({
        ...baseRequest,
        headers: {
          cookie: `sub=${userDoc.get('_id')}`,
        },
        url: uri.toString(),
      });

      const result = await authorizationMiddleware(updatedReq, res);

      expect(result).toBeFalsy();
      expect(res.getHeader('location')).toEqual(
        getUrl(
          `${CLIENT_ENDPOINT.CONSENT}?${encode({
            redirect_to: getUrl(ENDPOINT.AUTHORIZATION),
          })}`
        )
      );
    });

    it('should return a response payload object, when user & consent property set in Authorization', async () => {
      await connection();
      await userDoc.update({
        $addToSet: { consents: [clientDoc.get('_id')] },
      });
      const authorization = await AuthorizationModel.create({
        ...baseAuthorization,
        user: userDoc.get('_id'),
        consent: true,
      });
      await disconnect();

      const updatedReq = new MockRequest({
        ...baseRequest,
        headers: {
          cookie: `authorization=${authorization.get('_id')}`,
        },
      });

      const result = (await authorizationMiddleware(
        updatedReq,
        res
      )) as AuthorizationResponse<AuthorizationCodeResponsePayload>;

      expect(result).toHaveProperty('redirect_uri', client.redirect_uris[0]);
      expect(result).toHaveProperty(
        'response_mode',
        AuthorizationCodeStrategy.DEFAULT_RESPONSE_MODE
      );
      await connection();
      const code = await AuthorizationCodeModel.findOne({
        authorization: authorization.get('_id'),
      });
      await disconnect();
      expect(result.payload).toHaveProperty('code', code.get('_id'));
    });

    it('should redirect to login, when prompt=login, although user is authenticated', async () => {
      const updatedAuthorization = {
        ...baseAuthorization,
        prompt: [PROMPT.LOGIN],
      };

      const updatedReq = new MockRequest({
        ...baseRequest,
        method: METHOD.POST,
        headers: {
          cookie: `user=${userDoc.get('_id')}`,
        },
      });
      updatedReq.write(
        encode(updatedAuthorization as unknown as ParsedUrlQueryInput)
      );
      updatedReq.end();

      const result = await authorizationMiddleware(updatedReq, res);

      expect(result).toBeFalsy();
      expect(res.getHeader('location')).toMatch(getUrl(CLIENT_ENDPOINT.LOGIN));
    });

    it('should redirect to consent, when prompt=consent, although user has given consent', async () => {
      const updatedAuthorization = {
        ...baseAuthorization,
        prompt: [PROMPT.CONSENT],
      };

      const updatedReq = new MockRequest({
        ...baseRequest,
        method: METHOD.POST,
        headers: {
          cookie: `user=${userDoc.get('_id')}`,
        },
      });
      updatedReq.write(
        encode(updatedAuthorization as unknown as ParsedUrlQueryInput)
      );
      updatedReq.end();

      const result = await authorizationMiddleware(updatedReq, res);

      expect(result).toBeFalsy();
      expect(res.getHeader('location')).toMatch(
        getUrl(CLIENT_ENDPOINT.CONSENT)
      );
    });

    it('should redirect to redirect_uri when invalid prompt is given', async () => {
      const updatedAuthorization = {
        ...baseAuthorization,
        prompt: [PROMPT.NONE, PROMPT.LOGIN].join(' '),
      };

      const updatedReq = new MockRequest({
        ...baseRequest,
        method: METHOD.POST,
      });
      updatedReq.write(
        encode(updatedAuthorization as unknown as ParsedUrlQueryInput)
      );
      updatedReq.end();

      const result = await authorizationMiddleware(updatedReq, res);

      expect(result).toBeFalsy();
      expect(res.getHeader('location')).toMatch(client.redirect_uris[0]);
    });

    it('should redirect to redirect_uri when no user is authenticated and prompt=none', async () => {
      const updatedAuthorization = {
        ...baseAuthorization,
        prompt: PROMPT.NONE,
      };

      const updatedReq = new MockRequest({
        ...baseRequest,
        method: METHOD.POST,
      });
      updatedReq.write(
        encode(updatedAuthorization as unknown as ParsedUrlQueryInput)
      );
      updatedReq.end();

      const result = await authorizationMiddleware(updatedReq, res);

      expect(result).toBeFalsy();
      expect(res.getHeader('location')).toMatch(client.redirect_uris[0]);
    });

    it('should redirect to redirect_uri when user is authenticated, has not consented and prompt=none', async () => {
      await connection();
      await userDoc.update({ consents: [] });
      await disconnect();

      const updatedAuthorization = {
        ...baseAuthorization,
        prompt: PROMPT.NONE,
      };

      const updatedReq = new MockRequest({
        ...baseRequest,
        headers: {
          cookie: `user=${userDoc.get('_id')}`,
        },
        method: METHOD.POST,
        protocol: 'https',
      });
      updatedReq.write(
        encode(updatedAuthorization as unknown as ParsedUrlQueryInput)
      );
      updatedReq.end();

      const result = await authorizationMiddleware(updatedReq, res);

      expect(result).toBeFalsy();
      expect(res.getHeader('location')).toMatch(client.redirect_uris[0]);
    });
  });

  describe('Implicit Flow', () => {
    const baseAuthorization: AuthorizationSchema = {
      scope: [SCOPE.OPENID],
      response_type: [RESPONSE_TYPE.ID_TOKEN],
      client_id: '',
      redirect_uri: client.redirect_uris[0],
    };

    it('should return a response payload object, when user & consent property set in Authorization', async () => {
      await connection();
      await userDoc.update({ $addToSet: { consents: [clientDoc.get('_id')] } });
      const authorization = await AuthorizationModel.create({
        ...baseAuthorization,
        client_id: clientDoc.get('_id'),
        user: userDoc.get('_id'),
        consent: true,
        nonce: 'testnonce',
        state: 'teststate',
      });
      await disconnect();

      const updatedReq = new MockRequest({
        ...baseRequest,
        headers: {
          cookie: `authorization=${authorization.get('_id')}`,
        },
      });

      const result = (await authorizationMiddleware(
        updatedReq,
        res
      )) as AuthorizationResponse<ImplicitResponsePayload>;

      expect(result).toHaveProperty('redirect_uri', client.redirect_uris[0]);
      expect(result).toHaveProperty(
        'response_mode',
        ImplicitStrategy.DEFAULT_RESPONSE_MODE
      );
      expect(result.payload).toHaveProperty('id_token');
      expect(result.payload).toHaveProperty(
        'state',
        authorization.get('state')
      );

      const jwt = await verify(result.payload.id_token);

      expect(jwt).toHaveProperty('nonce', authorization.get('nonce'));
    });

    it('should redirect with error message when nonce is omitted', async () => {
      await connection();
      await userDoc.update({ $addToSet: { consents: [clientDoc.get('_id')] } });
      const authorization = await AuthorizationModel.create({
        ...baseAuthorization,
        client_id: clientDoc.get('_id'),
        user: userDoc.get('_id'),
        consent: true,
      });
      await disconnect();

      const updatedReq = new MockRequest({
        ...baseRequest,
        headers: {
          cookie: `authorization=${authorization.get('_id')}`,
        },
      });

      const result = await authorizationMiddleware(updatedReq, res);

      expect(result).toBeFalsy();

      const redirect_uri = new URL(authorization.get('redirect_uri'));
      expect(new URL(res.getHeader('location') as string).hostname).toEqual(
        redirect_uri.hostname
      );
    });
  });
});
