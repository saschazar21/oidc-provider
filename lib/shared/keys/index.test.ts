import mongoose from 'mongoose';
import { randomBytes } from 'crypto';

import getKeys from '~/lib/shared/keys';
import connection, { KeyModel } from '~/lib/shared/db';

let masterkey: string;

describe('Keys', () => {
  afterAll(async () => {
    await KeyModel.findByIdAndDelete('master');
    mongoose.connection.close();
  });

  beforeAll(() => {
    masterkey = Buffer.from(randomBytes(32)).toString('base64');
  });

  it('should create a key set', async () => {
    const keys = await getKeys(masterkey);

    expect(keys).toHaveProperty('keys');
    expect(keys).toHaveProperty('cookies');
  });

  it('should fetch the key set from the DB', async () => {
    const model = await connection().then(() => KeyModel.findById('master'));

    expect(model.get('bin')).toBeTruthy();
    expect(model.get('bin').length).toBeGreaterThan(0);
  });
});
