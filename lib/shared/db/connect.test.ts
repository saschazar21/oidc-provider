import mongoose, { Mongoose } from 'mongoose';

import connect, { config as defaultConfig } from '~/lib/shared/db/connect';

describe('MongoDB Connection', () => {
  it('connects', async () => {
    jest.setTimeout(20000);
    const { user, pass, ...config } = defaultConfig;
    const connection: Promise<Mongoose> = connect(config);

    await expect(connection).resolves.toBeTruthy();
    mongoose.connection.close();
  });
});
