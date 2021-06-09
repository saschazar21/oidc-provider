import mongoose, { Mongoose, ConnectionOptions } from 'mongoose';

import connectionDetails from 'database/lib/config';

const { password: pass, url, user } = connectionDetails();

export const config: ConnectionOptions = Object.assign(
  {},
  {
    authSource: 'admin',
    useFindAndModify: false,
    useNewUrlParser: true,
    useUnifiedTopology: true,
  },
  process.env.NODE_ENV !== 'test' ? { pass, user } : null
);

const connection = async (custom?: ConnectionOptions): Promise<Mongoose> =>
  mongoose.connect(url, custom || config);

export const disconnect = async (force?: boolean): Promise<void> =>
  mongoose.connection.close(force);

export default connection;
