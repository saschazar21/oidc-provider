import mongoose from 'mongoose';
import { randomBytes } from 'crypto';

import connect from '../connect';
import KeyModel from './key';

describe('KeyModel', () => {
  const _id = 'testmaster';

  afterAll(async () => {
    await KeyModel.findByIdAndDelete('testmaster');
    mongoose.connection.close();
  });

  beforeAll(async () => {
    await connect();
  });

  it('creates a Key entry', async () => {
    const key = {
      _id,
      bin: randomBytes(64),
    };

    const model = await KeyModel.create(key);
    expect(model).toHaveProperty('_id', _id);
    expect(model).toHaveProperty('createdAt');
  });

  it('updates a Key entry', async () => {
    const original = await KeyModel.findById(_id);
    const updated = await KeyModel.findByIdAndUpdate(
      _id,
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
