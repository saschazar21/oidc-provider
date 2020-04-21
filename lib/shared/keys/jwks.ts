import { JWKS, JSONWebKeySet } from 'jose';
import config, { JWKSConfig } from '~/lib/shared/config/jwks';

let keystore: JWKS.KeyStore;

// TODO: initialize keystore with DB result
const initialize = async (jwks?: JSONWebKeySet): Promise<void> => {
  try {
    keystore = jwks ? JWKS.asKeyStore(jwks) : new JWKS.KeyStore();
  } catch (e) {
    throw new Error(`ERROR: Restoring Keystore failed: ${e.message || e}`);
  }
  if (!keystore.size) {
    await Promise.all(
      config.map(async (key: JWKSConfig) => {
        const { kty, size, options } = key;
        return keystore.generate(kty as any, size as any, options, true);
      })
    );
  }
};

export const getKeystore = async (
  jwks?: JSONWebKeySet
): Promise<JWKS.KeyStore> => {
  if (!keystore || jwks) {
    await initialize(jwks);
  }

  return keystore;
};
