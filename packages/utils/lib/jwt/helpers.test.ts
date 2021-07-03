import { Document } from 'mongoose';

import connection, {
  AuthorizationModel,
  disconnect,
  UserModel,
} from 'database/lib';
import { UserSchema } from 'database/lib/schemata/user';
import ClientModel, { ClientSchema } from 'database/lib/schemata/client';
import { AuthorizationSchema } from 'database/lib/schemata/authorization';
import { SCOPE, SCOPE_CLAIMS } from 'utils/lib/types/scope';
import { RESPONSE_TYPE } from '../types/response_type';
import { fillClaims } from './helpers';

describe('JWT helpers', () => {
  jest.setTimeout(30000);

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

  afterAll(async () => {
    await Promise.all([
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
    const auth: AuthorizationSchema = {
      client_id: clientDoc.get('_id'),
      scope: [SCOPE.OPENID],
      redirect_uri: client.redirect_uris[0],
      response_type: [RESPONSE_TYPE.CODE, RESPONSE_TYPE.ID_TOKEN],
      user: userDoc.get('_id'),
    };

    const authDoc = await AuthorizationModel.create(auth);

    const claims = await fillClaims(authDoc.toJSON());

    SCOPE_CLAIMS[SCOPE.OPENID].forEach((claim) =>
      expect(claims).toHaveProperty(claim)
    );
    SCOPE_CLAIMS[SCOPE.PROFILE].forEach((claim) =>
      expect(claims).not.toHaveProperty(claim)
    );
  });

  it('fill all claims supported by OpenID provider', async () => {
    const auth: AuthorizationSchema = {
      client_id: clientDoc.get('_id'),
      scope: [...Object.keys(SCOPE_CLAIMS)] as SCOPE[],
      redirect_uri: client.redirect_uris[0],
      response_type: [RESPONSE_TYPE.CODE, RESPONSE_TYPE.ID_TOKEN],
      user: userDoc.get('_id'),
      nonce: 'testnonce',
    };

    const authDoc = await AuthorizationModel.create(auth);

    const claims = await fillClaims(authDoc.toJSON());

    Object.keys(SCOPE_CLAIMS)
      .flatMap((scope) => SCOPE_CLAIMS[scope])
      .forEach((claim) => expect(claims).toHaveProperty(claim));
  });
});
