import { Document } from 'mongoose';

import connection, {
  AuthorizationModel,
  disconnect,
  UserModel,
} from 'database/lib';
import { UserSchema } from 'database/lib/schemata/user';
import ClientModel, { ClientSchema } from 'database/lib/schemata/client';
import { AuthorizationSchema } from 'database/lib/schemata/authorization';
import { AccessTokenModel } from 'database/lib/schemata/token';
import { fillClaims, JWTAuth } from 'utils/lib/jwt/helpers';
import { SCOPE, SCOPE_CLAIMS } from 'utils/lib/types/scope';
import { RESPONSE_TYPE } from 'utils/lib/types/response_type';
import hashCodeOrToken from 'utils/lib/util/hash-code-token';

describe('JWT helpers', () => {
  let clientDoc: Document<ClientSchema>;
  let userDoc: Document<UserSchema>;

  const user: UserSchema = {
    password: 'testpassword',
    email: 'test@email.com',
    given_name: 'Testy',
    middle_name: 'T',
    family_name: 'McTestface',
    nickname: 'Testified',
    preferred_username: 'test@email.com',
    phone_number: '+44555123456',
    picture:
      'https://gravatar.com/avatar/93942e96f5acd83e2e047ad8fe03114d?d=robohash',
    address: {
      street_address: 'Teststreet',
      locality: 'Test Village',
      region: 'Testshire',
      postal_code: 'ABC-TEST123',
      country: 'Testland',
    },
  };

  const client: ClientSchema = {
    name: 'Testclient',
    redirect_uris: ['https://test.uri.com'],
    owner: '',
  };

  const baseAuth: AuthorizationSchema = {
    client_id: '',
    scope: [SCOPE.OPENID],
    redirect_uri: client.redirect_uris[0],
    response_type: [RESPONSE_TYPE.CODE, RESPONSE_TYPE.ID_TOKEN],
    user: '',
  };

  afterAll(async () => {
    await connection();
    await Promise.all([
      AccessTokenModel.collection.drop(),
      AuthorizationModel.collection.drop(),
      ClientModel.findByIdAndDelete(clientDoc._id),
      UserModel.findByIdAndDelete(userDoc._id),
    ]);

    await disconnect();
  });

  beforeAll(async () => {
    await connection();

    userDoc = await UserModel.create(user);
    clientDoc = await ClientModel.create({ ...client, owner: userDoc._id });
  });

  it('fill minimal required OpenID claims', async () => {
    const auth = {
      ...baseAuth,
      user: userDoc.get('_id'),
      client_id: clientDoc.get('_id'),
    };

    const authDoc = await AuthorizationModel.create(auth);

    const claims = await fillClaims(authDoc.toJSON() as JWTAuth);

    SCOPE_CLAIMS[SCOPE.OPENID].forEach((claim) =>
      expect(claims).toHaveProperty(claim)
    );
    SCOPE_CLAIMS[SCOPE.PROFILE].forEach((claim) =>
      expect(claims).not.toHaveProperty(claim)
    );
  });

  it('fill all claims supported by OpenID provider', async () => {
    const auth: AuthorizationSchema = {
      ...baseAuth,
      client_id: clientDoc.get('_id'),
      scope: [...Object.keys(SCOPE_CLAIMS)] as SCOPE[],
      user: userDoc.get('_id'),
      nonce: 'testnonce',
    };

    const authDoc = await AuthorizationModel.create(auth);
    const tokenDoc = await AccessTokenModel.create({
      authorization: authDoc.get('_id'),
    });

    const fields = {
      ...authDoc.toJSON(),
      access_token: tokenDoc.get('_id'),
    } as JWTAuth;

    const claims = await fillClaims(fields);

    Object.keys(SCOPE_CLAIMS)
      .flatMap((scope) => SCOPE_CLAIMS[scope])
      .forEach((claim) => expect(claims).toHaveProperty(claim));

    expect(claims).toHaveProperty(
      'at_hash',
      hashCodeOrToken(tokenDoc.get('_id'))
    );
    expect(claims).toHaveProperty(
      'c_hash',
      hashCodeOrToken(authDoc.get('_id'))
    );
  });
});
