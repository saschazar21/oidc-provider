import mongoose from 'mongoose';

import { ALPHABET_LENGTH } from '~/lib/shared/config/id';
import connect, {
  AuthorizationModel,
  ClientModel,
  AccessTokenModel,
  RefreshTokenModel,
  UserModel,
} from '~/lib/shared/db';
import { ClientSchema } from '~/lib/shared/db/schemata/client';
import { UserSchema } from '~/lib/shared/db/schemata/user';
import { LIFETIME } from '~/lib/shared/types/lifetime';
import { RESPONSE_TYPE } from '~/lib/shared/types/response_type';
import { SCOPE } from '~/lib/shared/types/scope';

describe('TokenModel', () => {
  let client_id: string;
  let sub: string;
  let authorization_id: string;
  let access_token: string;
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
    await Promise.all([
      UserModel.findByIdAndDelete(sub),
      ClientModel.findByIdAndDelete(client_id),
      AuthorizationModel.findByIdAndDelete(authorization_id),
      AccessTokenModel.findByIdAndDelete(access_token),
      RefreshTokenModel.findByIdAndDelete(refresh_token),
    ]);

    mongoose.connection.close();
  });

  beforeAll(async () => {
    await connect()
      .then(() => UserModel.create(baseUser))
      .then(user => {
        sub = user.get('sub');
        return ClientModel.create({ ...baseClient, owner: sub });
      })
      .then(client => {
        client_id = client.get('client_id');
        return AuthorizationModel.create({
          ...baseAuthorization,
          user: sub,
          client_id,
        });
      })
      .then(authorization => {
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
    expect(token.get('type')).toEqual('AccessToken');
    expect(token.get('authorization')).toHaveProperty('_id', authorization_id);
    expect(token.get('authorization').get('client_id')).toEqual(client_id);
    expect(Date.parse(token.get('expires'))).toEqual(
      Date.parse(token.get('createdAt')) + LIFETIME.ACCESS_TOKEN * 1000
    );
  });

  it('creates a RefreshToken', async () => {
    const token = await RefreshTokenModel.create({
      authorization: authorization_id,
    });
    await RefreshTokenModel.populate(token, { path: 'authorization' });

    refresh_token = token.get('_id');

    expect(access_token).toHaveLength(ALPHABET_LENGTH.LONG);
    expect(token.get('type')).toEqual('RefreshToken');
    expect(token.get('authorization')).toHaveProperty('_id', authorization_id);
    expect(token.get('authorization').get('client_id')).toEqual(client_id);
    expect(Date.parse(token.get('expires'))).toEqual(
      Date.parse(token.get('createdAt')) + LIFETIME.REFRESH_TOKEN * 1000
    );
  });
});
