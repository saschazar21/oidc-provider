import { CompactSign } from 'jose/jws/compact/sign';
import { compactVerify } from 'jose/jws/compact/verify';

import { JWKS as config, JWE, JWS, supportedAlgorithms } from 'config/lib/jwks';
import KeyStore from 'utils/lib/util/keystore';
import { JWE as JWEAlg } from 'utils/lib/types/jwe';
import { JWS as JWSAlg } from 'utils/lib/types/jws';

describe('JWKS', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('should throw on malformatted Keystore', async () => {
    const { default: getKeystore } = await import('utils/lib/keys/jwks');
    await expect(getKeystore({ keys: null })).rejects.toThrowError();
  });

  it('creates a new Keystore', async () => {
    const filteredConfig = config.filter(({ kty }) => kty !== 'oct');

    const { default: getKeystore } = await import('utils/lib/keys/jwks');
    const jwks = await (await getKeystore()).export();

    expect(jwks).toHaveProperty('keys');
    expect(jwks.keys).toHaveLength(filteredConfig.length);
  });

  it('reuses an existing Keystore', async () => {
    const { default: getKeystore } = await import('utils/lib/keys/jwks');

    const jwt = { sub: 'test' };
    const algorithms = ['RS256', 'ES256'] as Array<JWEAlg | JWSAlg>;
    const keystore = new KeyStore();
    await Promise.all(
      config.map(async ({ size, options: { alg } }) =>
        keystore.generate(
          alg as JWEAlg | JWSAlg,
          Object.assign(
            {},
            typeof size === 'number' ? { modulusLength: size } : { crv: size }
          ),
          true
        )
      )
    );

    const keys = await keystore.toJWKS(true);
    const inheritedKeystore = await getKeystore(keys);
    const jwks = await inheritedKeystore.toJWKS(true);

    expect(keys.keys.length).toEqual(jwks.keys.length);
    expect(keys.keys).toMatchObject(jwks.keys);

    const signatures = algorithms.map((alg) => keystore.get(alg));
    const verifications = algorithms.map((alg) => inheritedKeystore.get(alg));

    signatures.forEach(async (sign, i) => {
      const test = await new CompactSign(Buffer.from(JSON.stringify(jwt)))
        .setProtectedHeader({ alg: algorithms[i] })
        .sign(sign);

      const { payload } = await compactVerify(test, verifications[i]);
      const claims = JSON.parse(Buffer.from(payload).toString());

      expect(claims).toHaveProperty('sub', jwt.sub);
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
