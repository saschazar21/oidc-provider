require('dotenv').config();

module.exports = {
  globals: { ...process.env },
  moduleNameMapper: {
    '^~/(.*)': '<rootDir>/$1',
  },
  preset: '@shelf/jest-mongodb',
  testEnvironment: 'node',
};
