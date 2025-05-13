/**
 * @fileoverview Jest setup file for server tests
 * Sets up global test utilities and matchers
 */

// Enable more helpful Jest matchers
require('@jest/globals');

// Set up console spy to capture and check output
global.consoleSpy = {
  log: jest.spyOn(console, 'log').mockImplementation(),
  warn: jest.spyOn(console, 'warn').mockImplementation(),
  error: jest.spyOn(console, 'error').mockImplementation()
};

// Add custom matchers if needed
expect.extend({
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false
      };
    }
  }
});

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
  
  // Clear console spies
  global.consoleSpy.log.mockClear();
  global.consoleSpy.warn.mockClear();
  global.consoleSpy.error.mockClear();
});

// Global teardown
afterAll(() => {
  jest.restoreAllMocks();
});