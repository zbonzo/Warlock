/**
 * @fileoverview Tests for SocketValidationMiddleware
 */
import { Socket } from 'socket.io';
import { z } from 'zod';
import {
  SocketValidationMiddleware,
  socketValidator,
  SocketValidators,
  ValidationOptions,
  ValidationError
} from '../../../server/middleware/socketValidation';
import { ValidationMiddleware } from '../../../server/models/validation/ValidationMiddleware';
import logger from '../../../server/utils/logger';

// Mock dependencies
jest.mock('../../../server/models/validation/ValidationMiddleware');
jest.mock('../../../server/utils/logger');

const mockLogger = logger as jest.Mocked<typeof logger>;
const MockValidationMiddleware = ValidationMiddleware as jest.MockedConstructor<typeof ValidationMiddleware>;

describe('SocketValidationMiddleware', () => {
  let middleware: SocketValidationMiddleware;
  let mockSocket: jest.Mocked<Socket>;
  let mockValidator: jest.Mocked<ValidationMiddleware>;
  let mockNext: jest.Mock;
  let mockCallback: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock validator
    mockValidator = {
      validate: jest.fn()
    } as any;

    MockValidationMiddleware.mockImplementation(() => mockValidator);

    // Create middleware instance
    middleware = new SocketValidationMiddleware();

    // Create mock socket
    mockSocket = {
      id: 'socket-123',
      emit: jest.fn(),
      eventName: 'testEvent'
    } as any;

    mockNext = jest.fn();
    mockCallback = jest.fn();
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const instance = new SocketValidationMiddleware();

      expect(MockValidationMiddleware).toHaveBeenCalledWith({
        strict: false,
        logValidationErrors: true,
        throwOnError: false
      });
    });

    it('should disable logging when specified', () => {
      const instance = new SocketValidationMiddleware({ enableLogging: false });
      expect(instance).toBeDefined();
    });
  });

  describe('validate method', () => {
    const testSchema = z.object({
      name: z.string(),
      value: z.number()
    });

    it('should validate valid data successfully', () => {
      const validData = { name: 'test', value: 42 };
      mockValidator.validate.mockReturnValue({
        success: true,
        data: validData,
        errors: []
      });

      const validator = middleware.validate(testSchema);
      const handler = validator(mockSocket, mockNext);
      const result = handler(validData, mockCallback);

      expect(mockValidator.validate).toHaveBeenCalledWith(validData, testSchema);
      expect(mockCallback).toHaveBeenCalledWith(null, validData);
      expect(result).toBe(true);
    });

    it('should handle validation failure', () => {
      const invalidData = { name: 123, value: 'not a number' };
      mockValidator.validate.mockReturnValue({
        success: false,
        errors: ['name must be string', 'value must be number'],
        details: {}
      });

      const validator = middleware.validate(testSchema);
      const handler = validator(mockSocket, mockNext);
      const result = handler(invalidData, mockCallback);

      expect(mockSocket.emit).toHaveBeenCalledWith('validationError', {
        type: 'validation',
        message: 'Invalid data received',
        errors: ['name must be string', 'value must be number'],
        details: {}
      });

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid data received',
          validationErrors: ['name must be string', 'value must be number']
        })
      );

      expect(result).toBe(false);
    });

    it('should use custom error message', () => {
      mockValidator.validate.mockReturnValue({
        success: false,
        errors: ['validation failed'],
        details: {}
      });

      const validator = middleware.validate(testSchema, {
        customErrorMessage: 'Custom error'
      });
      const handler = validator(mockSocket, mockNext);
      handler({}, mockCallback);

      expect(mockSocket.emit).toHaveBeenCalledWith('validationError',
        expect.objectContaining({
          message: 'Custom error'
        })
      );
    });

    it('should allow partial validation when specified', () => {
      const partialSchema = testSchema.partial();
      const validator = middleware.validate(testSchema, { allowPartial: true });
      const handler = validator(mockSocket, mockNext);

      mockValidator.validate.mockReturnValue({
        success: true,
        data: { name: 'test' },
        errors: []
      });

      handler({ name: 'test' }, mockCallback);

      // Should have called validate with partial schema
      expect(mockValidator.validate).toHaveBeenCalledWith(
        { name: 'test' },
        expect.any(Object) // The partial schema
      );
    });

    it('should handle validation without callback', () => {
      mockValidator.validate.mockReturnValue({
        success: true,
        data: { name: 'test' },
        errors: []
      });

      const validator = middleware.validate(testSchema);
      const handler = validator(mockSocket, mockNext);
      const result = handler({ name: 'test', value: 1 });

      expect(result).toBe(true);
      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should handle validation errors without callback', () => {
      mockValidator.validate.mockReturnValue({
        success: false,
        errors: ['error'],
        details: {}
      });

      const validator = middleware.validate(testSchema);
      const handler = validator(mockSocket, mockNext);
      const result = handler({});

      expect(result).toBe(false);
      expect(mockSocket.emit).toHaveBeenCalledWith('validationError', expect.any(Object));
    });

    it('should handle validation middleware exceptions', () => {
      const error = new Error('Validation system error');
      mockValidator.validate.mockImplementation(() => {
        throw error;
      });

      const validator = middleware.validate(testSchema);
      const handler = validator(mockSocket, mockNext);
      const result = handler({}, mockCallback);

      expect(mockLogger.error).toHaveBeenCalledWith('Socket validation middleware error:', {
        socketId: 'socket-123',
        error: 'Validation system error',
        stack: error.stack
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('validationError', {
        type: 'error',
        message: 'Validation system error',
        error: 'Validation system error'
      });

      expect(mockCallback).toHaveBeenCalledWith(error);
      expect(result).toBe(false);
    });

    it('should not log errors when logging disabled', () => {
      mockValidator.validate.mockReturnValue({
        success: false,
        errors: ['error'],
        details: {}
      });

      const validator = middleware.validate(testSchema, { logErrors: false });
      const handler = validator(mockSocket, mockNext);
      handler({}, mockCallback);

      expect(mockLogger.warn).not.toHaveBeenCalled();
    });
  });

  describe('specific validators', () => {
    beforeEach(() => {
      mockValidator.validate.mockReturnValue({
        success: true,
        data: {},
        errors: []
      });
    });

    it('should validate join game data', () => {
      const validator = middleware.validateJoinGame();
      const handler = validator(mockSocket, mockNext);

      handler({ gameCode: 'ABC123', playerName: 'Player1' }, mockCallback);

      expect(mockValidator.validate).toHaveBeenCalled();
      expect(mockSocket.emit).not.toHaveBeenCalled();
    });

    it('should validate submit action data', () => {
      const validator = middleware.validateSubmitAction();
      const handler = validator(mockSocket, mockNext);

      handler({ action: 'move', target: 'north' }, mockCallback);

      expect(mockValidator.validate).toHaveBeenCalled();
    });

    it('should validate game code', () => {
      const validator = middleware.validateGameCode();
      const handler = validator(mockSocket, mockNext);

      handler('ABC123', mockCallback);

      expect(mockValidator.validate).toHaveBeenCalled();
    });

    it('should validate player name', () => {
      const validator = middleware.validatePlayerName();
      const handler = validator(mockSocket, mockNext);

      handler('PlayerName', mockCallback);

      expect(mockValidator.validate).toHaveBeenCalled();
    });
  });

  describe('wrapHandler method', () => {
    const testSchema = z.object({ value: z.number() });
    let mockHandler: jest.Mock;
    let mockHandlerFactory: jest.Mock;

    beforeEach(() => {
      mockHandler = jest.fn().mockResolvedValue({ success: true });
      mockHandlerFactory = jest.fn().mockReturnValue(mockHandler);
    });

    it('should wrap handler with validation', async () => {
      mockValidator.validate.mockReturnValue({
        success: true,
        data: { value: 42 },
        errors: []
      });

      const wrapped = middleware.wrapHandler(testSchema, mockHandlerFactory);
      const handler = wrapped(mockSocket);

      await handler({ value: 42 }, mockCallback);

      expect(mockValidator.validate).toHaveBeenCalledWith({ value: 42 }, testSchema);
      expect(mockHandlerFactory).toHaveBeenCalledWith(mockSocket);
      expect(mockHandler).toHaveBeenCalledWith({ value: 42 }, mockCallback);
    });

    it('should not call handler on validation failure', async () => {
      mockValidator.validate.mockReturnValue({
        success: false,
        errors: ['validation error'],
        details: {}
      });

      const wrapped = middleware.wrapHandler(testSchema, mockHandlerFactory);
      const handler = wrapped(mockSocket);

      await handler({ value: 'invalid' }, mockCallback);

      expect(mockValidator.validate).toHaveBeenCalled();
      expect(mockHandler).not.toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalledWith('validationError', expect.any(Object));
    });

    it('should handle handler execution errors', async () => {
      mockValidator.validate.mockReturnValue({
        success: true,
        data: { value: 42 },
        errors: []
      });

      const executionError = new Error('Handler failed');
      mockHandler.mockRejectedValue(executionError);

      const wrapped = middleware.wrapHandler(testSchema, mockHandlerFactory);
      const handler = wrapped(mockSocket);

      await handler({ value: 42 }, mockCallback);

      expect(mockLogger.error).toHaveBeenCalledWith('Socket handler execution error:', {
        socketId: 'socket-123',
        error: 'Handler failed',
        stack: executionError.stack
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('errorMessage', {
        type: 'execution',
        message: 'Action failed to execute',
        error: 'Handler failed'
      });

      expect(mockCallback).toHaveBeenCalledWith(executionError);
    });
  });

  describe('validateFields method', () => {
    it('should validate multiple fields successfully', () => {
      const fieldSchemas = {
        name: z.string(),
        age: z.number(),
        email: z.string().email()
      };

      mockValidator.validate
        .mockReturnValueOnce({ success: true, data: 'John', errors: [] })
        .mockReturnValueOnce({ success: true, data: 30, errors: [] })
        .mockReturnValueOnce({ success: true, data: 'john@example.com', errors: [] });

      const validator = middleware.validateFields(fieldSchemas);
      const handler = validator(mockSocket, mockNext);
      const result = handler(
        { name: 'John', age: 30, email: 'john@example.com' },
        mockCallback
      );

      expect(result).toBe(true);
      expect(mockCallback).toHaveBeenCalledWith(null, {
        name: 'John',
        age: 30,
        email: 'john@example.com'
      });
    });

    it('should handle field validation failures', () => {
      const fieldSchemas = {
        name: z.string(),
        age: z.number()
      };

      mockValidator.validate
        .mockReturnValueOnce({ success: false, errors: ['must be string'], details: {} })
        .mockReturnValueOnce({ success: false, errors: ['must be number'], details: {} });

      const validator = middleware.validateFields(fieldSchemas);
      const handler = validator(mockSocket, mockNext);
      const result = handler({ name: 123, age: 'thirty' }, mockCallback);

      expect(result).toBe(false);
      expect(mockSocket.emit).toHaveBeenCalledWith('validationError', {
        type: 'validation',
        message: 'Invalid field data',
        errors: ['name: must be string', 'age: must be number']
      });

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Field validation failed',
          validationErrors: ['name: must be string', 'age: must be number']
        })
      );
    });

    it('should validate partial fields successfully', () => {
      const fieldSchemas = {
        required: z.string(),
        optional: z.number().optional()
      };

      mockValidator.validate
        .mockReturnValueOnce({ success: true, data: 'value', errors: [] })
        .mockReturnValueOnce({ success: true, data: undefined, errors: [] });

      const validator = middleware.validateFields(fieldSchemas);
      const handler = validator(mockSocket, mockNext);
      const result = handler({ required: 'value' }, mockCallback);

      expect(result).toBe(true);
    });
  });

  describe('SocketValidators helpers', () => {
    it('should provide gameJoin validator', () => {
      expect(SocketValidators.gameJoin).toBeDefined();
      expect(typeof SocketValidators.gameJoin).toBe('function');
    });

    it('should provide characterSelect validator', () => {
      expect(SocketValidators.characterSelect).toBeDefined();
      expect(typeof SocketValidators.characterSelect).toBe('function');
    });

    it('should provide actionSubmit validator', () => {
      expect(SocketValidators.actionSubmit).toBeDefined();
      expect(typeof SocketValidators.actionSubmit).toBe('function');
    });

    it('should provide gameCodeOnly validator', () => {
      expect(SocketValidators.gameCodeOnly).toBeDefined();
      expect(typeof SocketValidators.gameCodeOnly).toBe('function');
    });
  });

  describe('default exports', () => {
    it('should export socketValidator instance', () => {
      expect(socketValidator).toBeInstanceOf(SocketValidationMiddleware);
    });

    it('should export all required components', () => {
      const defaultExport = require('../../../server/middleware/socketValidation').default;

      expect(defaultExport.SocketValidationMiddleware).toBe(SocketValidationMiddleware);
      expect(defaultExport.socketValidator).toBe(socketValidator);
      expect(defaultExport.SocketValidators).toBe(SocketValidators);
    });
  });
});
