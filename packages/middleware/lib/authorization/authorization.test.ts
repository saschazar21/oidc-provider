import { ServerResponse } from 'http';
import { Document } from 'mongoose';
import MockRequest from 'mock-req';
import { encode, ParsedUrlQueryInput } from 'querystring';
import { URL } from 'url';

import getUrl from 'config/lib/url';
import connection, { disconnect } from 'database/lib/connect';
import AuthorizationModel, {
  AuthorizationSchema,
} from 'database/lib/schemata/authorization';
import ClientModel, { ClientSchema } from 'database/lib/schemata/client';
import KeyModel from 'database/lib/schemata/key';
import UserModel, { UserSchema } from 'database/lib/schemata/user';
import authorizationMiddleware from 'middleware/lib/authorization';
import { AuthorizationResponse } from 'middleware/strategies/AuthStrategy';
import AuthorizationCodeStrategy, {
  AuthorizationCodeResponsePayload,
} from 'middleware/strategies/authorization-code';
import ImplicitStrategy, {
  ImplicitResponsePayload,
} from 'middleware/strategies/implicit';
import { verify } from 'utils/lib/jwt/sign';
import { CLIENT_ENDPOINT, ENDPOINT } from 'utils/lib/types/endpoint';
import { METHOD } from 'utils/lib/types/method';
import { RESPONSE_TYPE } from 'utils/lib/types/response_type';
import { SCOPE } from 'utils/lib/types/scope';
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
        $push: { consents: [clientDoc.get('_id')] },
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
      expect(result.payload).toHaveProperty('code', authorization.get('_id'));
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
      await userDoc.update({ $push: { consents: [clientDoc.get('_id')] } });
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
      await userDoc.update({ $push: { consents: [clientDoc.get('_id')] } });
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
