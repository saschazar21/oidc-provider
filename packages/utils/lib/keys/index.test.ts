import mongoose from 'mongoose';
import retry from 'jest-retries';

import KeyStore from 'utils/lib/util/keystore';
import { JWE } from 'utils/lib/types/jwe';
import { JWS } from 'utils/lib/types/jws';

const MASTER_KEY = 'testkey';

describe('Keys', () => {
  let KeyModel;
  let connection;
  let getKeys;
  let keys;

  afterAll(async () => mongoose.connection.close());

  afterEach(async () => KeyModel.findByIdAndDelete('master'));

  beforeAll(async () => {
    const importedDb = await import('database/lib');
    connection = importedDb.default;
    KeyModel = importedDb.KeyModel;
    await connection();
  });

  beforeEach(async () => {
    jest.resetModules();

    const importedKeys = await import('utils/lib/keys');
    getKeys = importedKeys.default;
  });

  it('should throw without masterkey', async () => {
    process.env = {
      ...process.env,
      MASTER_KEY: undefined,
    };

    await expect(getKeys()).rejects.toThrowError(
      'ERROR: Masterkey is missing!'
    );
  });

  retry('should create a key set', 10, async () => {
    await KeyModel.findByIdAndDelete('master');
    keys = await getKeys(MASTER_KEY);

    expect(keys).toHaveProperty('keystore');
    expect(keys).toHaveProperty('keygrip');

    await expect(getKeys(MASTER_KEY)).resolves.toEqual(keys);
  });
});

describe('Existing Keys', () => {
  let KeyModel;
  let bin;
  let connection;
  let getKeys;
  let keys;

  afterAll(async () => mongoose.connection.close());

  afterEach(async () => await KeyModel.findByIdAndDelete('master'));

  beforeAll(async () => {
    const { encrypt } = await import('utils/lib/util/aes');
    const { default: JWKSConfig } = await import('config/lib/jwks');
    const { default: createCookieSecrets } = await import('config/lib/keygrip');
    const cookies = await createCookieSecrets();
    const keystore = new KeyStore();

    await Promise.all(
      JWKSConfig.map(({ size, options: { alg } }) =>
        keystore.generate(
          alg as JWE | JWS,
          Object.assign(
            {},
            typeof size === 'number' ? { modulusLength: size } : { crv: size }
          ),
          true
        )
      )
    );
    keys = {
      ...(await keystore.toJWKS(true)),
      cookies,
    };
    bin = await encrypt(MASTER_KEY, JSON.stringify(keys));

    const importedDb = await import('database/lib');
    connection = importedDb.default;
    KeyModel = importedDb.KeyModel;
    await connection();
  });

  beforeEach(async () => {
    jest.resetModules();

    const importedKeys = await import('utils/lib/keys');
    getKeys = importedKeys.default;

    await KeyModel.findByIdAndDelete('master');
  });

  it('should throw when wrong MASTER_KEY given', async () => {
    await KeyModel.findByIdAndDelete('master').then(() =>
      KeyModel.create({
        _id: 'master',
        bin,
      })
    );

    await expect(getKeys('WRONG KEY')).rejects.toThrowError();
  });

  it('should fetch existing keys from DB', async () => {
    await KeyModel.findByIdAndDelete('master').then(() =>
      KeyModel.create({
        _id: 'master',
        bin,
      })
    );

    const original = keys.keys;
    const { keystore } = await getKeys(MASTER_KEY);

    expect(await keystore.toJWKS(true)).toMatchObject({ keys: original });
  });
});
