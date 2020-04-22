import mongoose, { Mongoose, ConnectionOptions } from 'mongoose';

import connectionDetails from '~/lib/shared/config/db';

const { password: pass, url, user } = connectionDetails();

export const config: ConnectionOptions = {
  authSource: 'admin',
  pass,
  useNewUrlParser: true,
  useUnifiedTopology: true,
  user,
};

const connection = async (custom?: ConnectionOptions): Promise<Mongoose> =>
  mongoose.connect(url, custom || config);

export default connection;
