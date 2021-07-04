import { JWE } from 'jose';

import { supportedAlgorithms } from 'config/lib/jwks';
import { fillClaims } from 'utils/lib/jwt/helpers';
import { JWTAuth } from 'utils/lib/jwt/sign';
import getKeys from 'utils/lib/keys';

const encrypt = async (auth: JWTAuth, alg = 'RSA-OAEP'): Promise<string> => {
  if (!supportedAlgorithms('JWE').includes(alg)) {
    throw new Error(`${alg} not supported for encrypting JWT!`);
  }

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
};

export default encrypt;
