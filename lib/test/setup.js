process.env = {
  MONGO_PASSWORD: 'testpass',
  MONGO_URL: 'mongodb+srv://localhost:27017/jest',
  MONGO_USER: 'dev',
  ...process.env,
};
