import { JWS } from 'jose';

import { supportedAlgorithms } from 'config/lib/jwks';
import { AddressSchema } from 'database/lib/schemata/user';
import { JWTAuth, fillClaims } from 'utils/lib/jwt/helpers';
import getKeys from 'utils/lib/keys';
import { CLAIM } from 'utils/lib/types/claim';
export const verify = async (
  jws: string
): Promise<
  { [key in CLAIM]: string | number } & { address?: AddressSchema }
> => {
  try {
    const { keystore } = await getKeys();
    return JWS.verify(jws, keystore) as { [key in CLAIM]: string | number };
  } catch (e) {
    console.error(e);
    throw new Error('Failed to verify JWS!');
  }
};

const sign = async (auth: JWTAuth, alg = 'HS256'): Promise<string> => {
  if (!supportedAlgorithms('JWS').includes(alg)) {
    throw new Error(`${alg} not supported for signing JWT!`);
  }

  try {
    const { keystore } = await getKeys();
    const key = keystore.get({
      alg,
      use: 'sig',
    });

    const claims = await fillClaims(auth);
    const {
      payload,
      protected: header,
      signature,
    } = JWS.sign.flattened(claims, key);

    return `${header}.${payload}.${signature}`;
  } catch (e) {
    console.error(e);
    throw new Error('Failed to sign JWT!');
  }
};

export default sign;
