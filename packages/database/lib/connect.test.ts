import mongoose, { Mongoose } from 'mongoose';

describe('MongoDB Connection', () => {
  let OLD_ENV;

  afterEach(() => {
    mongoose.connection.close();
  });

  beforeAll(() => {
    OLD_ENV = { ...process.env };
  });

  beforeEach(() => {
    jest.resetModules();
  });

  it('should include user, pass when NODE_ENV != test', async () => {
    process.env = {
      ...OLD_ENV,
      NODE_ENV: 'development',
    };
    const { config } = await import('./connect');

    expect(config).toHaveProperty('user');
    expect(config).toHaveProperty('pass');
  });

  it('should not include user, pass when NODE_ENV == test', async () => {
    process.env = {
      ...OLD_ENV,
    };
    const { config } = await import('./connect');

    expect(config).not.toHaveProperty('user');
    expect(config).not.toHaveProperty('pass');
  });

  it('connects', async () => {
    process.env = {
      ...OLD_ENV,
    };
    const { default: connect } = await import('./connect');
    const connection: Promise<Mongoose> = connect();

    await expect(connection).resolves.toBeTruthy();
  });
});

describe('MongoDB Configuration', () => {
  let OLD_ENV;

  beforeAll(() => {
    OLD_ENV = { ...process.env };
  });

  beforeEach(() => {
    jest.resetModules();
  });

  it('returns valid configuration object', async () => {
    const mapping = {
      password: OLD_ENV.MONGO_PASSWORD,
      url: OLD_ENV.MONGO_URL,
      user: OLD_ENV.MONGO_USER,
    };

    const { default: connectionDetails } = await import('config/lib/db');

    expect(connectionDetails()).toMatchObject(mapping);
  });

  it('throws Error when MONGO_PASSWORD is unset', async () => {
    process.env = {
      ...OLD_ENV,
      MONGO_PASSWORD: undefined,
    };
    const { default: connectionDetails } = await import('config/lib/db');

    expect(process.env.MONGO_PASSWORD).not.toBeDefined();
    expect(connectionDetails).toThrowError();
  });

  it('throws Error when MONGO_USER is unset', async () => {
    process.env = {
      ...OLD_ENV,
      MONGO_USER: undefined,
    };
    const { default: connectionDetails } = await import('config/lib/db');

    expect(process.env.MONGO_USER).not.toBeDefined();
    expect(connectionDetails).toThrowError();
  });

  it('throws Error when MONGO_URL is unset', async () => {
    process.env = {
      ...OLD_ENV,
      MONGO_URL: undefined,
    };
    const { default: connectionDetails } = await import('config/lib/db');

    expect(process.env.MONGO_URL).not.toBeDefined();
    expect(connectionDetails).toThrowError();
  });
});
