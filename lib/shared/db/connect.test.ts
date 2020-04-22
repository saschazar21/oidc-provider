import mongoose, { Mongoose } from 'mongoose';

import connect from '~/lib/shared/db/connect';

describe('MongoDB Connection', () => {
  it('connects', async () => {
    const connection: Promise<Mongoose> = connect();

    await expect(connection).resolves.toBeTruthy();
    mongoose.connection.close();
  });
});
