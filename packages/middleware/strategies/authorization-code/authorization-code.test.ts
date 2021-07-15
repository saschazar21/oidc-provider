import { Document } from 'mongoose';

import connection, {
  AuthorizationCodeModel,
  AuthorizationModel,
  ClientModel,
  disconnect,
  UserModel,
} from 'database/lib';
import { Authorization } from 'database/lib/schemata/authorization';
import { ClientSchema } from 'database/lib/schemata/client';
import { UserSchema } from 'database/lib/schemata/user';
import AuthorizationCodeStrategy from 'middleware/strategies/authorization-code';
import { RESPONSE_TYPE } from 'utils/lib/types/response_type';
import { SCOPE } from 'utils/lib/types/scope';

describe('AuthorizationCodeStrategy', () => {
  let authorization: Document<Authorization>;
  let userDoc: Document<UserSchema>;
  let clientId: string;
  let userId: string;

  const user: UserSchema = {
    email: 'someone@test.com',
    password: 'testpassword',
  };

  const client: ClientSchema = {
    name: 'Authorization Code Test Client',
    owner: '',
    redirect_uris: ['https://someuri.go'],
  };

  afterAll(async () => {
    try {
      await connection();
      await Promise.all([
        AuthorizationCodeModel.collection.drop(),
        AuthorizationModel.collection.drop(),
        UserModel.findByIdAndDelete(userId),
        ClientModel.findByIdAndDelete(clientId),
      ]);
    } catch (e) {
      console.error(e);
    } finally {
      await disconnect();
    }
  });

  beforeAll(async () => {
    await connection();

    userDoc = await UserModel.create(user);
    const clientModel = await ClientModel.create({
      ...client,
      owner: userDoc._id,
    });

    clientId = clientModel.get('_id');
    userId = userDoc.get('_id');
  });

  it('creates a new Authorization using response_type=code', async () => {
    const auth = {
      client_id: clientId,
      redirect_uri: client.redirect_uris[0],
      scope: [SCOPE.OPENID],
      response_type: [RESPONSE_TYPE.CODE],
    };

    const authorizationCodeStrategy = new AuthorizationCodeStrategy(auth);

    expect(authorizationCodeStrategy.auth).toEqual(auth);

    authorization = await authorizationCodeStrategy.init();

    expect(authorization.get('client_id')).toEqual(clientId);
    expect(authorizationCodeStrategy.doc).toEqual(authorization);
    await expect(
      authorizationCodeStrategy.responsePayload()
    ).rejects.toThrowError();
  });

  it('returns an existing, inactive Authorization', async () => {
    const authorizationCodeStrategy = new AuthorizationCodeStrategy({
      _id: authorization.get('_id'),
      scope: authorization.get('scope'),
      response_type: authorization.get('response_type'),
    });
    const doc = await authorizationCodeStrategy.init();

    const { prompt, ...rest } =
      authorization.toJSON() as unknown as Authorization;
    expect(doc.toJSON()).toMatchObject(rest);
    expect(authorizationCodeStrategy.id).toEqual(authorization._id);
    expect(doc.get('consent')).toBeFalsy();
    expect(doc.get('user')).toBeFalsy();
  });

  it('fails to return response payload when user has not given consent yet', async () => {
    const auth = {
      client_id: clientId,
      redirect_uri: client.redirect_uris[0],
      scope: [SCOPE.OPENID],
      response_type: authorization.get('response_type'),
      user: userId,
    };

    const authorizationCodeStrategy = new AuthorizationCodeStrategy(auth);
    await expect(
      authorizationCodeStrategy.responsePayload()
    ).rejects.toThrowError();

    await authorizationCodeStrategy.init();

    await expect(
      authorizationCodeStrategy.responsePayload()
    ).rejects.toThrowError();
  });

  it('updates Authorization and returns response payload', async () => {
    await connection();
    await userDoc.update({ $addToSet: { consents: clientId } });
    await disconnect();

    const auth = {
      _id: authorization.get('_id'),
      user: userId,
      scope: [SCOPE.OPENID, SCOPE.EMAIL],
      response_type: authorization.get('response_type'),
      state: 'teststate',
    };

    const authorizationCodeStrategy = new AuthorizationCodeStrategy(auth);
    const doc = await authorizationCodeStrategy.init();

    expect(doc.get('updated_at')).not.toEqual(authorization.get('updated_at'));
    expect(doc.toJSON()).not.toMatchObject(authorization.toJSON());

    const payload = await authorizationCodeStrategy.responsePayload();

    expect(payload.redirect_uri).toEqual(authorization.get('redirect_uri'));
    expect(payload.response_mode).toEqual(
      AuthorizationCodeStrategy.DEFAULT_RESPONSE_MODE
    );
    expect(payload.payload.code).toEqual(authorizationCodeStrategy.code);
    expect(payload.payload.state).toEqual(auth.state);
    expect(doc.get('scope')).not.toEqual(auth.scope);
    expect(doc.get('scope')).toHaveLength(1);
  });

  it('fails to create Authorization when client_id is missing', async () => {
    const auth = {
      redirect_uri: client.redirect_uris[0],
      scope: [SCOPE.OPENID],
      response_type: authorization.get('response_type'),
    };

    const authorizationCodeStrategy = new AuthorizationCodeStrategy(auth);

    await expect(authorizationCodeStrategy.init()).rejects.toThrowError();
  });

  it('fails to fetch Authorization using invalid ID', async () => {
    const auth = {
      _id: 'abctest',
      client_id: clientId,
      redirect_uri: client.redirect_uris[0],
      scope: [SCOPE.OPENID],
      response_type: authorization.get('response_type'),
      user: userId,
    };

    const authorizationCodeStrategy = new AuthorizationCodeStrategy(auth);

    await expect(authorizationCodeStrategy.init()).rejects.toThrowError();
  });
});
