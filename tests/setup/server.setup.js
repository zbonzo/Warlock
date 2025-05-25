/**
 * Setup for Node.js/server-side tests
 */

// Set test environment
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.LOG_LEVEL = 'warn';

// Enable more helpful Jest matchers
require('@jest/globals');

// Add custom matchers
expect.extend({
  toBeOneOf(received, validOptions) {
    const pass = validOptions.includes(received);
    return {
      message: () =>
        pass
          ? `expected ${received} not to be one of ${validOptions.join(', ')}`
          : `expected ${received} to be one of ${validOptions.join(', ')}`,
      pass,
    };
  },

  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    return {
      message: () =>
        pass
          ? `expected ${received} not to be within range ${floor} - ${ceiling}`
          : `expected ${received} to be within range ${floor} - ${ceiling}`,
      pass,
    };
  },
});

// Global cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

// Global teardown
afterAll(() => {
  jest.restoreAllMocks();
});
