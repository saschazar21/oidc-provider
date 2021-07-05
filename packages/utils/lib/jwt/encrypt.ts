import { JWE } from 'jose';

import { supportedAlgorithms } from 'config/lib/jwks';
import { AddressSchema } from 'database/lib/schemata/user';
import { JWTAuth, fillClaims } from 'utils/lib/jwt/helpers';
import getKeys from 'utils/lib/keys';
import { CLAIM } from 'utils/lib/types/claim';

export const decrypt = async (
  jwe: string
): Promise<
  { [key in CLAIM]: string | number } & { address?: AddressSchema }
> => {
  try {
    const { keystore } = await getKeys();
    const decrypted = JWE.decrypt(jwe, keystore);

    return JSON.parse(Buffer.from(decrypted).toString());
  } catch (e) {
    console.error(e);
    throw new Error('Failed to decrypt JWE!');
  }
};

const encrypt = async (auth: JWTAuth, alg = 'RSA-OAEP'): Promise<string> => {
  if (!supportedAlgorithms('JWE').includes(alg)) {
    throw new Error(`${alg} not supported for encrypting JWT!`);
  }

  try {
    const { keystore } = await getKeys();
    const key = keystore.get({ alg, use: 'enc' });

    const claims = await fillClaims(auth);
    const {
      protected: header,
      encrypted_key,
      iv,
      ciphertext,
      tag,
    } = JWE.encrypt.flattened(JSON.stringify(claims), key);

    return `${header}.${encrypted_key}.${iv}.${ciphertext}.${tag}`;
  } catch (e) {
    throw new Error('Failed to encrypt JWT!');
  }
};

export default encrypt;
