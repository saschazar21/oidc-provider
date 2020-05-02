import { JWKS, JWT, keyType } from 'jose';

import {
  JWKS as config,
  JWE,
  JWS,
  supportedAlgorithms,
} from '~/lib/shared/config/jwks';

describe('JWKS', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('should throw on malformatted Keystore', async () => {
    const { default: getKeystore } = await import('~/lib/shared/keys/jwks');
    await expect(getKeystore({ keys: null })).rejects.toThrowError();
  });

  it('creates a new Keystore', async () => {
    const { default: getKeystore } = await import('~/lib/shared/keys/jwks');
    const jwks = (await getKeystore()).toJWKS();

    expect(jwks).toHaveProperty('keys');
    expect(jwks.keys).toHaveLength(config.length);
  });

  it('reuses an existing Keystore', async () => {
    const { default: getKeystore } = await import('~/lib/shared/keys/jwks');

    const jwt = { sub: 'test' };
    const algorithms = ['HS256', 'RS256', 'ES256'];
    const keystore = new JWKS.KeyStore();
    await Promise.all(
      config.map(async ({ kty, size, options }) =>
        keystore.generate(
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
        ),
      ),
    );

    const keys = keystore.toJWKS(true);
    const inheritedKeystore = await getKeystore(keys);
    const jwks = inheritedKeystore.toJWKS(true);

    expect(keys.keys.length).toEqual(jwks.keys.length);
    expect(keys.keys).toMatchObject(jwks.keys);

    const signatures = algorithms.map((alg) => keystore.get({ alg }));
    const verifications = algorithms.map((alg) =>
      inheritedKeystore.get({ alg }),
    );

    signatures.forEach((sign, i) => {
      const test = JWT.sign(jwt, sign);
      expect(JWT.verify(test, signatures[i])).toHaveProperty('sub', jwt.sub);
      expect(JWT.verify(test, verifications[i])).toHaveProperty('sub', jwt.sub);
    });
  });
});

describe('Configuration', () => {
  it('returns supported JWE algorithms', () => {
    expect(supportedAlgorithms('JWE')).toHaveLength(JWE.length);
  });

  it('returns supported JWS algorithms', () => {
    expect(supportedAlgorithms('JWS')).toHaveLength(JWS.length);
  });
});
