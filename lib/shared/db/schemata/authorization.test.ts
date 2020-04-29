import mongoose, { connection } from 'mongoose';

import connect, {
  AuthorizationModel,
  ClientModel,
  UserModel,
} from '~/lib/shared/db';
import { AuthorizationSchema } from '~/lib/shared/db/schemata/authorization';
import { ClientSchema } from '~/lib/shared/db/schemata/client';
import { UserSchema } from '~/lib/shared/db/schemata/user';
import { ACR_VALUES } from '~/lib/shared/types/acr';
import { DISPLAY } from '~/lib/shared/types/display';
import { PKCE } from '~/lib/shared/types/pkce';
import { PROMPT } from '~/lib/shared/types/prompt';
import { RESPONSE_MODE } from '~/lib/shared/types/response_mode';
import { RESPONSE_TYPE } from '~/lib/shared/types/response_type';
import { SCOPE } from '~/lib/shared/types/scope';

describe('AuthorizationModel', () => {
  let authorization_id: string;
  let client_id: string;
  let sub: string;

  const baseUser: UserSchema = {
    email: 'john.doe@email.com',
    password: 'a test password',
  };

  const baseClient: ClientSchema = {
    name: 'Authorization Test Client',
    owner: sub,
    redirect_uris: ['https://url.com/cb'],
  };

  let baseAuthorization: AuthorizationSchema = {
    scope: [SCOPE.OPENID],
    response_type: [RESPONSE_TYPE.CODE],
    client: client_id,
    redirect_uri: baseClient.redirect_uris[0],
    state: 'random state',
    response_mode: RESPONSE_MODE.QUERY,
    nonce: 'random nonce',
    display: [DISPLAY.PAGE],
    prompt: [PROMPT.CONSENT],
    max_age: 3600,
    ui_locales: ['de_AT'],
    login_hint: 'login hint',
    acr_values: [ACR_VALUES.BASIC],
    code_challenge: 'random code challenge',
    code_challenge_method: PKCE.PLAIN,
  };

  afterAll(async () => {
    await Promise.all([
      AuthorizationModel.findByIdAndDelete(authorization_id),
      ClientModel.findByIdAndDelete(client_id),
      UserModel.findByIdAndDelete(sub),
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
        baseAuthorization = {
          ...baseAuthorization,
          client: client_id,
          user: sub,
        };
      });
  });

  it('should throw when custom ID is given', async () => {
    const data = {
      ...baseAuthorization,
      _id: 'custom ID',
    };

    await expect(AuthorizationModel.create(data)).rejects.toThrowError();
  });

  it('should throw when invalid redirect_uri is given', async () => {
    const data = {
      ...baseAuthorization,
      redirect_uri: 'https://url.com/callback',
    };
    await expect(AuthorizationModel.create(data)).rejects.toThrowError();
  });

  it('should create an Authorization', async () => {
    const authorization = await AuthorizationModel.create(baseAuthorization);
    await AuthorizationModel.populate(authorization, [
      { path: 'user' },
      { path: 'client', populate: { path: 'owner' } },
    ]);
    authorization_id = authorization.get('_id');

    expect(authorization.get('user').get('email')).toEqual(baseUser.email);
    expect(authorization.get('client').get('name')).toEqual(baseClient.name);
  });

  it('should update AuthorizationModel', async () => {
    const data = {
      consent: !baseAuthorization.consent,
    };

    const updated = await AuthorizationModel.findByIdAndUpdate(
      authorization_id,
      data,
      { new: true }
    );

    expect(updated).toBeDefined();
    expect(updated.get('updatedAt')).toBeTruthy();
    expect(updated.get('__v')).toBeGreaterThan(0);
    expect(updated.get('consent')).not.toEqual(baseAuthorization.consent);
  });

  it('should throw when updating with custom ID', async () => {
    const data = {
      _id: 'a custom ID',
    };

    await expect(
      AuthorizationModel.findByIdAndUpdate(authorization_id, data)
    ).rejects.toThrowError();
  });
});