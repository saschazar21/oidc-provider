import { JWK } from 'jose/webcrypto/types';

import config, { JWKSConfig } from 'config/lib/jwks';
import { JWE } from 'types/lib/jwe';
import { JWS } from 'types/lib/jws';
import KeyStore from 'utils/lib/util/keystore';

const keystore = new KeyStore();

const initialize = async (jwks?: { keys: JWK[] }): Promise<void> => {
  try {
    jwks && (await keystore.import(jwks));
  } catch (e) {
    throw new Error(`ERROR: Restoring Keystore failed: ${e.message || e}`);
  }
  if (!keystore.size) {
    await Promise.all(
      config.map(async (key: JWKSConfig) => {
        const {
          size,
          options: { alg },
        } = key;

        return keystore.generate(
          alg as JWE | JWS,
          Object.assign(
            {},
            typeof size === 'number' ? { modulusLength: size } : { crv: size }
          ),
          true
        );
      })
    );
  }
};

export const getKeystore = async (jwks?: {
  keys: JWK[];
}): Promise<KeyStore> => {
  if (!keystore.size || jwks) {
    await initialize(jwks);
  }

  return keystore;
};

export default getKeystore;
