import mongoose from 'mongoose';
import { randomBytes } from 'crypto';

import connect from '~/lib/shared/db/connect';
import KeyModel from '~/lib/shared/db/schemata/key';

describe('KeyModel', () => {
  afterAll(async () => {
    await KeyModel.findByIdAndDelete('master');
    mongoose.connection.close();
  });

  beforeAll(async () => {
    await connect();
  });

  it('creates a Key entry', async () => {
    const key = {
      _id: 'master',
      bin: randomBytes(64),
    };

    const model = await KeyModel.create(key);
    expect(model).toHaveProperty('_id', 'master');
    expect(model).toHaveProperty('createdAt');
  });

  it('updates a Key entry', async () => {
    const original = await KeyModel.findById('master');
    const updated = await KeyModel.findByIdAndUpdate(
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
