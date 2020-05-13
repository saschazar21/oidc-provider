import mongoose from 'mongoose';
import { JWKS, keyType } from 'jose';

const MASTER_KEY = 'testkey';

describe('Keys', () => {
  let KeyModel;
  let connection;
  let getKeys;
  let keys;

  afterEach(async () => {
    try {
      await connection().then(() => KeyModel.findByIdAndDelete('master'));
    } finally {
      mongoose.connection.close();
    }
  });

  beforeEach(async () => {
    jest.resetModules();

    const [importedDb, importedKeys] = await Promise.all([
      import('~/lib/shared/db'),
      import('~/lib/shared/keys'),
    ]);
    getKeys = importedKeys.default;
    connection = importedDb.default;
    KeyModel = importedDb.KeyModel;

    try {
      await connection().then(() => KeyModel.findByIdAndDelete('master'));
    } catch (e) {
      console.log(e);
    }
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

  it('should create a key set', async () => {
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
    try {
      await connection().then(() => KeyModel.findByIdAndDelete('master'));
    } finally {
      mongoose.connection.close();
    }
  });

  beforeAll(async () => {
    const { encrypt } = await import('~/lib/shared/util/aes');
    const { default: JWKSConfig } = await import('~/lib/shared/config/jwks');
    const { default: createCookieSecrets } = await import(
      '~/lib/shared/config/keygrip'
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
      import('~/lib/shared/db'),
      import('~/lib/shared/keys'),
    ]);
    getKeys = importedKeys.default;
    connection = importedDb.default;
    KeyModel = importedDb.KeyModel;

    try {
      await connection().then(() => KeyModel.findByIdAndDelete('master'));
    } catch (e) {
      console.log(e);
    }
  });

  xit('should throw when wrong MASTER_KEY given', async () => {
    await expect(getKeys('WRONG KEY')).rejects.toThrowError();
  });

  it('should fetch existing keys from DB', async () => {
    await connection().then(() =>
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
