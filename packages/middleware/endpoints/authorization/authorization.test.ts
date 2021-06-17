import { connection } from 'mongoose';
import MockRequest from 'mock-req';
import { encode } from 'querystring';

import { ClientSchema } from 'database/lib/schemata/client';
import { UserSchema } from 'database/lib/schemata/user';
import { CLIENT_ENDPOINT, ENDPOINT } from 'utils/lib/types/endpoint';
import { METHOD } from 'utils/lib/types/method';
import { RESPONSE_TYPE } from 'utils/lib/types/response_type';
import { SCOPE } from 'utils/lib/types/scope';
import { mockResponse } from 'utils/lib/util/test-utils';

describe('Authorization Middleware', () => {
  let AuthorizationModel;
  let ClientModel;
  let KeyModel;
  let UserModel;

  let authorizationId: string;
  let client_id: string;
  let connect;
  let req;
  let res;
  let sub: string;

  const client: ClientSchema = {
    name: 'Test Client',
    owner: '',
    redirect_uris: ['https://redirect.uri'],
  };

  const user: UserSchema = {
    email: 'someone-authorization@test.com',
    password: 'some test password',
  };

  const query = {
    scope: 'openid profile',
    response_type: 'code',
    client_id,
    redirect_uri: client.redirect_uris[0],
  };

  const baseRequest = {
    connection: {
      encrypted: true,
    },
    method: METHOD.GET,
    url: ENDPOINT.AUTHORIZATION,
  };

  afterEach(async () => {
    try {
      await connect().then(() =>
        Promise.all([
          AuthorizationModel.findByIdAndDelete(authorizationId),
          ClientModel.findByIdAndDelete(client_id),
          UserModel.findByIdAndDelete(sub),
          KeyModel.findByIdAndDelete('master'),
        ])
      );
    } finally {
      await connection.close();
    }
  });

  beforeEach(async () => {
    jest.resetModules();

    const dbImports = await import('database/lib');
    connect = dbImports.default;

    AuthorizationModel = dbImports.AuthorizationModel;
    ClientModel = dbImports.ClientModel;
    KeyModel = dbImports.KeyModel;
    UserModel = dbImports.UserModel;

    await connect()
      .then(() => UserModel.create(user))
      .then((user) => {
        sub = user.get('sub');
        return ClientModel.create({ ...client, owner: sub });
      })
      .then((client) => {
        client_id = client.get('client_id');
        return AuthorizationModel.create({
          scope: [SCOPE.OPENID],
          response_type: [RESPONSE_TYPE.CODE],
          client_id,
          redirect_uri: client.redirect_uris[0],
        });
      })
      .then((authorization) => {
        authorizationId = authorization.get('_id');
      })
      .then(() => connection.close());

    console.error = console.log;

    req = new MockRequest(baseRequest);

    res = mockResponse();
  });

  it('should redirect to client on malformed request', async () => {
    const customQuery = {
      ...query,
      scope: 'profile',
    };

    const updatedReq = new MockRequest({
      ...baseRequest,
      url: `${ENDPOINT.AUTHORIZATION}?${encode(customQuery)}`,
    });

    const { default: authorizationMiddleware } = await import(
      'middleware/endpoints/authorization'
    );

    await connect().then(() => KeyModel.findByIdAndDelete('master'));
    const result = await authorizationMiddleware(updatedReq, res);

    expect(result).toBeFalsy();
    expect(res.getHeader('location')).toEqual(
      `${client.redirect_uris[0]}/?error=invalid_request`
    );
  });

  it(`should redirect to ${CLIENT_ENDPOINT.LOGIN} without sub cookie`, async () => {
    const updatedReq = new MockRequest({
      ...baseRequest,
      method: METHOD.POST,
    });
    updatedReq.write(encode({ ...query, client_id }));
    updatedReq.end();

    const { default: authorizationMiddleware } = await import(
      'middleware/endpoints/authorization'
    );

    await connect()
      .then(() => KeyModel.findByIdAndDelete('master'))
      .then(() => connection.close());
    const result = await authorizationMiddleware(updatedReq, res);

    expect(result).toBeFalsy();
    expect(res.getHeader('location')).toEqual(
      `${CLIENT_ENDPOINT.LOGIN}?${encode({
        redirect_to: ENDPOINT.AUTHORIZATION,
      })}`
    );
  });

  it(`should redirect POST to ${CLIENT_ENDPOINT.LOGIN} without sub cookie`, async () => {
    const updatedReq = new MockRequest({
      ...baseRequest,
      method: METHOD.POST,
    });

    updatedReq.write(encode(query));
    updatedReq.end();

    const { default: authorizationMiddleware } = await import(
      'middleware/endpoints/authorization'
    );

    await connect()
      .then(() => KeyModel.findByIdAndDelete('master'))
      .then(() => connection.close());
    const result = await authorizationMiddleware(updatedReq, res);

    expect(result).toBeFalsy();
    expect(res.getHeader('location')).toEqual(
      `${CLIENT_ENDPOINT.LOGIN}?${encode({
        redirect_to: ENDPOINT.AUTHORIZATION,
      })}`
    );
  });

  it(`should redirect to ${CLIENT_ENDPOINT.LOGIN} even when authorization cookie present`, async () => {
    const updatedReq = new MockRequest({
      ...baseRequest,
      headers: {
        cookie: `authorization=${authorizationId}`,
      },
    });

    const { default: authorizationMiddleware } = await import(
      'middleware/endpoints/authorization'
    );

    await connect().then(() => KeyModel.findByIdAndDelete('master'));
    const result = await authorizationMiddleware(updatedReq, res);

    expect(result).toBeFalsy();
    expect(res.getHeader('location')).toEqual(
      `${CLIENT_ENDPOINT.LOGIN}?${encode({
        redirect_to: ENDPOINT.AUTHORIZATION,
      })}`
    );
  });

  it(`should redirect to ${client.redirect_uris[0]} when sub cookie is set`, async () => {
    const updatedReq = new MockRequest({
      ...baseRequest,
      headers: {
        cookie: `sub=${sub}`,
      },
    });

    const { default: authorizationMiddleware } = await import(
      'middleware/endpoints/authorization'
    );

    await connect()
      .then(() => KeyModel.findByIdAndDelete('master'))
      .then(() => connection.close());
    const result = await authorizationMiddleware(updatedReq, res);

    expect(result).toBeTruthy();
    expect(res.getHeader('location')).toEqual(
      `${CLIENT_ENDPOINT.LOGIN}?${encode({
        redirect_to: ENDPOINT.AUTHORIZATION,
      })}`
    );
  });
});
