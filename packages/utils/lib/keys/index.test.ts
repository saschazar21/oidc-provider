import mongoose from 'mongoose';
import { JWKS, keyType } from 'jose';
import retry from 'jest-retries';

const MASTER_KEY = 'testkey';

describe('Keys', () => {
  let KeyModel;
  let connection;
  let getKeys;
  let keys;

  afterEach(async () => {
    await connection().then(() => KeyModel.findByIdAndDelete('master'));
    mongoose.connection.close();
  });

  beforeEach(async () => {
    jest.resetModules();

    const [importedDb, importedKeys] = await Promise.all([
      import('database/lib'),
      import('utils/lib/keys'),
    ]);
    getKeys = importedKeys.default;
    connection = importedDb.default;
    KeyModel = importedDb.KeyModel;
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
    await connection().then(() => KeyModel.findByIdAndDelete('master'));
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

  afterEach(async () => {
    await connection().then(() => KeyModel.findByIdAndDelete('master'));
    mongoose.connection.close();
  });

  beforeAll(async () => {
    const { encrypt } = await import('utils/lib/util/aes');
    const { default: JWKSConfig } = await import('utils/lib/config/jwks');
    const { default: createCookieSecrets } = await import(
      'utils/lib/config/keygrip'
    );
    const cookies = await createCookieSecrets();
    const keystore = new JWKS.KeyStore();
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
    keys = {
      ...keystore.toJWKS(true),
      cookies,
    };
    bin = await encrypt(MASTER_KEY, JSON.stringify(keys));
  });

  beforeEach(async () => {
    jest.resetModules();

    const [importedDb, importedKeys] = await Promise.all([
      import('database/lib'),
      import('utils/lib/keys'),
    ]);
    getKeys = importedKeys.default;
    connection = importedDb.default;
    KeyModel = importedDb.KeyModel;

    await connection().then(() => KeyModel.findByIdAndDelete('master'));
  });

  xit('should throw when wrong MASTER_KEY given', async () => {
    await expect(getKeys('WRONG KEY')).rejects.toThrowError();
  });

  it('should fetch existing keys from DB', async () => {
    await connection()
      .then(() => KeyModel.findByIdAndDelete('master'))
      .then(() =>
        KeyModel.create({
          _id: 'master',
          bin,
        })
      );

    const original = keys.keys;
    const { keystore } = await getKeys(MASTER_KEY);

    expect(keystore.toJWKS(true)).toMatchObject({ keys: original });
  });
});