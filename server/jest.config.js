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
    '^@config$': '<rootDir>/config/index.js',
    '^@config/(.*)$': '<rootDir>/config/$1',

    '^@models$': '<rootDir>/models/index.js',
    '^@models/(.*)$': '<rootDir>/models/$1',

    '^@middleware$': '<rootDir>/middleware/index.js',
    '^@middleware/(.*)$': '<rootDir>/middleware/$1',

    '^@controllers$': '<rootDir>/controllers/index.js',
    '^@controllers/(.*)$': '<rootDir>/controllers/$1',

    '^@routes$': '<rootDir>/routes/index.js',
    '^@routes/(.*)$': '<rootDir>/routes/$1',

    '^@services$': '<rootDir>/services/index.js',
    '^@services/(.*)$': '<rootDir>/services/$1',

    '^@utils$': '<rootDir>/utils/index.js',
    '^@utils/(.*)$': '<rootDir>/utils/$1',

    '^@shared$': '<rootDir>/shared/index.js',
    '^@shared/(.*)$': '<rootDir>/shared/$1',

    '^@tests/(.*)$': '<rootDir>/tests/$1',
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Paths to modules that run some code to configure the testing environment
  setupFiles: ['<rootDir>/tests/setupEnv.js'],

  // Test match pattern
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],

  // Test path ignore patterns (consolidated)
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    'config/environments/test',
  ],

  // Transform files (if you need Babel/TypeScript transformation, configure it here)
  transform: {},
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
};
