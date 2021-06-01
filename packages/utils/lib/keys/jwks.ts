import { JWKS, JSONWebKeySet, keyType } from 'jose';
import config, { JWKSConfig } from 'config/lib/jwks';

let keystore: JWKS.KeyStore;

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
        return keystore.generate(
          kty as keyType,
          size as
            | number
            | 'Ed25519'
            | 'Ed448'
            | 'X25519'
            | 'X448'
            | 'P-256'
            | 'secp256k1'
            | 'P-384'
            | 'P-521',
          options,
          true
        );
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

export default getKeystore;
