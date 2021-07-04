import { JWE, JWKS } from 'jose';

import { KeyModel } from 'database/lib';
import connection, { disconnect } from 'database/lib/connect';
import encrypt from 'utils/lib/jwt/encrypt';
import getKeys from 'utils/lib/keys';
import { RESPONSE_TYPE } from 'utils/lib/types/response_type';
import { SCOPE } from 'utils/lib/types/scope';

describe('JWT Encode', () => {
  let keys: JWKS.KeyStore;

  afterAll(async () => {
    await KeyModel.findByIdAndDelete('master');

    await disconnect();
  });

  beforeAll(async () => {
    await connection();

    const { keystore } = await getKeys();
    keys = keystore;
  });

  it('encrypts a JWT using default settings (RSA-OAEP)', async () => {
    const auth = {
      scope: [SCOPE.OPENID],
      response_type: [RESPONSE_TYPE.ID_TOKEN],
      updated_at: new Date(),
      user: 'testuser',
      client_id: 'testclient',
    };

    const encrypted = await encrypt(auth);

    const decrypted = JWE.decrypt(
      encrypted,
      keys.get({ alg: 'RSA-OAEP', use: 'enc' })
    );
    const parsed = JSON.parse(Buffer.from(decrypted).toString());

    expect(parsed.sub).toEqual(auth.user);
    expect(parsed.aud).toEqual(auth.client_id);
  });
});
