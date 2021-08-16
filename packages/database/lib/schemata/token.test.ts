import { ALPHABET_LENGTH } from 'config/lib/id';
import {
  AuthorizationModel,
  ClientModel,
  AccessTokenModel,
  AuthorizationCodeModel,
  RefreshTokenModel,
  UserModel,
} from '@saschazar/oidc-provider-database/lib';
import connect, {
  disconnect,
} from '@saschazar/oidc-provider-database/lib/connect';
import { ClientSchema } from '@saschazar/oidc-provider-database/lib/schemata/client';
import { UserSchema } from '@saschazar/oidc-provider-database/lib/schemata/user';
import { LIFETIME } from 'types/lib/lifetime';
import { RESPONSE_TYPE } from 'types/lib/response_type';
import { TOKEN_TYPE } from 'types/lib/token_type';
import { SCOPE } from 'types/lib/scope';

describe('TokenModel', () => {
  let client_id: string;
  let sub: string;
  let authorization_id: string;
  let access_token: string;
  let authorization_code: string;
  let refresh_token: string;

  const baseUser: UserSchema = {
    email: 'token@mail.com',
    password: 'a sample password',
  };

  const baseClient: ClientSchema = {
    name: 'A Token Client',
    owner: sub,
    redirect_uris: ['https://tokenurl.com/cb'],
  };

  const baseAuthorization = {
    scope: [SCOPE.OPENID],
    response_type: [RESPONSE_TYPE.CODE],
    client_id,
    redirect_uri: baseClient.redirect_uris[0],
  };

  afterAll(async () => {
    await connect();
    await Promise.all([
      UserModel.findByIdAndDelete(sub),
      ClientModel.findByIdAndDelete(client_id),
      AuthorizationModel.findByIdAndDelete(authorization_id),
      AccessTokenModel.findByIdAndDelete(access_token),
      RefreshTokenModel.findByIdAndDelete(refresh_token),
    ]);

    await disconnect();
  });

  beforeAll(async () => {
    await connect()
      .then(() => UserModel.create(baseUser))
      .then((user) => {
        sub = user.get('sub');
        return ClientModel.create({ ...baseClient, owner: sub });
      })
      .then((client) => {
        client_id = client.get('client_id');
        return AuthorizationModel.create({
          ...baseAuthorization,
          user: sub,
          client_id,
        });
      })
      .then((authorization) => {
        authorization_id = authorization.get('_id');
      });
  });

  it('should throw when custom ID was given', async () => {
    await expect(
      AccessTokenModel.create({
        authorization: authorization_id,
        _id: 'some custom ID',
      })
    ).rejects.toThrowError();
  });

  it('creates an AccessToken', async () => {
    const token = await AccessTokenModel.create({
      authorization: authorization_id,
    });
    await AccessTokenModel.populate(token, { path: 'authorization' });

    access_token = token.get('_id');

    expect(access_token).toHaveLength(ALPHABET_LENGTH.LONG);
    expect(token.get('type')).toEqual(TOKEN_TYPE.ACCESS_TOKEN);
    expect(token.get('authorization')).toHaveProperty('_id', authorization_id);
    expect(token.get('authorization').get('client_id')).toEqual(client_id);
    expect(Date.parse(token.get('expires_at'))).toEqual(
      Date.parse(token.get('created_at')) + LIFETIME.ACCESS_TOKEN * 1000
    );
  });

  it('creates an AuthorizationCode', async () => {
    const code = await AuthorizationCodeModel.create({
      authorization: authorization_id,
      type: TOKEN_TYPE.AUTHORIZATION_CODE,
    });
    await AuthorizationCodeModel.populate(code, { path: 'authorization' });

    authorization_code = code.get('_id');

    expect(authorization_code).toHaveLength(ALPHABET_LENGTH.LONG);
    expect(code.get('type')).toEqual(TOKEN_TYPE.AUTHORIZATION_CODE);
    expect(code.get('authorization')).toHaveProperty('_id', authorization_id);
    expect(code.get('authorization').get('client_id')).toEqual(client_id);
    expect(Date.parse(code.get('expires_at'))).toEqual(
      Date.parse(code.get('created_at')) + LIFETIME.AUTHORIZATION_CODE * 1000
    );
  });

  it('creates a RefreshToken', async () => {
    const token = await RefreshTokenModel.create({
      authorization: authorization_id,
    });
    await RefreshTokenModel.populate(token, { path: 'authorization' });

    refresh_token = token.get('_id');

    expect(access_token).toHaveLength(ALPHABET_LENGTH.LONG);
    expect(token.get('type')).toEqual(TOKEN_TYPE.REFRESH_TOKEN);
    expect(token.get('authorization')).toHaveProperty('_id', authorization_id);
    expect(token.get('authorization').get('client_id')).toEqual(client_id);
    expect(Date.parse(token.get('expires_at'))).toEqual(
      Date.parse(token.get('created_at')) + LIFETIME.REFRESH_TOKEN * 1000
    );
  });
});
