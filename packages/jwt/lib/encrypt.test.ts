import { compactDecrypt } from 'jose/jwe/compact/decrypt';

import { KeyModel } from '@saschazar/oidc-provider-database/lib/';
import connection, {
  disconnect,
} from '@saschazar/oidc-provider-database/lib/connect';
import encrypt, { decrypt } from 'jwt/lib/encrypt';
import { JWTAuth } from 'jwt/lib/helpers';
import getKeys from 'utils/lib/keys';
import { RESPONSE_TYPE } from 'types/lib/response_type';
import { SCOPE } from 'types/lib/scope';
import KeyStore from 'utils/lib/util/keystore';
import { JWE, JWE_ENC } from 'types/lib/jwe';

describe('JWT Encode', () => {
  let keys: KeyStore;

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

    const { plaintext } = await compactDecrypt(
      encrypted,
      keys.get('RSA-OAEP' as JWE)
    );
    const parsed = JSON.parse(Buffer.from(plaintext).toString());

    expect(parsed.sub).toEqual(auth.user);
    expect(parsed.aud).toEqual(auth.client_id);
  });

  it('encrypts a JWT using ECDH-ES algorithm', async () => {
    const encrypted = await encrypt(auth, 'ECDH-ES' as JWE);

    const { plaintext } = await compactDecrypt(
      encrypted,
      keys.get('ECDH-ES' as JWE)
    );
    const parsed = JSON.parse(Buffer.from(plaintext).toString());

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
    await expect(encrypt(auth, 'ASDF-TEST' as JWE)).rejects.toThrowError();
  });

  it('fails to encrypt a JWT when insufficient claims given', async () => {
    const { user, ...restAuth } = {
      ...auth,
      scope: [SCOPE.OPENID, SCOPE.PROFILE],
    };
    await expect(encrypt(restAuth as JWTAuth)).rejects.toThrowError();
  });

  it('fails to encrypt a JWT when invalid enc parameter was given', async () => {
    await expect(
      encrypt(auth, JWE.RSA_OAEP, 'A1282GCM' as JWE_ENC)
    ).rejects.toThrowError();
  });

  it('fails to decrypt a JWE using a wrong algorithm', async () => {
    const encrypted = await encrypt(auth);

    await expect(
      compactDecrypt(encrypted, keys.get('ECDH-ES' as JWE))
    ).rejects.toThrowError();
  });

  it('fails to decrypt a JWE when invalid string is given', async () => {
    const encrypted = await encrypt(auth);

    await expect(decrypt(`${encrypted}_invalid`)).rejects.toThrowError();
  });
});
