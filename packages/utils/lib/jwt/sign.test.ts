import { getUrl } from 'config/lib/url';
import { JWKS, JWT } from 'jose';

import { KeyModel } from 'database/lib';
import connection, { disconnect } from 'database/lib/connect';
import { JWTAuth } from 'utils/lib/jwt/helpers';
import sign, { verify } from 'utils/lib/jwt/sign';
import getKeys from 'utils/lib/keys';
import { RESPONSE_TYPE } from 'utils/lib/types/response_type';
import { SCOPE } from 'utils/lib/types/scope';
import { CLAIM } from 'utils/lib/types/claim';

describe('JWT Sign', () => {
  let keys: JWKS.KeyStore;

  const auth = {
    scope: [SCOPE.OPENID],
    response_type: [RESPONSE_TYPE.ID_TOKEN],
    updated_at: new Date(),
    user: 'testuser',
    client_id: 'testclient',
  };

  afterAll(async () => {
    await connection();
    await KeyModel.findByIdAndDelete('master');

    await disconnect();
  });

  beforeAll(async () => {
    await connection();

    const { keystore } = await getKeys();
    keys = keystore;

    await disconnect();
  });

  it('signs a JWT using default settings (HS256)', async () => {
    const signed = await sign(auth);

    const [header] = signed.split('.');
    const { alg } = JSON.parse(Buffer.from(header, 'base64').toString('utf-8'));

    const result = JWT.verify(signed, keys.get({ alg, use: 'sig' })) as {
      [key in CLAIM]: string | number;
    };

    expect(result.aud).toEqual(auth.client_id);
    expect(result.sub).toEqual(auth.user);
    expect(result.auth_time).toEqual(
      Math.floor(auth.updated_at.valueOf() * 0.001)
    );
    expect(result.iss).toEqual(getUrl());
  });

  it('signs a JWT using RS256 algorithm', async () => {
    const signed = await sign(auth, 'RS256');

    const [header] = signed.split('.');
    const { alg } = JSON.parse(Buffer.from(header, 'base64').toString('utf-8'));

    const result = JWT.verify(
      signed,
      keys.get({ alg, use: 'sig' }).toPEM()
    ) as {
      [key in CLAIM]: string | number;
    };

    expect(result.aud).toEqual(auth.client_id);
    expect(result.sub).toEqual(auth.user);
    expect(result.auth_time).toEqual(
      Math.floor(auth.updated_at.valueOf() * 0.001)
    );
    expect(result.iss).toEqual(getUrl());
  });

  it('signs a JWT using ES256 algorithm', async () => {
    const signed = await sign(auth, 'ES256');

    const [header] = signed.split('.');
    const { alg } = JSON.parse(Buffer.from(header, 'base64').toString('utf-8'));

    const result = JWT.verify(
      signed,
      keys.get({ alg, use: 'sig' }).toPEM()
    ) as {
      [key in CLAIM]: string | number;
    };

    expect(result.aud).toEqual(auth.client_id);
    expect(result.sub).toEqual(auth.user);
    expect(result.auth_time).toEqual(
      Math.floor(auth.updated_at.valueOf() * 0.001)
    );
    expect(result.iss).toEqual(getUrl());
  });

  it('verifies signed JWT', async () => {
    const signed = await sign(auth);
    const verified = await verify(signed);

    expect(verified.sub).toEqual(auth.user);
    expect(verified.aud).toEqual(auth.client_id);
  });

  it('fails to verify invalid signature', async () => {
    const signed = await sign(auth);
    await expect(verify(`${signed}_invalid`)).rejects.toThrowError();
  });

  it('fails to sign JWT, when insufficient claims given', async () => {
    const { user, ...newAuth } = {
      ...auth,
      scope: [SCOPE.OPENID, SCOPE.PROFILE],
    };
    await expect(sign(newAuth as JWTAuth)).rejects.toThrowError();
  });

  it('throws error, when unsupported algorithm is given', async () => {
    await expect(sign(auth, 'asdf' as 'none')).rejects.toThrowError();
  });
});
