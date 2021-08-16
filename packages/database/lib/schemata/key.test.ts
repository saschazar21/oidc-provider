import { randomBytes } from 'crypto';

import connect, {
  disconnect,
} from '@saschazar/oidc-provider-database/lib/connect';
import KeyModel from '@saschazar/oidc-provider-database/lib/schemata/key';

describe('KeyModel', () => {
  const _id = 'testmaster';

  afterAll(async () => {
    await connect();
    await KeyModel.findByIdAndDelete('testmaster');
    await disconnect();
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
    expect(model).toHaveProperty('created_at');
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
    expect(updated).toHaveProperty('updated_at');
  });
});
