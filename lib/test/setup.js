/* eslint-disable no-undef */
process.env = {
  PROVIDER_URL: 'https://jest.url',
  MASTER_KEY: 'testkey',
  MONGO_PASSWORD: 'testpass',
  MONGO_URL: 'mongodb+srv://localhost:27017/jest',
  MONGO_USER: 'dev',
  ...process.env,
};
