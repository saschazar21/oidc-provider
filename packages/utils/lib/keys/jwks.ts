import { JWK } from 'jose/webcrypto/types';

import config, { JWKSConfig } from '@saschazar/oidc-provider-config/lib/jwks';
import { JWE } from '@saschazar/oidc-provider-types/lib/jwe';
import { JWS } from '@saschazar/oidc-provider-types/lib/jws';

import KeyStore from '../util/keystore';

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
