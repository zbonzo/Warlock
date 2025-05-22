/**
 * @fileoverview Tests for logger utility
 */

const logger = require('@utils/logger');

describe('Logger', () => {
  let originalConsole;
  let mockConsole;

  beforeEach(() => {
    // Save original console methods
    originalConsole = {
      error: console.error,
      warn: console.warn,
      info: console.info,
      debug: console.debug,
    };

    // Mock console methods
    mockConsole = {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    };

    Object.assign(console, mockConsole);
  });

  afterEach(() => {
    // Restore original console methods
    Object.assign(console, originalConsole);

    // Clear environment variable
    delete process.env.LOG_LEVEL;
  });

  describe('Log Level Filtering', () => {
    test('should log error messages at ERROR level', () => {
      process.env.LOG_LEVEL = 'ERROR';

      // Re-require logger to pick up new env var
      jest.resetModules();
      const testLogger = require('@utils/logger');

      testLogger.error('Error message');
      testLogger.warn('Warning message');
      testLogger.info('Info message');
      testLogger.debug('Debug message');

      expect(mockConsole.error).toHaveBeenCalledTimes(1);
      expect(mockConsole.warn).toHaveBeenCalledTimes(0);
      expect(mockConsole.info).toHaveBeenCalledTimes(0);
      expect(mockConsole.debug).toHaveBeenCalledTimes(0);
    });

    test('should log error and warn messages at WARN level', () => {
      process.env.LOG_LEVEL = 'WARN';

      jest.resetModules();
      const testLogger = require('@utils/logger');

      testLogger.error('Error message');
      testLogger.warn('Warning message');
      testLogger.info('Info message');
      testLogger.debug('Debug message');

      expect(mockConsole.error).toHaveBeenCalledTimes(1);
      expect(mockConsole.warn).toHaveBeenCalledTimes(1);
      expect(mockConsole.info).toHaveBeenCalledTimes(0);
      expect(mockConsole.debug).toHaveBeenCalledTimes(0);
    });

    test('should log all messages except debug at INFO level (default)', () => {
      logger.error('Error message');
      logger.warn('Warning message');
      logger.info('Info message');
      logger.debug('Debug message');

      expect(mockConsole.error).toHaveBeenCalledTimes(1);
      expect(mockConsole.warn).toHaveBeenCalledTimes(1);
      expect(mockConsole.info).toHaveBeenCalledTimes(1);
      expect(mockConsole.debug).toHaveBeenCalledTimes(0);
    });

    test('should log all messages at DEBUG level', () => {
      process.env.LOG_LEVEL = 'DEBUG';

      jest.resetModules();
      const testLogger = require('@utils/logger');

      testLogger.error('Error message');
      testLogger.warn('Warning message');
      testLogger.info('Info message');
      testLogger.debug('Debug message');

      expect(mockConsole.error).toHaveBeenCalledTimes(1);
      expect(mockConsole.warn).toHaveBeenCalledTimes(1);
      expect(mockConsole.info).toHaveBeenCalledTimes(1);
      expect(mockConsole.debug).toHaveBeenCalledTimes(1);
    });
  });

  describe('Message Formatting', () => {
    test('should format messages with timestamp and level', () => {
      logger.info('Test message');

      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringMatching(
          /^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[INFO\] Test message$/
        )
      );
    });

    test('should pass additional arguments to console methods', () => {
      const obj = { key: 'value' };
      const error = new Error('Test error');

      logger.error('Error with data', obj, error);

      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringMatching(/ERROR.*Error with data/),
        obj,
        error
      );
    });
  });
});
