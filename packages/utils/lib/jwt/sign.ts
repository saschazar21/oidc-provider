import { JWS } from 'jose';

import { supportedAlgorithms } from 'config/lib/jwks';
import { Authorization } from 'database/lib/schemata/authorization';
import { fillClaims } from 'utils/lib/jwt/helpers';
import getKeys from 'utils/lib/keys';
import { CLAIM } from 'utils/lib/types/claim';

export type JWTAuth = Authorization & {
  updated_at: Date;
  user: string;
  client_id: string;
};

export const verify = async (
  jwt: string
): Promise<{ [key in CLAIM]: string | number }> => {
  const { keystore } = await getKeys();
  return JWS.verify(jwt, keystore) as { [key in CLAIM]: string | number };
};

const sign = async (auth: JWTAuth, alg = 'HS256'): Promise<string> => {
  if (!supportedAlgorithms('JWS').includes(alg)) {
    throw new Error(`${alg} not supported for signing JWT!`);
  }
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
};

export default sign;
