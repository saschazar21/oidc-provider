import { Document } from 'mongoose';

import connection, { disconnect, KeyModel } from 'database/lib';
import AuthorizationModel, {
  Authorization,
  AuthorizationSchema,
} from 'database/lib/schemata/authorization';
import ClientModel, { ClientSchema } from 'database/lib/schemata/client';
import UserModel, { UserSchema } from 'database/lib/schemata/user';
import HybridStrategy from 'middleware/strategies/hybrid';
import { RESPONSE_TYPE } from 'utils/lib/types/response_type';
import { SCOPE } from 'utils/lib/types/scope';

describe('Hybrid Strategy', () => {
  let authorization: Document<Authorization>;
  let user_id: string;
  let client_id: string;

  const baseClient: ClientSchema = {
    name: 'Hybrid Strategy Test Client',
    redirect_uris: ['https://test-hybrid-strategy.domain.com'],
    owner: '',
  };

  const baseUser: UserSchema = {
    email: 'test-hybrid-strategy@test.com',
    password: 'testpassword',
  };

  const baseAuth: AuthorizationSchema = {
    client_id: '',
    redirect_uri: baseClient.redirect_uris[0],
    scope: [SCOPE.OPENID],
    response_type: [
      RESPONSE_TYPE.CODE,
      RESPONSE_TYPE.ID_TOKEN,
      RESPONSE_TYPE.TOKEN,
    ],
    nonce: 'testnonce',
  };

  afterAll(async () => {
    await connection();
    await Promise.all([
      KeyModel.collection.drop(),
      AuthorizationModel.collection.drop(),
      UserModel.findByIdAndDelete(user_id),
      ClientModel.findByIdAndDelete(client_id),
    ]);

    await disconnect();
  });

  beforeAll(async () => {
    await connection();

    await UserModel.create(baseUser)
      .then((u) => {
        user_id = u.get('_id');
        return ClientModel.create({ ...baseClient, owner: user_id });
      })
      .then((c) => {
        client_id = c.get('_id');
        return UserModel.findByIdAndUpdate(user_id, {
          $push: { consents: client_id },
        });
      })
      .finally(() => disconnect());
  });

  it('creates a new Authorization using response_type=code id_token token', async () => {
    const auth = { ...baseAuth, client_id };
    const hybridStrategy = new HybridStrategy(auth);

    expect(hybridStrategy.auth).toEqual(auth);
    expect(hybridStrategy.doc).not.toBeDefined();

    authorization = await hybridStrategy.init();

    expect(authorization.get('client_id')).toEqual(client_id);

    await expect(hybridStrategy.responsePayload()).rejects.toThrowError();
  });

  it('returns an existing, inactive Authorization', async () => {
    const auth = { ...baseAuth, client_id, _id: authorization.get('_id') };
    const hybridStrategy = new HybridStrategy(auth);

    const doc = await hybridStrategy.init();

    expect(doc.get('_id')).toEqual(authorization.get('_id'));
  });

  it('updates Authorization and returns response payload', async () => {
    const auth = {
      ...baseAuth,
      client_id,
      _id: authorization.get('_id'),
      user: user_id,
      consent: true,
    };
    const hybridStrategy = new HybridStrategy(auth);
    await hybridStrategy.init();
    const responsePayload = await hybridStrategy.responsePayload();

    expect(responsePayload).toHaveProperty(
      'redirect_uri',
      baseClient.redirect_uris[0]
    );
    expect(responsePayload).toHaveProperty(
      'response_mode',
      HybridStrategy.DEFAULT_RESPONSE_MODE
    );
  });

  it('fails to return response payload, when nonce is missing and response_type contains id_token', async () => {
    const { nonce, ...auth } = {
      ...baseAuth,
      client_id,
      user: user_id,
      consent: true,
    };
    expect(() => new HybridStrategy(auth)).toThrowError();
  });
});
