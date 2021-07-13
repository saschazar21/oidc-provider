import { Document } from 'mongoose';

import connection, {
  AuthorizationModel,
  disconnect,
  KeyModel,
} from 'database/lib';
import ClientModel, { ClientSchema } from 'database/lib/schemata/client';
import UserModel, { UserSchema } from 'database/lib/schemata/user';
import { Authorization } from 'database/lib/schemata/authorization';
import ImplicitStrategy from 'middleware/strategies/implicit';
import { RESPONSE_TYPE } from 'utils/lib/types/response_type';
import { SCOPE } from 'utils/lib/types/scope';

describe('Implicit Strategy', () => {
  let authorization: Document<Authorization>;
  let client: Document<ClientSchema>;
  let user: Document<UserSchema>;

  const baseClient: ClientSchema = {
    name: 'Implicit Test Client',
    redirect_uris: ['https://implicit-test-url.example.com'],
    owner: '',
  };

  const baseUser: UserSchema = {
    email: 'implicit-strategy@test-user.com',
    password: 'testpassword',
  };

  const baseAuthorization: Authorization = {
    client_id: '',
    redirect_uri: baseClient.redirect_uris[0],
    response_type: [RESPONSE_TYPE.ID_TOKEN],
    scope: [SCOPE.OPENID],
    user: '',
    nonce: 'testnonce',
  };

  afterAll(async () => {
    await connection();
    await Promise.all([
      KeyModel.collection.drop(),
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
        baseAuthorization.user = u.get('_id');
        baseClient.owner = u.get('_id');
        return ClientModel.create(baseClient);
      })
      .then(async (c) => {
        client = c;
        baseAuthorization.client_id = c.get('_id');
        return disconnect();
      });
  });

  it('creates a new Authorization using response_type=id_token', async () => {
    const implicitStrategy = new ImplicitStrategy(baseAuthorization);
    authorization = await implicitStrategy.init();

    expect(authorization.get('client_id')).toEqual(client.get('_id'));

    await expect(implicitStrategy.responsePayload()).rejects.toThrowError();
  });

  it('returns an existing, inactive Authorization', async () => {
    const implicitStrategy = new ImplicitStrategy({
      ...baseAuthorization,
      _id: authorization.get('_id'),
    });
    const doc = await implicitStrategy.init();

    expect(doc.get('_id')).toEqual(authorization.get('_id'));
  });

  it('updates Authorization and returns response payload', async () => {
    await connection();
    await user.update({ $addToSet: { consents: client.get('_id') } });
    await disconnect();

    const auth = {
      ...baseAuthorization,
      _id: authorization.get('_id'),
    };

    const implicitStrategy = new ImplicitStrategy(auth);

    await implicitStrategy.init();

    const responsePayload = await implicitStrategy.responsePayload();

    expect(responsePayload.redirect_uri).toEqual(
      client.get('redirect_uris')[0]
    );
    expect(responsePayload.payload).toHaveProperty('id_token');
    expect(responsePayload.payload).not.toHaveProperty('access_token');
  });

  it('returns access_token when response_type=id_token token', async () => {
    const auth = {
      ...baseAuthorization,
      response_type: [RESPONSE_TYPE.ID_TOKEN, RESPONSE_TYPE.TOKEN],
      consent: true,
      state: 'I am a state',
    };

    const implicitStrategy = new ImplicitStrategy(auth);

    await implicitStrategy.init();

    const responsePayload = await implicitStrategy.responsePayload();

    expect(responsePayload.payload).toHaveProperty('access_token');
    expect(responsePayload.payload).toHaveProperty('expires_in');
  });

  it('throws, when nonce is missing', async () => {
    const { nonce, ...auth } = baseAuthorization;

    const strategy = new ImplicitStrategy(auth);
    await expect(strategy.init()).rejects.toThrowError();
  });
});
