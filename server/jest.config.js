/**
 * @fileoverview Jest configuration for server tests
 */
module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Coverage settings
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',

  // Module name mapper for path aliases
  moduleNameMapper: {
    '^@config(.*)$': '<rootDir>/config/$1',
    '^@models(.*)$': '<rootDir>/models/$1',
    '^@middleware(.*)$': '<rootDir>/middleware$1',
    '^@controllers(.*)$': '<rootDir>/controllers$1',
    '^@middlewares(.*)$': '<rootDir>/middlewares$1',
    '^@tests(.*)$': '<rootDir>/tests$1',

    '^@routes(.*)$': '<rootDir>/routes$1',
    '^@services(.*)$': '<rootDir>/services$1',
    '^@utils(.*)$': '<rootDir>/utils$1',
    '^@shared(.*)$': '<rootDir>/shared$1',
    '^@tests(.*)$': '<rootDir>/tests$1',
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Paths to modules that run some code to configure the testing environment
  setupFiles: ['<rootDir>/tests/setupEnv.js'],

  // Test match pattern
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],

  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    'config/environments/test',
  ],

  // Transform files
  transform: {},

  // Ignore paths
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
};
