/**
 * @fileoverview Tests for ValidationMiddleware
 * Comprehensive test suite for Zod validation middleware functionality
 */

import { z } from 'zod';
import ValidationMiddleware, { 
  ValidationError, 
  strictValidator, 
  lenientValidator, 
  silentValidator,
  ValidationUtils,
  schemas
} from '../../../../server/models/validation/ValidationMiddleware';
import { Request, Response, NextFunction } from 'express';
import { Socket } from 'socket.io';

// Mock dependencies
jest.mock('../../../../server/utils/logger');

describe('ValidationMiddleware', () => {
  let validator: ValidationMiddleware;
  const mockLogger = require('../../../../server/utils/logger').default;

  beforeEach(() => {
    jest.clearAllMocks();
    validator = new ValidationMiddleware();
  });

  describe('Constructor', () => {
    it('should initialize with default options', () => {
      const defaultValidator = new ValidationMiddleware();
      expect(defaultValidator).toBeDefined();
    });

    it('should initialize with custom options', () => {
      const customValidator = new ValidationMiddleware({
        strict: true,
        logValidationErrors: false,
        throwOnError: true
      });
      expect(customValidator).toBeDefined();
    });
  });

  describe('validate', () => {
    const testSchema = z.object({
      name: z.string().min(1),
      age: z.number().min(0).max(150)
    });

    it('should validate valid data successfully', () => {
      const validData = { name: 'John', age: 25 };
      const result = validator.validate(validData, testSchema);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should fail validation for invalid data', () => {
      const invalidData = { name: '', age: -5 };
      const result = validator.validate(invalidData, testSchema);

      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.details).toBeDefined();
    });

    it('should log validation errors when enabled', () => {
      const logValidator = new ValidationMiddleware({ logValidationErrors: true });
      const invalidData = { name: '', age: -5 };
      
      logValidator.validate(invalidData, testSchema);

      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should not log validation errors when disabled', () => {
      const noLogValidator = new ValidationMiddleware({ logValidationErrors: false });
      const invalidData = { name: '', age: -5 };
      
      noLogValidator.validate(invalidData, testSchema);

      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('should throw error when throwOnError is enabled', () => {
      const throwValidator = new ValidationMiddleware({ throwOnError: true });
      const invalidData = { name: '', age: -5 };

      expect(() => throwValidator.validate(invalidData, testSchema)).toThrow(ValidationError);
    });

    it('should throw error with options override', () => {
      const invalidData = { name: '', age: -5 };

      expect(() => validator.validate(invalidData, testSchema, { throwOnError: true }))
        .toThrow(ValidationError);
    });

    it('should handle non-Zod errors', () => {
      const errorSchema = z.object({}).refine(() => {
        throw new Error('Custom error');
      });

      const result = validator.validate({}, errorSchema);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Custom error');
    });

    it('should log non-Zod errors', () => {
      const errorSchema = z.object({}).refine(() => {
        throw new Error('Custom error');
      });

      validator.validate({}, errorSchema);

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('validateSafe', () => {
    const testSchema = z.object({
      name: z.string(),
      count: z.number()
    });

    it('should return validated data for valid input', () => {
      const validData = { name: 'test', count: 5 };
      const result = validator.validateSafe(validData, testSchema);

      expect(result).toEqual(validData);
    });

    it('should return null for invalid input', () => {
      const invalidData = { name: 123, count: 'invalid' };
      const result = validator.validateSafe(invalidData, testSchema);

      expect(result).toBeNull();
    });

    it('should log debug message for failed validation', () => {
      const logValidator = new ValidationMiddleware({ logValidationErrors: true });
      const invalidData = { name: 123, count: 'invalid' };
      
      logValidator.validateSafe(invalidData, testSchema);

      expect(mockLogger.debug).toHaveBeenCalled();
    });

    it('should not log when logging is disabled', () => {
      const noLogValidator = new ValidationMiddleware({ logValidationErrors: false });
      const invalidData = { name: 123, count: 'invalid' };
      
      noLogValidator.validateSafe(invalidData, testSchema);

      expect(mockLogger.debug).not.toHaveBeenCalled();
    });
  });

  describe('express', () => {
    const testSchema = z.object({
      username: z.string().min(3),
      email: z.string().email()
    });

    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
      mockReq = {};
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      mockNext = jest.fn();
    });

    it('should validate request body successfully', () => {
      const validBody = { username: 'john', email: 'john@example.com' };
      mockReq.body = validBody;

      const middleware = validator.express(testSchema, 'body');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.body).toEqual(validBody);
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should fail validation and return 400 status', () => {
      const invalidBody = { username: 'jo', email: 'invalid-email' };
      mockReq.body = invalidBody;

      const middleware = validator.express(testSchema, 'body');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: expect.any(Array)
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should validate request params', () => {
      const validParams = { username: 'john', email: 'john@example.com' };
      mockReq.params = validParams;

      const middleware = validator.express(testSchema, 'params');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.params).toEqual(validParams);
    });

    it('should validate request query', () => {
      const validQuery = { username: 'john', email: 'john@example.com' };
      mockReq.query = validQuery;

      const middleware = validator.express(testSchema, 'query');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.query).toEqual(validQuery);
    });

    it('should replace request data with validated version', () => {
      const inputBody = { username: 'john', email: 'john@example.com', extra: 'field' };
      const expectedBody = { username: 'john', email: 'john@example.com' };
      mockReq.body = inputBody;

      const middleware = validator.express(testSchema, 'body');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.body).toEqual(expectedBody);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('socket', () => {
    const testSchema = z.object({
      action: z.string(),
      data: z.record(z.any())
    });

    let mockSocket: Partial<Socket>;
    let mockCallback: jest.Mock;

    beforeEach(() => {
      mockSocket = {
        emit: jest.fn()
      };
      mockCallback = jest.fn();
    });

    it('should validate socket event data successfully', () => {
      const validData = { action: 'test', data: { key: 'value' } };
      
      const middlewareFactory = validator.socket(testSchema);
      const middleware = middlewareFactory(mockSocket as Socket);
      
      middleware(validData, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, validData);
      expect(mockSocket.emit).not.toHaveBeenCalled();
    });

    it('should fail validation and emit error', () => {
      const invalidData = { action: 123, data: 'invalid' };
      
      const middlewareFactory = validator.socket(testSchema);
      const middleware = middlewareFactory(mockSocket as Socket);
      
      middleware(invalidData, mockCallback);

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        type: 'validation',
        message: 'Invalid event data',
        errors: expect.any(Array)
      });
      expect(mockCallback).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should work without callback', () => {
      const invalidData = { action: 123, data: 'invalid' };
      
      const middlewareFactory = validator.socket(testSchema);
      const middleware = middlewareFactory(mockSocket as Socket);
      
      expect(() => middleware(invalidData)).not.toThrow();
      expect(mockSocket.emit).toHaveBeenCalled();
    });
  });

  describe('Specific Validation Methods', () => {
    beforeEach(() => {
      // Mock the schemas
      jest.doMock('../../../../server/models/validation/ZodSchemas', () => ({
        PlayerSchemas: {
          player: z.object({ id: z.string(), name: z.string() })
        },
        ActionSchemas: {
          playerAction: z.object({ type: z.string(), playerId: z.string() }),
          abilityAction: z.object({ abilityId: z.string(), playerId: z.string() })
        },
        GameSchemas: {
          gameState: z.object({ phase: z.string(), players: z.array(z.any()) })
        },
        SocketSchemas: {
          joinGame: z.object({ gameCode: z.string(), playerName: z.string() }),
          submitAction: z.object({ actionType: z.string() })
        },
        ConfigSchemas: {
          serverConfig: z.object({ port: z.number(), host: z.string() }),
          gameConfig: z.object({ maxPlayers: z.number() })
        }
      }));
    });

    it('should validate player data', () => {
      const playerData = { id: 'player1', name: 'John' };
      const result = validator.validatePlayer(playerData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(playerData);
    });

    it('should validate player action', () => {
      const actionData = { type: 'ability', playerId: 'player1' };
      const result = validator.validatePlayerAction(actionData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(actionData);
    });

    it('should validate ability action', () => {
      const abilityData = { abilityId: 'fireball', playerId: 'player1' };
      const result = validator.validateAbilityAction(abilityData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(abilityData);
    });

    it('should validate game state', () => {
      const gameStateData = { phase: 'action', players: [] };
      const result = validator.validateGameState(gameStateData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(gameStateData);
    });

    it('should validate join game data', () => {
      const joinData = { gameCode: 'ABC123', playerName: 'John' };
      const result = validator.validateJoinGame(joinData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(joinData);
    });

    it('should validate submit action data', () => {
      const actionData = { actionType: 'ability' };
      const result = validator.validateSubmitAction(actionData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(actionData);
    });

    it('should validate server config', () => {
      const configData = { port: 3000, host: 'localhost' };
      const result = validator.validateServerConfig(configData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(configData);
    });

    it('should validate game config', () => {
      const configData = { maxPlayers: 8 };
      const result = validator.validateGameConfig(configData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(configData);
    });
  });

  describe('Pre-configured Validators', () => {
    const testSchema = z.object({
      name: z.string().min(1)
    });

    it('should have strict validator that throws on error', () => {
      const invalidData = { name: '' };

      expect(() => strictValidator.validate(invalidData, testSchema)).toThrow(ValidationError);
    });

    it('should have lenient validator that does not throw', () => {
      const invalidData = { name: '' };

      const result = lenientValidator.validate(invalidData, testSchema);
      expect(result.success).toBe(false);
      expect(() => lenientValidator.validate(invalidData, testSchema)).not.toThrow();
    });

    it('should have silent validator that does not log', () => {
      const invalidData = { name: '' };

      silentValidator.validate(invalidData, testSchema);
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });
  });

  describe('ValidationError', () => {
    it('should create validation error with message and details', () => {
      const errors = ['Field is required'];
      const details = [{ path: 'name', message: 'Required', code: 'invalid_type' }];
      const error = new ValidationError('Validation failed', errors, details);

      expect(error.name).toBe('ValidationError');
      expect(error.message).toBe('Validation failed');
      expect(error.errors).toEqual(errors);
      expect(error.details).toEqual(details);
      expect(error).toBeInstanceOf(Error);
    });

    it('should create validation error with default values', () => {
      const error = new ValidationError('Test error');

      expect(error.errors).toEqual([]);
      expect(error.details).toEqual([]);
    });
  });

  describe('ValidationUtils', () => {
    describe('sanitizePlayerName', () => {
      it('should sanitize valid player name', () => {
        const result = ValidationUtils.sanitizePlayerName('John Doe-123');
        expect(result).toBe('John Doe-123');
      });

      it('should remove invalid characters', () => {
        const result = ValidationUtils.sanitizePlayerName('John@Doe#123!');
        expect(result).toBe('JohnDoe123');
      });

      it('should trim whitespace', () => {
        const result = ValidationUtils.sanitizePlayerName('  John Doe  ');
        expect(result).toBe('John Doe');
      });

      it('should limit length to 30 characters', () => {
        const longName = 'A'.repeat(50);
        const result = ValidationUtils.sanitizePlayerName(longName);
        expect(result).toHaveLength(30);
      });

      it('should return empty string for non-string input', () => {
        expect(ValidationUtils.sanitizePlayerName(123)).toBe('');
        expect(ValidationUtils.sanitizePlayerName(null)).toBe('');
        expect(ValidationUtils.sanitizePlayerName(undefined)).toBe('');
      });
    });

    describe('isValidGameCode', () => {
      it('should validate correct game codes', () => {
        expect(ValidationUtils.isValidGameCode('ABC123')).toBe(true);
        expect(ValidationUtils.isValidGameCode('XYZ789')).toBe(true);
        expect(ValidationUtils.isValidGameCode('123456')).toBe(true);
      });

      it('should reject invalid game codes', () => {
        expect(ValidationUtils.isValidGameCode('abc123')).toBe(false); // lowercase
        expect(ValidationUtils.isValidGameCode('ABC12')).toBe(false); // too short
        expect(ValidationUtils.isValidGameCode('ABC1234')).toBe(false); // too long
        expect(ValidationUtils.isValidGameCode('ABC-12')).toBe(false); // invalid character
        expect(ValidationUtils.isValidGameCode(123456)).toBe(false); // not string
      });
    });

    describe('isValidPlayerId', () => {
      it('should validate correct player IDs', () => {
        expect(ValidationUtils.isValidPlayerId('player1')).toBe(true);
        expect(ValidationUtils.isValidPlayerId('user-123')).toBe(true);
      });

      it('should reject invalid player IDs', () => {
        expect(ValidationUtils.isValidPlayerId('')).toBe(false); // empty
        expect(ValidationUtils.isValidPlayerId('a'.repeat(51))).toBe(false); // too long
        expect(ValidationUtils.isValidPlayerId(123)).toBe(false); // not string
      });
    });

    describe('extractErrorMessages', () => {
      it('should extract messages from ZodError', () => {
        const schema = z.object({ name: z.string(), age: z.number() });
        
        try {
          schema.parse({ name: 123, age: 'invalid' });
        } catch (error) {
          if (error instanceof z.ZodError) {
            const messages = ValidationUtils.extractErrorMessages(error);
            expect(messages).toContain('name: Expected string, received number');
            expect(messages).toContain('age: Expected number, received string');
          }
        }
      });

      it('should return empty array for non-ZodError', () => {
        const messages = ValidationUtils.extractErrorMessages(new Error('Not a ZodError'));
        expect(messages).toEqual([]);
      });

      it('should return empty array for null/undefined', () => {
        expect(ValidationUtils.extractErrorMessages(null)).toEqual([]);
        expect(ValidationUtils.extractErrorMessages(undefined)).toEqual([]);
      });
    });

    describe('createPartialValidator', () => {
      it('should create partial validator', () => {
        const schema = z.object({
          name: z.string(),
          age: z.number()
        });

        const partialSchema = ValidationUtils.createPartialValidator(schema);
        const result = partialSchema.safeParse({ name: 'John' }); // age is optional

        expect(result.success).toBe(true);
      });
    });

    describe('createDeepPartialValidator', () => {
      it('should create deep partial validator', () => {
        const schema = z.object({
          user: z.object({
            name: z.string(),
            profile: z.object({
              age: z.number(),
              email: z.string()
            })
          })
        });

        const deepPartialSchema = ValidationUtils.createDeepPartialValidator(schema);
        const result = deepPartialSchema.safeParse({
          user: {
            name: 'John'
            // profile is optional, age and email are optional
          }
        });

        expect(result.success).toBe(true);
      });
    });
  });

  describe('Schema Exports', () => {
    it('should export schemas object', () => {
      expect(schemas).toBeDefined();
      expect(schemas).toHaveProperty('BaseSchemas');
      expect(schemas).toHaveProperty('PlayerSchemas');
      expect(schemas).toHaveProperty('ActionSchemas');
      expect(schemas).toHaveProperty('GameSchemas');
      expect(schemas).toHaveProperty('SocketSchemas');
      expect(schemas).toHaveProperty('ConfigSchemas');
    });
  });

  describe('Integration Tests', () => {
    it('should work with complex nested validation', () => {
      const complexSchema = z.object({
        player: z.object({
          id: z.string().uuid(),
          stats: z.object({
            hp: z.number().min(0).max(100),
            level: z.number().int().min(1)
          }),
          abilities: z.array(z.object({
            name: z.string(),
            cooldown: z.number().min(0)
          }))
        }),
        metadata: z.record(z.unknown()).optional()
      });

      const validData = {
        player: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          stats: {
            hp: 85,
            level: 5
          },
          abilities: [
            { name: 'Fireball', cooldown: 3 },
            { name: 'Heal', cooldown: 0 }
          ]
        }
      };

      const result = validator.validate(validData, complexSchema);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it('should handle validation chain with transformations', () => {
      const transformSchema = z.object({
        name: z.string().trim().toLowerCase(),
        tags: z.string().transform(str => str.split(',').map(s => s.trim()))
      });

      const inputData = {
        name: '  JOHN DOE  ',
        tags: 'warrior, mage, healer'
      };

      const result = validator.validate(inputData, transformSchema);
      
      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('john doe');
      expect(result.data?.tags).toEqual(['warrior', 'mage', 'healer']);
    });
  });
});

// Mock logger module
jest.mock('../../../../server/utils/logger', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));