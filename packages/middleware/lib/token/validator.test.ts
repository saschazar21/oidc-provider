import { ServerResponse } from 'http';
import { Document } from 'mongoose';
import MockRequest from 'mock-req';
import pkce from 'pkce-challenge';

import connection, { disconnect } from 'database/lib';
import {
  AuthorizationCodeModel,
  AuthorizationCodeSchema,
} from 'database/lib/schemata/token';
import AuthorizationModel, {
  AuthorizationSchema,
} from 'database/lib/schemata/authorization';
import ClientModel, { ClientSchema } from 'database/lib/schemata/client';
import UserModel, { UserSchema } from 'database/lib/schemata/user';
import tokenMiddlewareValidator from 'middleware/lib/token/validator';
import { SCOPE } from 'utils/lib/types/scope';
import { METHOD } from 'utils/lib/types/method';
import { ENDPOINT } from 'utils/lib/types/endpoint';
import { RESPONSE_TYPE } from 'utils/lib/types/response_type';
import { mockResponse } from 'utils/lib/util/test-utils';
import { encode } from 'querystring';
import { GRANT_TYPE } from 'utils/lib/types/grant_type';

describe('Token middleware validator', () => {
  let authorizationDoc: Document<AuthorizationSchema>;
  let clientDoc: Document<ClientSchema>;
  let userDoc: Document<UserSchema>;

  let res: ServerResponse;

  const getAuthorizationCode = async (
    id?: string
  ): Promise<Document<AuthorizationCodeSchema>> => {
    await connection();
    const code = await AuthorizationCodeModel.create({
      authorization: id ?? authorizationDoc.get('_id'),
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
      AuthorizationCodeModel.collection.drop(),
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

  it('validates an Access Token request', async () => {
    const code = await getAuthorizationCode();

    const req = new MockRequest(baseRequest);
    req.write(
      encode({
        grant_type: GRANT_TYPE.AUTHORIZATION_CODE,
        client_id: clientDoc.get('_id'),
        client_secret: clientDoc.get('client_secret'),
        code: code.get('_id'),
        redirect_uri: baseClient.redirect_uris[0],
      })
    );
    req.end();

    const result = await tokenMiddlewareValidator(req, res);

    await connection();
    const c = await AuthorizationCodeModel.findById(code.get('_id')).populate({
      path: 'authorization',
      populate: 'client_id',
    });
    await disconnect();

    expect(result.code).toEqual(c.get('_id'));
    expect(c.get('authorization').get('client_id').get('_id')).toEqual(
      result.client_id
    );
  });

  it('validates an Access Token request using PKCE', async () => {
    const { code_challenge, code_verifier } = pkce();

    await connection();
    const auth = await AuthorizationModel.create({
      ...baseAuthorization,
      consent: true,
      code_challenge,
      code_challenge_method: 'S256',
    });
    await disconnect();

    const code = await getAuthorizationCode(auth.get('_id'));

    const req = new MockRequest(baseRequest);
    req.write(
      encode({
        grant_type: GRANT_TYPE.AUTHORIZATION_CODE,
        client_id: clientDoc.get('_id'),
        client_secret: clientDoc.get('client_secret'),
        code: code.get('_id'),
        redirect_uri: baseClient.redirect_uris[0],
        code_verifier,
      })
    );
    req.end();

    const result = await tokenMiddlewareValidator(req, res);

    await connection();
    const c = await AuthorizationCodeModel.findById(code.get('_id')).populate({
      path: 'authorization',
      populate: 'client_id',
    });
    await disconnect();

    expect(result.code).toEqual(c.get('_id'));
    expect(c.get('authorization').get('client_id').get('_id')).toEqual(
      result.client_id
    );
  });

  it('throws, when grant_type is invalid', async () => {
    const req = new MockRequest(baseRequest);
    req.write(encode({ grant_type: 'invalid' }));
    req.end();

    await expect(tokenMiddlewareValidator(req, res)).rejects.toThrowError();
  });

  it('throws, when code is missing', async () => {
    const req = new MockRequest(baseRequest);
    req.write(encode({ grant_type: GRANT_TYPE.AUTHORIZATION_CODE }));
    req.end();

    await expect(tokenMiddlewareValidator(req, res)).rejects.toThrowError();
  });

  it('throws, when code is invalid', async () => {
    const req = new MockRequest(baseRequest);
    req.write(
      encode({
        grant_type: GRANT_TYPE.AUTHORIZATION_CODE,
        client_id: clientDoc.get('_id'),
        client_secret: clientDoc.get('client_secret'),
        code: 'invalid',
        redirect_uri: baseClient.redirect_uris[0],
      })
    );
    req.end();

    await expect(tokenMiddlewareValidator(req, res)).rejects.toThrowError();
  });

  it('throws when redirect_uri is missing', async () => {
    const req = new MockRequest(baseRequest);
    req.write(
      encode({
        grant_type: GRANT_TYPE.AUTHORIZATION_CODE,
        client_id: clientDoc.get('_id'),
        client_secret: clientDoc.get('client_secret'),
        code: 'invalid',
      })
    );
    req.end();

    await expect(tokenMiddlewareValidator(req, res)).rejects.toThrowError();
  });

  it('throws when client_id is missing', async () => {
    const req = new MockRequest(baseRequest);
    req.write(
      encode({
        grant_type: GRANT_TYPE.AUTHORIZATION_CODE,
        client_secret: clientDoc.get('client_secret'),
        code: 'invalid',
        redirect_uri: baseClient.redirect_uris[0],
      })
    );
    req.end();

    await expect(tokenMiddlewareValidator(req, res)).rejects.toThrowError();
  });

  it('throws when redirect_uri differs', async () => {
    const code = await getAuthorizationCode();

    const req = new MockRequest(baseRequest);
    req.write(
      encode({
        grant_type: GRANT_TYPE.AUTHORIZATION_CODE,
        client_id: clientDoc.get('_id'),
        client_secret: clientDoc.get('client_secret'),
        code: code.get('_id'),
        redirect_uri: 'https://other.uri',
      })
    );
    req.end();

    await expect(tokenMiddlewareValidator(req, res)).rejects.toThrowError();
  });

  it('throws, when client_id differs', async () => {
    const code = await getAuthorizationCode();

    const req = new MockRequest(baseRequest);
    req.write(
      encode({
        grant_type: GRANT_TYPE.AUTHORIZATION_CODE,
        client_id: 'other-client',
        client_secret: clientDoc.get('client_secret'),
        code: code.get('_id'),
        redirect_uri: baseClient.redirect_uris[0],
      })
    );
    req.end();

    await expect(tokenMiddlewareValidator(req, res)).rejects.toThrowError();
  });

  it('throws, when client_secret & code_verifier are missing', async () => {
    const code = await getAuthorizationCode();

    const req = new MockRequest(baseRequest);
    req.write(
      encode({
        grant_type: GRANT_TYPE.AUTHORIZATION_CODE,
        client_id: clientDoc.get('_id'),
        code: code.get('_id'),
        redirect_uri: baseClient.redirect_uris[0],
      })
    );
    req.end();

    await expect(tokenMiddlewareValidator(req, res)).rejects.toThrowError();
  });

  it('throws when client_secret differs', async () => {
    const code = await getAuthorizationCode();

    const req = new MockRequest(baseRequest);
    req.write(
      encode({
        grant_type: GRANT_TYPE.AUTHORIZATION_CODE,
        client_id: clientDoc.get('_id'),
        client_secret: 'other-secret',
        code: code.get('_id'),
        redirect_uri: baseClient.redirect_uris[0],
      })
    );
    req.end();

    await expect(tokenMiddlewareValidator(req, res)).rejects.toThrowError();
  });

  it('throws, when code_verifier is invalid', async () => {
    const { code_challenge, code_verifier } = pkce();

    await connection();
    const auth = await AuthorizationModel.create({
      ...baseAuthorization,
      code_challenge,
      code_challenge_method: 'S256',
      consent: true,
    });
    await disconnect();

    const code = await getAuthorizationCode(auth.get('_id'));

    const req = new MockRequest(baseRequest);
    req.write(
      encode({
        grant_type: GRANT_TYPE.AUTHORIZATION_CODE,
        client_id: clientDoc.get('_id'),
        code: code.get('_id'),
        code_verifier: `123${code_verifier.substr(3)}`,
        redirect_uri: baseClient.redirect_uris[0],
      })
    );
    req.end();

    await expect(tokenMiddlewareValidator(req, res)).rejects.toThrowError();
  });

  it('throws, when code_verifier has an invalid format', async () => {
    const { code_challenge } = pkce();

    await connection();
    const auth = await AuthorizationModel.create({
      ...baseAuthorization,
      code_challenge,
      code_challenge_method: 'S256',
      consent: true,
    });
    await disconnect();

    const code = await getAuthorizationCode(auth.get('_id'));

    const req = new MockRequest(baseRequest);
    req.write(
      encode({
        grant_type: GRANT_TYPE.AUTHORIZATION_CODE,
        client_id: clientDoc.get('_id'),
        code: code.get('_id'),
        code_verifier: 'invalid',
        redirect_uri: baseClient.redirect_uris[0],
      })
    );
    req.end();

    await expect(tokenMiddlewareValidator(req, res)).rejects.toThrowError();
  });

  it('throws, when no consent was given', async () => {
    await connection();
    const auth = await AuthorizationModel.create(baseAuthorization);
    await disconnect();

    const code = await getAuthorizationCode(auth.get('_id'));

    const req = new MockRequest(baseRequest);
    req.write(
      encode({
        grant_type: GRANT_TYPE.AUTHORIZATION_CODE,
        client_id: clientDoc.get('_id'),
        client_secret: clientDoc.get('client_secret'),
        code: code.get('_id'),
        redirect_uri: baseClient.redirect_uris[0],
      })
    );
    req.end();

    await expect(tokenMiddlewareValidator(req, res)).rejects.toThrowError();
  });
});
