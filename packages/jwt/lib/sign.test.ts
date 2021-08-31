import { Document } from 'mongoose';
import { compactVerify } from 'jose/jws/compact/verify';
import parseJwk from 'jose/jwk/parse';

import { getUrl } from '@saschazar/oidc-provider-config/lib/url';
import { KeyModel } from '@saschazar/oidc-provider-database/lib/';
import connection, {
  disconnect,
} from '@saschazar/oidc-provider-database/lib/connect';
import ClientModel, {
  ClientSchema,
} from '@saschazar/oidc-provider-database/lib/schemata/client';
import UserModel, {
  UserSchema,
} from '@saschazar/oidc-provider-database/lib/schemata/user';
import { JWTAuth } from '@saschazar/oidc-provider-jwt/lib/helpers';
import sign, { verify } from '@saschazar/oidc-provider-jwt/lib/sign';
import getKeys from '@saschazar/oidc-provider-utils/lib/keys';
import { RESPONSE_TYPE } from '@saschazar/oidc-provider-types/lib/response_type';
import { SCOPE } from '@saschazar/oidc-provider-types/lib/scope';
import KeyStore from '@saschazar/oidc-provider-utils/lib/util/keystore';

describe('JWT Sign', () => {
  let keys: KeyStore;
  let clientDoc: Document<ClientSchema>;
  let userDoc: Document<UserSchema>;

  const auth = {
    scope: [SCOPE.OPENID],
    response_type: [RESPONSE_TYPE.ID_TOKEN],
    updated_at: new Date(),
    user: 'testuser',
    client_id: 'testclient',
  };

  const baseClient: ClientSchema = {
    name: 'test-sign-client',
    redirect_uris: ['https://redirect.example.com'],
    owner: '',
  };

  const baseUser: UserSchema = {
    email: 'test-sign-user@example.com',
    password: 'testpassword',
  };

  afterAll(async () => {
    await connection();
    await KeyModel.findByIdAndDelete('master');
    await ClientModel.findByIdAndDelete(clientDoc.get('_id'));
    await UserModel.findByIdAndDelete(userDoc.get('_id'));

    await disconnect();
  });

  beforeAll(async () => {
    await connection();
    userDoc = await UserModel.create(baseUser);
    baseClient.owner = userDoc.get('_id');
    clientDoc = await ClientModel.create(baseClient);
    auth.client_id = clientDoc.get('_id');

    const { keystore } = await getKeys();
    keys = keystore;

    await disconnect();
  });

  it('signs a JWT using default settings (RS256)', async () => {
    const signed = await sign(auth);

    const [header] = signed.split('.');
    const { alg } = JSON.parse(Buffer.from(header, 'base64').toString('utf-8'));

    const { payload } = await compactVerify(signed, keys.get(alg));
    const result = JSON.parse(Buffer.from(payload).toString());

    expect(result.aud).toEqual(auth.client_id);
    expect(result.sub).toEqual(auth.user);
    expect(result.auth_time).toEqual(
      Math.floor(auth.updated_at.valueOf() * 0.001)
    );
    expect(result.iss).toEqual(getUrl());
  });

  it('signs a JWT using HS256 algorithm', async () => {
    const key = await parseJwk(
      { alg: 'HS256', k: clientDoc.get('client_secret'), kty: 'oct' },
      'HS256'
    );
    const signed = await sign(auth, 'HS256');

    const { payload } = await compactVerify(signed, key);
    const result = JSON.parse(Buffer.from(payload).toString());

    expect(result.aud).toEqual(auth.client_id);
    expect(result.sub).toEqual(auth.user);
    expect(result.auth_time).toEqual(
      Math.floor(auth.updated_at.valueOf() * 0.001)
    );
    expect(result.iss).toEqual(getUrl());
  });

  it('signs a JWT using ES256 algorithm', async () => {
    const signed = await sign(auth, 'ES256');

    const [header] = signed.split('.');
    const { alg } = JSON.parse(Buffer.from(header, 'base64').toString('utf-8'));

    const { payload } = await compactVerify(signed, keys.get(alg));
    const result = JSON.parse(Buffer.from(payload).toString());

    expect(result.aud).toEqual(auth.client_id);
    expect(result.sub).toEqual(auth.user);
    expect(result.auth_time).toEqual(
      Math.floor(auth.updated_at.valueOf() * 0.001)
    );
    expect(result.iss).toEqual(getUrl());
  });

  it('verifies signed JWT', async () => {
    const signed = await sign(auth);
    const verified = await verify(signed);

    expect(verified.sub).toEqual(auth.user);
    expect(verified.aud).toEqual(auth.client_id);
  });

  it('fails to verify invalid signature', async () => {
    const signed = await sign(auth);
    await expect(verify(`${signed}_invalid`)).rejects.toThrowError();
  });

  it('fails to sign JWT, when insufficient claims given', async () => {
    const { user, ...newAuth } = {
      ...auth,
      scope: [SCOPE.OPENID, SCOPE.PROFILE],
    };
    await expect(sign(newAuth as JWTAuth)).rejects.toThrowError();
  });

  it('throws error, when unsupported algorithm is given', async () => {
    await expect(sign(auth, 'asdf' as 'none')).rejects.toThrowError();
  });

  it('throws error, when symmetric key and invalid Client ID is given', async () => {
    await expect(
      sign({ ...auth, client_id: 'invalid' }, 'HS256')
    ).rejects.toThrowError();
  });
});
