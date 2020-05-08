// eslint-disable-next-line no-undef
module.exports = {
  moduleNameMapper: {
    '^~/(.*)': '<rootDir>/$1',
  },
  preset: '@shelf/jest-mongodb',
  setupFiles: ['<rootDir>/lib/test/setup.js'],
};
