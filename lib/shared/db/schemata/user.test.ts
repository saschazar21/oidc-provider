import mongoose from 'mongoose';

import connect, { UserModel } from '~/lib/shared/db';

describe('UserModel', () => {
  let sub: string;
  const baseData = {
    email: 'john.doe@test.com',
    password: 'a test password',
  };

  afterAll(async () => {
    await UserModel.findByIdAndDelete(sub);
    mongoose.connection.close();
  });

  beforeAll(async () => {
    await connect();
  });

  it('creates a basic user', async () => {
    const user = await UserModel.create(baseData);
    sub = user.get('sub');

    const match = await (user as any).comparePassword(baseData.password);

    expect(user.get('sub')).toEqual(user.get('_id'));
    expect(user.get('password')).not.toEqual(baseData.password);
    expect(match).toBeTruthy();
  });

  it('updates a password', async () => {
    const old = await UserModel.findById(sub);
    const oldPassword = old.get('password');
    const updated = await UserModel.findByIdAndUpdate(
      sub,
      {
        password: 'a new password',
      },
      { new: true }
    );

    expect(updated.get('password')).not.toEqual(oldPassword);
    expect(updated.get('password')).not.toEqual('a new password');
    expect(updated.get('__v')).toBeGreaterThan(0);
  });
});
