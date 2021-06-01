import mongoose from 'mongoose';

import connect, { AuthorizationModel, ClientModel, UserModel } from '../';
import { AuthorizationSchema } from './authorization';
import { ClientSchema } from './client';
import { UserSchema } from './user';
import { ACR_VALUES } from 'utils/lib/types/acr';
import { DISPLAY } from 'utils/lib/types/display';
import { PKCE } from 'utils/lib/types/pkce';
import { PROMPT } from 'utils/lib/types/prompt';
import { RESPONSE_MODE } from 'utils/lib/types/response_mode';
import { RESPONSE_TYPE } from 'utils/lib/types/response_type';
import { SCOPE } from 'utils/lib/types/scope';

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
    client_id,
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
      .then((user) => {
        sub = user.get('sub');
        return ClientModel.create({ ...baseClient, owner: sub });
      })
      .then((client) => {
        client_id = client.get('client_id');
        baseAuthorization = {
          ...baseAuthorization,
          client_id,
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

  it('should throw when custom consent is given', async () => {
    const data = {
      ...baseAuthorization,
      consent: true,
    };

    await expect(AuthorizationModel.create(data)).rejects.toThrowError();
  });

  it('should throw when custom active is given', async () => {
    const data = {
      ...baseAuthorization,
      active: true,
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

  it('should throw when invalid client is given', async () => {
    const data = {
      ...baseAuthorization,
      client_id: 'some client id',
    };
    await expect(AuthorizationModel.create(data)).rejects.toThrowError();
  });

  it('should create an Authorization', async () => {
    const authorization = await AuthorizationModel.create(baseAuthorization);
    await AuthorizationModel.populate(authorization, [
      { path: 'user' },
      { path: 'client_id', populate: { path: 'owner' } },
    ]);
    authorization_id = authorization.get('_id');

    expect(authorization.get('user').get('email')).toEqual(baseUser.email);
    expect(authorization.get('client_id').get('name')).toEqual(baseClient.name);
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