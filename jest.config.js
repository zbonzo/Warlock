/** @type {import('jest').Config} */
const config = {
  projects: [
    {
      displayName: 'server',
      testMatch: ['<rootDir>/tests/server/**/*.test.ts'],
      testEnvironment: 'node',
      transform: {
        '^.+\\.tsx?$': [
          'ts-jest',
          {
            tsconfig: {
              module: 'commonjs',
              moduleResolution: 'node',
              esModuleInterop: true,
              allowJs: true,
              resolveJsonModule: true,
              strict: false,
              skipLibCheck: true,
            },
            diagnostics: false,
          },
        ],
      },
      moduleNameMapper: {
        // Strip .js extensions from relative imports (server uses ESM-style imports)
        '^(\\.{1,2}\\/.+)\\.js$': '$1',
        // Server path aliases
        '^@models/(.*)$': '<rootDir>/server/models/$1',
        '^@config/(.*)$': '<rootDir>/server/config/$1',
        '^@controllers/(.*)$': '<rootDir>/server/controllers/$1',
        '^@middleware/(.*)$': '<rootDir>/server/middleware/$1',
        '^@services/(.*)$': '<rootDir>/server/services/$1',
        '^@utils/(.*)$': '<rootDir>/server/utils/$1',
        '^@shared/(.*)$': '<rootDir>/shared/$1',
        '^@messages$': '<rootDir>/server/config/messages/index',
      },
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
    },
    {
      displayName: 'client',
      testMatch: ['<rootDir>/tests/client/**/*.test.{ts,tsx}'],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/client/src/setupTests.ts'],
      transform: {
        '^.+\\.tsx?$': [
          'ts-jest',
          {
            tsconfig: {
              module: 'commonjs',
              moduleResolution: 'node',
              jsx: 'react-jsx',
              esModuleInterop: true,
              allowJs: true,
              resolveJsonModule: true,
              strict: false,
              skipLibCheck: true,
            },
            diagnostics: false,
          },
        ],
      },
      moduleNameMapper: {
        // Client path aliases (baseUrl is client/src)
        '^@/(.*)$': '<rootDir>/client/src/$1',
        '^@components/(.*)$': '<rootDir>/client/src/components/$1',
        '^@pages/(.*)$': '<rootDir>/client/src/pages/$1',
        '^@hooks/(.*)$': '<rootDir>/client/src/hooks/$1',
        '^@utils/(.*)$': '<rootDir>/client/src/utils/$1',
        '^@types/(.*)$': '<rootDir>/client/src/types/$1',
        '^@contexts/(.*)$': '<rootDir>/client/src/contexts/$1',
        '^@config/(.*)$': '<rootDir>/client/src/config/$1',
        '^@shared/(.*)$': '<rootDir>/shared/$1',
        // Mock static assets
        '\\.css$': '<rootDir>/tests/__mocks__/fileMock.js',
        '\\.(svg|png|jpg|jpeg|gif|webp|ico)$': '<rootDir>/tests/__mocks__/fileMock.js',
      },
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
    },
  ],
};

module.exports = config;
