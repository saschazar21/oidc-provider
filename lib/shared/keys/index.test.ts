import mongoose from 'mongoose';

const MASTER_KEY = 'testkey';

describe('Keys', () => {
  let KeyModel;
  let connection;
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

    const importedDb = await import('~/lib/shared/db');
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

    const { default: getKeys } = await import('~/lib/shared/keys');
    await expect(getKeys()).rejects.toThrowError(
      'ERROR: Masterkey is missing!'
    );
  });

  it('should create a key set', async () => {
    const { default: getKeys } = await import('~/lib/shared/keys');
    keys = await getKeys(MASTER_KEY);

    expect(keys).toHaveProperty('keystore');
    expect(keys).toHaveProperty('keygrip');

    await expect(getKeys(MASTER_KEY)).resolves.toEqual(keys);
  });
});
