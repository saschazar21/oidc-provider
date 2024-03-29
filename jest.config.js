// eslint-disable-next-line no-undef
module.exports = {
  preset: '@shelf/jest-mongodb',
  roots: ['<rootDir>/lib', '<rootDir>/packages'],
  setupFiles: ['<rootDir>/lib/test/setup.js'],
  testMatch: ['**/*.test.ts'],
  watchPathIgnorePatterns: ['globalConfig'],
  moduleNameMapper: {
    '^jose/(.*)$': '<rootDir>/node_modules/jose/dist/node/cjs/$1',
  },
};
