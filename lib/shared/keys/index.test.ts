import mongoose from 'mongoose';
import { randomBytes } from 'crypto';
import { JWKS, keyType } from 'jose';

import JWKSConfig from '~/lib/shared/config/jwks';
import createCookieSecrets from '~/lib/shared/config/keygrip';
import { KeyStructure, clearKeys } from '~/lib/shared/keys';
import connection, { KeyModel } from '~/lib/shared/db';
import { encrypt } from '~/lib/shared/util/aes';

const MASTER_KEY = 'testkey';

describe('Keys', () => {
  let keys: KeyStructure;

  afterAll(async () => {
    await KeyModel.findByIdAndDelete('master');
    mongoose.connection.close();
    clearKeys();
  });

  beforeEach(async () => {
    jest.resetModules();
  });

  it('should throw without masterkey', async () => {
    process.env = {
      ...process.env,
      MASTER_KEY: undefined,
    };

    const { default: getKeys } = await import('~/lib/shared/keys');

    await expect(getKeys()).rejects.toThrowError(
      'ERROR: Masterkey is missing!'
    );
  });

  xit('should create a key set', async () => {
    const { default: getKeys } = await import('~/lib/shared/keys');
    keys = await getKeys(MASTER_KEY);

    expect(keys).toHaveProperty('keystore');
    expect(keys).toHaveProperty('keygrip');
  });

  xit('should fetch the key set from the DB', async () => {
    const model = await connection().then(() => KeyModel.findById('master'));

    expect(model.get('bin')).toBeTruthy();
    expect(model.get('bin').length).toBeGreaterThan(0);
  });

  xit('should return previously created keys', async () => {
    const { default: getKeys } = await import('~/lib/shared/keys');
    await expect(getKeys()).resolves.toMatchObject(keys);
  });
});

xdescribe('Existing Keys', () => {
  let cookies: string[];
  let keystore: JWKS.KeyStore;

  afterAll(async () => {
    await KeyModel.findByIdAndDelete('master');
    mongoose.connection.close();
    clearKeys();
  });

  beforeAll(async () => {
    cookies = await createCookieSecrets();
    keystore = new JWKS.KeyStore();
    JWKSConfig.map(({ kty, size, options }) =>
      keystore.generateSync(
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
        options
      )
    );

    const keys = {
      ...keystore.toJWKS(true),
      cookies,
    };

    const bin = await encrypt(MASTER_KEY, JSON.stringify(keys));

    await connection().then(() =>
      KeyModel.create({
        _id: 'master',
        bin,
      })
    );
  });

  it('should throw without masterkey', async () => {
    process.env = {
      ...process.env,
      MASTER_KEY: undefined,
    };

    const { default: getKeys } = await import('~/lib/shared/keys');
    await expect(getKeys()).rejects.toThrowError(
      'ERROR: Masterkey is missing!'
    );
  });

  it('should throw without correct masterkey', async () => {
    const wrongKey = Buffer.from(randomBytes(32)).toString('base64');
    const { default: getKeys } = await import('~/lib/shared/keys');
    await expect(getKeys(wrongKey)).rejects.toThrowError(
      'Unsupported state or unable to authenticate data'
    );
  });

  it('should retrieve existing keys from DB', async () => {
    process.env = {
      ...process.env,
      MASTER_KEY,
    };

    const { default: getKeys } = await import('~/lib/shared/keys');
    const { keystore: fetchedKeystore }: KeyStructure = await getKeys();

    expect(fetchedKeystore.toJWKS(true)).toMatchObject(keystore.toJWKS(true));
  });
});
