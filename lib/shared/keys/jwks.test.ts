import { JWKS, JWT } from 'jose';

import {
  JWKS as config,
  JWE,
  JWS,
  supportedAlgorithms,
} from '~/lib/shared/config/jwks';
import getKeystore from '~/lib/shared/keys/jwks';

describe('JWKS', () => {
  it('should throw on malformatted Keystore', async () => {
    await expect(getKeystore({ keys: null })).rejects.toThrowError();
  });

  it('creates a new Keystore', async () => {
    const jwks = (await getKeystore()).toJWKS();

    expect(jwks).toHaveProperty('keys');
    expect(jwks.keys).toHaveLength(config.length);
  });

  it('reuses an existing Keystore', async () => {
    const jwt = { sub: 'test' };
    const algorithms = ['HS256', 'RS256', 'ES256'];
    const keystore = new JWKS.KeyStore();
    await Promise.all(
      config.map(async ({ kty, size, options }) =>
        keystore.generate(kty as any, size as any, options)
      )
    );

    const keys = keystore.toJWKS(true);
    const inheritedKeystore = await getKeystore(keys);
    const jwks = inheritedKeystore.toJWKS(true);

    expect(keys.keys.length).toEqual(jwks.keys.length);
    expect(keys.keys).toMatchObject(jwks.keys);

    const signatures = algorithms.map(alg => keystore.get({ alg }));
    const verifications = algorithms.map(alg => inheritedKeystore.get({ alg }));

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
