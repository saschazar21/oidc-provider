import { CompactEncrypt, JWEHeaderParameters } from 'jose/jwe/compact/encrypt';
import { compactDecrypt } from 'jose/jwe/compact/decrypt';
import { KeyLike } from 'jose/jwk/parse';

import { supportedAlgorithms } from 'config/lib/jwks';
import { AddressSchema } from '@saschazar/oidc-provider-database/lib/schemata/user';
import { JWTAuth, fillClaims } from 'utils/lib/jwt/helpers';
import getKeys from 'utils/lib/keys';
import { CLAIM } from 'types/lib/claim';
import { JWE, JWE_ENC } from 'types/lib/jwe';

const resolveKey = async (
  protectedHeader: JWEHeaderParameters
): Promise<KeyLike> => {
  const { alg } = protectedHeader;

  const { keystore } = await getKeys();
  return keystore.get(alg as JWE);
};

export const decrypt = async (
  jwe: string
): Promise<
  { [key in CLAIM]: string | number } & { address?: AddressSchema }
> => {
  try {
    const { plaintext } = await compactDecrypt(jwe, resolveKey);

    return JSON.parse(Buffer.from(plaintext).toString());
  } catch (e) {
    console.error(e);
    throw new Error('Failed to decrypt JWE!');
  }
};

const encrypt = async (
  auth: JWTAuth,
  alg: JWE = JWE.RSA_OAEP,
  enc: JWE_ENC = JWE_ENC.A128CBC_HS256
): Promise<string> => {
  if (!supportedAlgorithms('JWE').includes(alg)) {
    throw new Error(`${alg} algorithm not supported for encrypting JWT!`);
  }

  if (!Object.values(JWE_ENC).includes(enc)) {
    throw new Error(
      `${enc} encryption algorithm not supported for encrypting JWT!`
    );
  }

  try {
    const { keystore } = await getKeys();
    const key = keystore.get(alg as JWE);

    const claims = await fillClaims(auth);
    return new CompactEncrypt(Buffer.from(JSON.stringify(claims)))
      .setProtectedHeader({ alg, enc })
      .encrypt(key);
  } catch (e) {
    throw new Error('Failed to encrypt JWT!');
  }
};

export default encrypt;
