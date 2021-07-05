import { JWE, JWKS } from 'jose';

import { KeyModel } from 'database/lib';
import connection, { disconnect } from 'database/lib/connect';
import encrypt, { decrypt } from 'utils/lib/jwt/encrypt';
import { JWTAuth } from 'utils/lib/jwt/helpers';
import getKeys from 'utils/lib/keys';
import { RESPONSE_TYPE } from 'utils/lib/types/response_type';
import { SCOPE } from 'utils/lib/types/scope';

describe('JWT Encode', () => {
  let keys: JWKS.KeyStore;

  const auth = {
    scope: [SCOPE.OPENID],
    response_type: [RESPONSE_TYPE.ID_TOKEN],
    updated_at: new Date(),
    user: 'testuser',
    client_id: 'testclient',
  };

  afterAll(async () => {
    await connection();
    await KeyModel.findByIdAndDelete('master');

    await disconnect();
  });

  beforeAll(async () => {
    await connection();

    const { keystore } = await getKeys();
    keys = keystore;

    await disconnect();
  });

  it('encrypts a JWT using default settings (RSA-OAEP)', async () => {
    const encrypted = await encrypt(auth);

    const decrypted = JWE.decrypt(
      encrypted,
      keys.get({ alg: 'RSA-OAEP', use: 'enc' })
    );
    const parsed = JSON.parse(Buffer.from(decrypted).toString());

    expect(parsed.sub).toEqual(auth.user);
    expect(parsed.aud).toEqual(auth.client_id);
  });

  it('encrypts a JWT using ECDH-ES algorithm', async () => {
    const encrypted = await encrypt(auth, 'ECDH-ES');

    const decrypted = JWE.decrypt(
      encrypted,
      keys.get({ alg: 'ECDH-ES', use: 'enc' })
    );
    const parsed = JSON.parse(Buffer.from(decrypted).toString());

    expect(parsed.sub).toEqual(auth.user);
    expect(parsed.aud).toEqual(auth.client_id);
  });

  it('decrypts a JWE', async () => {
    const encrypted = await encrypt(auth);

    const decrypted = await decrypt(encrypted);

    expect(decrypted.sub).toEqual(auth.user);
    expect(decrypted.aud).toEqual(auth.client_id);
  });

  it('fails to encrypt a JWT when invalid algorithm is given', async () => {
    await expect(encrypt(auth, 'ASDF-TEST')).rejects.toThrowError();
  });

  it('fails to encrypt a JWT when insufficient claims given', async () => {
    const { user, ...restAuth } = {
      ...auth,
      scope: [SCOPE.OPENID, SCOPE.PROFILE],
    };
    await expect(encrypt(restAuth as JWTAuth)).rejects.toThrowError();
  });

  it('fails to decrypt a JWE using a wrong algorithm', async () => {
    const encrypted = await encrypt(auth);

    expect(() =>
      JWE.decrypt(encrypted, keys.get({ alg: 'ECDH-ES', use: 'enc' }))
    ).toThrowError();
  });

  it('fails to decrypt a JWE when invalid string is given', async () => {
    const encrypted = await encrypt(auth);

    await expect(decrypt(`${encrypted}_invalid`)).rejects.toThrowError();
  });
});
