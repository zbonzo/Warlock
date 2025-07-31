module.exports = {
  projects: [
    // Client tests - external to client codebase
    {
      displayName: 'client',
      testMatch: ['<rootDir>/tests/client/**/*.test.(js|jsx)'],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/tests/setup/client.setup.js'],
      moduleNameMapper: {
        // Map to actual client source
        '^@client/(.*)$': '<rootDir>/client/src/$1',
        // Handle CSS and assets
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/tests/mocks/fileMock.js',
      },
      transform: {
        '^.+\\.(js|jsx)$': [
          'babel-jest',
          {
            presets: [
              ['@babel/preset-env', { targets: { node: 'current' } }],
              ['@babel/preset-react', { runtime: 'automatic' }],
            ],
          },
        ],
      },
      collectCoverageFrom: [
        'client/src/**/*.{js,jsx}',
        '!client/src/index.js',
        '!client/src/reportWebVitals.js',
      ],
    },

    // Client TypeScript tests - external to client codebase
    {
      displayName: 'client-ts',
      testMatch: ['<rootDir>/tests/client/**/*.test.(ts|tsx)'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/tests/setup/client.setup.js'],
      preset: 'ts-jest',
      moduleNameMapper: {
        // Map to actual client source
        '^@client/(.*)$': '<rootDir>/client/src/$1',
        // Handle CSS and assets
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/tests/mocks/fileMock.js',
      },
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
          tsconfig: {
            jsx: 'react-jsx',
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
          },
        }],
      },
      collectCoverageFrom: [
        'client/src/**/*.{ts,tsx}',
        '!client/src/index.tsx',
        '!client/src/reportWebVitals.ts',
        '!**/*.d.ts',
      ],
    },

    // Server tests - external to server codebase
    {
      displayName: 'server',
      testMatch: ['<rootDir>/tests/server/**/*.test.js'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/tests/setup/server.setup.js'],
      moduleNameMapper: {
        // Map to actual server source with aliases
        '^@config$': '<rootDir>/server/config/index.js',
        '^@config/(.*)$': '<rootDir>/server/config/$1',
        '^@models$': '<rootDir>/server/models/index.js',
        '^@models/(.*)$': '<rootDir>/server/models/$1',
        '^@middleware$': '<rootDir>/server/middleware/index.js',
        '^@middleware/(.*)$': '<rootDir>/server/middleware/$1',
        '^@controllers$': '<rootDir>/server/controllers/index.js',
        '^@controllers/(.*)$': '<rootDir>/server/controllers/$1',
        '^@routes$': '<rootDir>/server/routes/index.js',
        '^@routes/(.*)$': '<rootDir>/server/routes/$1',
        '^@services$': '<rootDir>/server/services/index.js',
        '^@services/(.*)$': '<rootDir>/server/services/$1',
        '^@utils$': '<rootDir>/server/utils/index.js',
        '^@utils/(.*)$': '<rootDir>/server/utils/$1',
        '^@shared$': '<rootDir>/server/shared/index.js',
        '^@shared/(.*)$': '<rootDir>/server/shared/$1',
        // Direct path mapping
        '^@server/(.*)$': '<rootDir>/server/$1',
      },
      collectCoverageFrom: [
        'server/**/*.js',
        '!server/index.js',
        '!server/config/environments/**',
      ],
    },

    // Server TypeScript tests - external to server codebase
    {
      displayName: 'server-ts',
      testMatch: ['<rootDir>/tests/server/**/*.test.ts'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/tests/setup/server.setup.js'],
      preset: 'ts-jest',
      moduleNameMapper: {
        // Map to actual server source with aliases - mixed JS/TS files
        '^@config$': '<rootDir>/server/config/index.ts',
        '^@config/(.*)$': '<rootDir>/server/config/$1',
        '^@models$': '<rootDir>/server/models/index.js',
        '^@models/(.*)$': '<rootDir>/server/models/$1',
        '^@middleware$': '<rootDir>/server/middleware/index.js',
        '^@middleware/(.*)$': '<rootDir>/server/middleware/$1',
        '^@controllers$': '<rootDir>/server/controllers/index.js',
        '^@controllers/(.*)$': '<rootDir>/server/controllers/$1',
        '^@routes$': '<rootDir>/server/routes/index.js',
        '^@routes/(.*)$': '<rootDir>/server/routes/$1',
        '^@services$': '<rootDir>/server/services/index.js',
        '^@services/(.*)$': '<rootDir>/server/services/$1',
        '^@utils$': '<rootDir>/server/utils/index.js',
        '^@utils/(.*)$': '<rootDir>/server/utils/$1',
        '^@shared$': '<rootDir>/server/shared/index.js',
        '^@shared/(.*)$': '<rootDir>/server/shared/$1',
        // Direct path mapping
        '^@server/(.*)$': '<rootDir>/server/$1',
      },
      collectCoverageFrom: [
        'server/**/*.ts',
        '!server/index.ts',
        '!server/config/environments/**',
        '!**/*.d.ts',
      ],
    },

    // Integration tests - testing interactions between client/server
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/tests/integration/**/*.test.js'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/tests/setup/integration.setup.js'],
      moduleNameMapper: {
        '^@client/(.*)$': '<rootDir>/client/src/$1',
        '^@server/(.*)$': '<rootDir>/server/$1',
        '^@config$': '<rootDir>/server/config/index.js',
        '^@models$': '<rootDir>/server/models/index.js',
        '^@services$': '<rootDir>/server/services/index.js',
        '^@controllers$': '<rootDir>/server/controllers/index.js',
      },
      testTimeout: 15000,
    },

    // End-to-end tests
    {
      displayName: 'e2e',
      testMatch: ['<rootDir>/tests/e2e/**/*.test.js'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/tests/setup/e2e.setup.js'],
      testTimeout: 30000,
    },
  ],

  // Root directory is where tests live
  rootDir: '.',

  // Coverage collection from source, not tests
  collectCoverage: false,
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  // Global setup
  globalSetup: '<rootDir>/tests/setup/global.setup.js',
  globalTeardown: '<rootDir>/tests/setup/global.teardown.js',

  // Ignore patterns - keep tests separate from source
  testPathIgnorePatterns: [
    '/node_modules/',
    '/client/node_modules/',
    '/server/node_modules/',
    '/client/build/',
    '/server/dist/',
    '/client/src/', // Don't look for tests in source
    '/server/', // Don't look for tests in source (except via explicit testMatch)
  ],

  // Watch patterns
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/client/build/',
    '/server/dist/',
  ],

  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  maxWorkers: '50%',
};
