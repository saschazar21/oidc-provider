import { Document } from 'mongoose';
import MockRequest from 'mock-req';
import { encode } from 'querystring';

import connection, {
  AuthorizationModel,
  ClientModel,
  disconnect,
  UserModel,
} from '@saschazar/oidc-provider-database/lib/';
import { AuthorizationSchema } from '@saschazar/oidc-provider-database/lib/schemata/authorization';
import { ClientSchema } from '@saschazar/oidc-provider-database/lib/schemata/client';
import { UserSchema } from '@saschazar/oidc-provider-database/lib/schemata/user';
import {
  buildAuthorizationSchema,
  getAuthenticationFlow,
  mapAuthRequest,
} from '@saschazar/oidc-provider-middleware/lib/authorization/helper';
import { ENDPOINT } from '@saschazar/oidc-provider-types/lib/endpoint';
import { SCOPE } from '@saschazar/oidc-provider-types/lib/scope';
import { RESPONSE_TYPE } from '@saschazar/oidc-provider-types/lib/response_type';
import { DISPLAY } from '@saschazar/oidc-provider-types/lib/display';
import { METHOD } from '@saschazar/oidc-provider-types/lib/method';
import { PROMPT } from '@saschazar/oidc-provider-types/lib/prompt';
import { ACR_VALUES } from '@saschazar/oidc-provider-types/lib/acr';
import { mockResponse } from '@saschazar/oidc-provider-utils/lib/util/test-utils';

describe('Authorization Helpers', () => {
  let req;
  let res;

  let client: Document<ClientSchema>;
  let user: Document<UserSchema>;

  const baseUser: UserSchema = {
    email: 'test-authorization-helper@example.com',
    password: 'testpassword',
  };

  const baseClient: ClientSchema = {
    name: 'test-authorization-helper-client',
    redirect_uris: ['https://test-authorization-helper.example.com'],
    owner: '',
  };

  const baseAuthorization: AuthorizationSchema = {
    client_id: '',
    scope: [SCOPE.OPENID],
    redirect_uri: baseClient.redirect_uris[0],
    response_type: [RESPONSE_TYPE.CODE],
  };

  const query = {
    scope: `${SCOPE.OPENID} ${SCOPE.PROFILE}`,
    response_type: `${RESPONSE_TYPE.CODE}`,
    display: `${DISPLAY.PAGE}`,
    prompt: `${PROMPT.CONSENT}`,
    ui_locales: '',
    acr_values: `${ACR_VALUES.ROOT} ${ACR_VALUES.ADVANCED}`,
  };

  beforeEach(() => {
    req = new MockRequest({
      method: METHOD.GET,
      url: `${ENDPOINT.AUTHORIZATION}?${encode(query)}`,
    });

    res = mockResponse();
  });

  describe('buildAuthorizationSchema', () => {
    afterAll(async () => {
      await connection();
      await Promise.all([
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
          return disconnect();
        });
    });

    it('should fill missing Authorization fields using database entry', async () => {
      await connection();
      const authorization = await AuthorizationModel.create(baseAuthorization);
      await disconnect();

      const auth = await buildAuthorizationSchema({
        _id: authorization.get('_id'),
      } as unknown as AuthorizationSchema);

      expect(auth).toHaveProperty(
        'redirect_uri',
        baseAuthorization.redirect_uri
      );
      expect(auth).toHaveProperty('scope', baseAuthorization.scope);
      expect(auth).toHaveProperty('_id', authorization.get('_id'));
    });

    it('should not query database when _id is missing', async () => {
      const auth = await buildAuthorizationSchema(baseAuthorization);

      expect(auth).toHaveProperty(
        'redirect_uri',
        baseAuthorization.redirect_uri
      );
      expect(auth).toHaveProperty('scope', baseAuthorization.scope);
      expect(auth).not.toHaveProperty('_id');
    });

    it('should throw when invalid _id is given', async () => {
      await expect(
        buildAuthorizationSchema({
          _id: 'I am an invalid ID',
        } as unknown as AuthorizationSchema)
      ).rejects.toThrowError();
    });
  });

  describe('getAuthenticationFlow', () => {
    it('should return AuthorizationCodeStrategy instance', () => {
      const strategy = getAuthenticationFlow(baseAuthorization);

      expect(strategy.constructor.name).toEqual('AuthorizationCodeStrategy');
    });

    it('should return ImplicitStrategy instance', () => {
      const strategy = getAuthenticationFlow({
        ...baseAuthorization,
        nonce: 'testnonce',
        response_type: [RESPONSE_TYPE.ID_TOKEN],
      });

      expect(strategy.constructor.name).toEqual('ImplicitStrategy');
    });

    it('should return HybridStrategy instance', () => {
      const strategy = getAuthenticationFlow({
        ...baseAuthorization,
        nonce: 'testnonce',
        response_type: [RESPONSE_TYPE.CODE, RESPONSE_TYPE.ID_TOKEN],
      });

      expect(strategy.constructor.name).toEqual('HybridStrategy');
    });

    it('should throw, when authentication flow could not be determined', () => {
      expect(() =>
        getAuthenticationFlow({
          ...baseAuthorization,
          nonce: 'testnonce',
          response_type: [
            RESPONSE_TYPE.TOKEN,
            RESPONSE_TYPE.CODE,
            RESPONSE_TYPE.ID_TOKEN,
          ],
        })
      ).toThrowError();
    });
  });

  describe('mapAuthRequest', () => {
    it('should map space-delimited values to array', async () => {
      const { scope, response_type, display, prompt, ui_locales, acr_values } =
        await mapAuthRequest(req, res);

      expect(scope).toHaveLength(2);
      expect(response_type).toHaveLength(1);
      expect(display).toHaveLength(1);
      expect(prompt).toHaveLength(1);
      expect(ui_locales).toHaveLength(0);
      expect(acr_values).toHaveLength(2);
    });

    it('should map POST body to JavaScript object', async () => {
      const updatedReq = new MockRequest({
        method: METHOD.POST,
        url: ENDPOINT.AUTHORIZATION,
      });
      updatedReq.write(encode(query));
      updatedReq.end();

      const { scope, response_type, display, prompt, ui_locales, acr_values } =
        await mapAuthRequest(updatedReq, res);

      expect(scope).toHaveLength(2);
      expect(response_type).toHaveLength(1);
      expect(display).toHaveLength(1);
      expect(prompt).toHaveLength(1);
      expect(ui_locales).toHaveLength(0);
      expect(acr_values).toHaveLength(2);
    });

    it('should return empty arrays when no values present', () => {
      const obj = mapAuthRequest(new MockRequest(), res);

      Object.values(obj).forEach((val: string[]) => {
        expect(val).toHaveLength(0);
      });
    });
  });
});
