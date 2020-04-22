import mongoose from 'mongoose';
import { randomBytes } from 'crypto';

import connect, { config as defaultConfig } from '~/lib/shared/db/connect';
import Key from '~/lib/shared/db/schemata/key';

describe('Key', () => {
  afterAll(() => mongoose.connection.close());

  beforeAll(async () => {
    const { user, pass, ...config } = defaultConfig;
    await connect(config);
  });

  it('creates a Key entry', async () => {
    const key = {
      _id: 'master',
      bin: randomBytes(64),
    };

    const model = await Key.create(key);
    expect(model).toHaveProperty('_id', 'master');
    expect(model).toHaveProperty('createdAt');
  });

  it('updates a Key entry', async () => {
    const original = await Key.findById('master');
    const updated = await Key.findByIdAndUpdate(
      'master',
      {
        $set: {
          bin: randomBytes(64),
        },
      },
      { new: true }
    );

    expect(original.get('_id')).toEqual(updated.get('_id'));
    expect(original.get('bin')).not.toMatchObject(updated.get('bin'));
    expect(updated).toHaveProperty('updatedAt');
  });
});
