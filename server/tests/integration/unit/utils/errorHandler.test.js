/**
 * @fileoverview Tests for error handler utility
 */

const {
  ErrorTypes,
  createError,
  withSocketErrorHandling,
  throwValidationError,
  throwGameStateError,
  throwPermissionError,
  throwNotFoundError,
} = require('@utils/errorHandler');

describe('Error Handler', () => {
  describe('Error Creation', () => {
    test('should create standardized error object', () => {
      const error = createError(ErrorTypes.VALIDATION, 'Test message', {
        field: 'name',
      });

      expect(error).toMatchObject({
        type: ErrorTypes.VALIDATION,
        message: 'Test message',
        details: { field: 'name' },
        timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      });
    });

    test('should create error with empty details by default', () => {
      const error = createError(ErrorTypes.SERVER, 'Server error');

      expect(error.details).toEqual({});
    });
  });

  describe('Socket Error Handling', () => {
    let mockSocket;

    beforeEach(() => {
      mockSocket = {
        emit: jest.fn(),
      };
    });

    test('should handle successful function execution', async () => {
      const testFn = jest.fn().mockResolvedValue(true);
      const wrappedFn = withSocketErrorHandling(
        mockSocket,
        testFn,
        'test action'
      );

      const result = await wrappedFn('arg1', 'arg2');

      expect(result).toBe(true);
      expect(testFn).toHaveBeenCalledWith('arg1', 'arg2');
      expect(mockSocket.emit).not.toHaveBeenCalled();
    });

    test('should handle known error types gracefully', async () => {
      const error = createError(ErrorTypes.VALIDATION, 'Invalid input');
      const testFn = jest.fn().mockRejectedValue(error);
      const wrappedFn = withSocketErrorHandling(
        mockSocket,
        testFn,
        'test action'
      );

      const result = await wrappedFn();

      expect(result).toBe(false);
      expect(mockSocket.emit).toHaveBeenCalledWith('errorMessage', {
        message: 'Invalid input',
        code: ErrorTypes.VALIDATION,
      });
    });

    test('should handle unknown errors', async () => {
      const error = new Error('Unknown error');
      const testFn = jest.fn().mockRejectedValue(error);
      const wrappedFn = withSocketErrorHandling(
        mockSocket,
        testFn,
        'test action'
      );

      const result = await wrappedFn();

      expect(result).toBe(false);
      expect(mockSocket.emit).toHaveBeenCalledWith('errorMessage', {
        message: 'Unknown error',
        code: ErrorTypes.SERVER,
      });
    });

    test('should handle socket emit failures gracefully', async () => {
      mockSocket.emit.mockImplementation(() => {
        throw new Error('Socket emit failed');
      });

      const error = createError(ErrorTypes.VALIDATION, 'Test error');
      const testFn = jest.fn().mockRejectedValue(error);
      const wrappedFn = withSocketErrorHandling(
        mockSocket,
        testFn,
        'test action'
      );

      // Should not throw even if socket.emit fails
      const result = await wrappedFn();
      expect(result).toBe(false);
    });
  });

  describe('Error Throwing Functions', () => {
    test('should throw validation error', () => {
      expect(() => {
        throwValidationError('Invalid data', { field: 'email' });
      }).toThrow(
        expect.objectContaining({
          type: ErrorTypes.VALIDATION,
          message: 'Invalid data',
          details: { field: 'email' },
        })
      );
    });

    test('should throw game state error', () => {
      expect(() => {
        throwGameStateError('Game already started');
      }).toThrow(
        expect.objectContaining({
          type: ErrorTypes.GAME_STATE,
          message: 'Game already started',
        })
      );
    });

    test('should throw permission error', () => {
      expect(() => {
        throwPermissionError('Access denied');
      }).toThrow(
        expect.objectContaining({
          type: ErrorTypes.PERMISSION,
          message: 'Access denied',
        })
      );
    });

    test('should throw not found error', () => {
      expect(() => {
        throwNotFoundError('Resource not found');
      }).toThrow(
        expect.objectContaining({
          type: ErrorTypes.NOT_FOUND,
          message: 'Resource not found',
        })
      );
    });
  });
});
