import mongoose, { Mongoose } from 'mongoose';

import connect from '~/lib/shared/db/connect';

describe('MongoDB Connection', () => {
  afterEach(() => {
    mongoose.connection.close();
  });

  it('connects', async () => {
    const connection: Promise<Mongoose> = connect();

    await expect(connection).resolves.toBeTruthy();
  });
});
