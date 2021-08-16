import { Document } from 'mongoose';

import connection, {
  AuthorizationModel,
  AccessTokenModel,
  ClientModel,
  disconnect,
  RefreshTokenModel,
  UserModel,
} from '@saschazar/oidc-provider-database/lib/';
import {
  AccessTokenSchema,
  RefreshTokenSchema,
} from '@saschazar/oidc-provider-database/lib/schemata/token';
import { AuthorizationSchema } from '@saschazar/oidc-provider-database/lib/schemata/authorization';
import { ClientSchema } from '@saschazar/oidc-provider-database/lib/schemata/client';
import { UserSchema } from '@saschazar/oidc-provider-database/lib/schemata/user';
import { getClaims } from '@saschazar/oidc-provider-middleware/lib/userinfo/helpers';
import { SCOPE } from 'types/lib/scope';
import { RESPONSE_TYPE } from 'types/lib/response_type';

describe('Userinfo middleware helpers', () => {
  let authorizationDoc: Document<AuthorizationSchema>;
  let clientDoc: Document<ClientSchema>;
  let userDoc: Document<UserSchema>;

  const createTokens = async (
    id?: string
  ): Promise<[Document<AccessTokenSchema>, Document<RefreshTokenSchema>]> => {
    await connection();
    const tokens = await Promise.all([
      AccessTokenModel.create({
        authorization: id ?? authorizationDoc.get('_id'),
      }),
      RefreshTokenModel.create({
        authorization: id ?? authorizationDoc.get('_id'),
      }),
    ]);
    await disconnect();

    return tokens;
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

  it('should return claims from access token', async () => {
    const [accessToken] = await createTokens();

    const claims = await getClaims(accessToken.get('_id'));

    expect(claims).toMatchObject({
      sub: userDoc.get('_id'),
    });
  });

  it('should return additional claims when scope contains email', async () => {
    await connection();
    const authorization = await AuthorizationModel.create({
      ...baseAuthorization,
      scope: [SCOPE.OPENID, SCOPE.EMAIL],
    });
    await disconnect();

    const [accessToken] = await createTokens(authorization.get('_id'));

    const claims = await getClaims(accessToken.get('_id'));

    expect(claims).toMatchObject({
      email: baseUser.email,
      sub: userDoc.get('_id'),
    });
  });

  it('throws error, when token is invalid', async () => {
    await expect(getClaims('invalid-token')).rejects.toThrow(/Invalid token/);
  });

  it('throws error, when refresh token was given', async () => {
    const [_accessToken, refreshToken] = await createTokens();

    await expect(getClaims(refreshToken.get('_id'))).rejects.toThrow(
      /Invalid token/
    );
  });

  it('throws error, when authorization is missing', async () => {
    const [accessToken] = await createTokens('invalid');

    await expect(getClaims(accessToken.get('_id'))).rejects.toThrow(
      /Missing authorization/
    );
  });
});
