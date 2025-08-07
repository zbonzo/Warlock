/**
 * @fileoverview Validation middleware using Zod schemas
 * Provides validation functions for commands, socket events, and API endpoints
 * Part of Phase 3 refactoring - Runtime Validation with Zod
 */
import { ZodError, z } from 'zod';
import { 
  BaseSchemas, 
  PlayerSchemas, 
  ActionSchemas, 
  GameSchemas, 
  SocketSchemas,
  ConfigSchemas 
} from './ZodSchemas.js';
import logger from '../../utils/logger.js';
import { Request, Response, NextFunction } from 'express';
import { Socket } from 'socket.io';

interface ValidationOptions {
  strict?: boolean;
  logValidationErrors?: boolean;
  throwOnError?: boolean;
}

interface ValidationResult<T = any> {
  success: boolean;
  data: T | null;
  errors: string[];
  warnings: string[];
  details?: ValidationErrorDetail[];
}

interface ValidationErrorDetail {
  path: string;
  message: string;
  code: string;
  expected?: any;
  received?: any;
}

interface SocketMiddlewareFunction {
  (eventData: any, callback?: (error?: Error | null, data?: any) => void): void;
}

/**
 * Validation middleware class
 * Provides centralized validation using Zod schemas
 */
class ValidationMiddleware {
  private strict: boolean;
  private logValidationErrors: boolean;
  private throwOnError: boolean;

  constructor(options: ValidationOptions = {}) {
    this.strict = options.strict || false;
    this.logValidationErrors = options.logValidationErrors !== false;
    this.throwOnError = options.throwOnError || false;
  }

  /**
   * Validate data against a Zod schema
   */
  validate<T>(data: unknown, schema: z.ZodSchema<T>, options: ValidationOptions = {}): ValidationResult<T> {
    try {
      const validated = schema.parse(data);
      return {
        success: true,
        data: validated,
        errors: [],
        warnings: []
      };
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message,
          code: err.code,
          expected: (err as any).expected,
          received: (err as any).received
        }));

        const result: ValidationResult<T> = {
          success: false,
          data: null,
          errors: errors.map(e => `${e.path}: ${e.message}`),
          warnings: [],
          details: errors
        };

        if (this.logValidationErrors) {
          logger.warn('Validation failed:', {
            schema: schema.constructor.name,
            errors: result.errors,
            data: JSON.stringify(data, null, 2)
          });
        }

        if (this.throwOnError || options.throwOnError) {
          throw new ValidationError('Validation failed', result.errors, errors);
        }

        return result;
      }
      
      // Handle non-Zod errors
      const result: ValidationResult<T> = {
        success: false,
        data: null,
        errors: [(error as Error).message || 'Unknown validation error'],
        warnings: [],
        details: []
      };

      if (this.logValidationErrors) {
        logger.error('Non-Zod validation error:', {
          error: (error as Error).message,
          stack: (error as Error).stack
        });
      }

      if (this.throwOnError || options.throwOnError) {
        throw error;
      }

      return result;
    }
  }

  /**
   * Validate safe - returns validated data or null
   */
  validateSafe<T>(data: unknown, schema: z.ZodSchema<T>): T | null {
    try {
      return schema.parse(data);
    } catch (error) {
      if (this.logValidationErrors && error instanceof ZodError) {
        logger.debug('Safe validation failed:', {
          schema: schema.constructor.name,
          error: error.message
        });
      }
      return null;
    }
  }

  /**
   * Create middleware function for Express routes
   */
  express<T>(schema: z.ZodSchema<T>, target: 'body' | 'params' | 'query' = 'body') {
    return (req: Request, res: Response, next: NextFunction) => {
      const data = req[target];
      const result = this.validate(data, schema);
      
      if (!result.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: result.errors
        });
      }
      
      // Replace the data with validated/sanitized version
      (req as any)[target] = result.data;
      return next();
    };
  }

  /**
   * Create middleware function for Socket.IO events
   */
  socket<T>(schema: z.ZodSchema<T>): (socket: Socket) => SocketMiddlewareFunction {
    return (socket: Socket) => {
      return (eventData: unknown, callback?: (error?: Error | null, data?: any) => void): void => {
        const result = this.validate(eventData, schema);
        
        if (!result.success) {
          const error = new Error('Invalid event data') as any;
          error.validationErrors = result.errors;
          socket.emit('error', {
            type: 'validation',
            message: 'Invalid event data',
            errors: result.errors
          });
          return callback && callback(error);
        }
        
        // Continue with validated data
        return callback && callback(null, result.data);
      };
    };
  }

  /**
   * Validate player data
   */
  validatePlayer(playerData: unknown): ValidationResult {
    return this.validate(playerData, PlayerSchemas.player);
  }

  /**
   * Validate player action
   */
  validatePlayerAction(actionData: unknown): ValidationResult {
    return this.validate(actionData, ActionSchemas.playerAction);
  }

  /**
   * Validate ability action
   */
  validateAbilityAction(abilityData: unknown): ValidationResult {
    return this.validate(abilityData, ActionSchemas.abilityAction);
  }

  /**
   * Validate game state
   */
  validateGameState(gameStateData: unknown): ValidationResult {
    return this.validate(gameStateData, GameSchemas.gameState);
  }

  /**
   * Validate socket join game event
   */
  validateJoinGame(joinData: unknown): ValidationResult {
    return this.validate(joinData, SocketSchemas.joinGame);
  }

  /**
   * Validate socket submit action event
   */
  validateSubmitAction(actionData: unknown): ValidationResult {
    return this.validate(actionData, SocketSchemas.submitAction);
  }

  /**
   * Validate server configuration
   */
  validateServerConfig(configData: unknown): ValidationResult {
    return this.validate(configData, ConfigSchemas.serverConfig);
  }

  /**
   * Validate game configuration
   */
  validateGameConfig(configData: unknown): ValidationResult {
    return this.validate(configData, ConfigSchemas.gameConfig);
  }
}

/**
 * Custom validation error class
 */
export class ValidationError extends Error {
  public errors: string[];
  public details: ValidationErrorDetail[];

  constructor(message: string, errors: string[] = [], details: ValidationErrorDetail[] = []) {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
    this.details = details;
  }
}

/**
 * Pre-configured validation instances
 */
export const strictValidator = new ValidationMiddleware({ 
  strict: true, 
  throwOnError: true 
});

export const lenientValidator = new ValidationMiddleware({ 
  strict: false, 
  throwOnError: false 
});

export const silentValidator = new ValidationMiddleware({ 
  strict: false, 
  throwOnError: false,
  logValidationErrors: false 
});

/**
 * Utility functions for common validation tasks
 */
export const ValidationUtils = {
  /**
   * Sanitize player name
   */
  sanitizePlayerName(name: unknown): string {
    if (typeof name !== 'string') return '';
    return name.trim().slice(0, 30).replace(/[^\w\s-]/g, '');
  },

  /**
   * Validate game code format
   */
  isValidGameCode(gameCode: unknown): boolean {
    return BaseSchemas.gameCode.safeParse(gameCode).success;
  },

  /**
   * Validate player ID format
   */
  isValidPlayerId(playerId: unknown): boolean {
    return BaseSchemas.playerId.safeParse(playerId).success;
  },

  /**
   * Extract validation errors as simple strings
   */
  extractErrorMessages(zodError: unknown): string[] {
    if (!(zodError instanceof ZodError)) return [];
    return zodError.errors.map(err => 
      `${err.path.join('.')}: ${err.message}`
    );
  },

  /**
   * Create a partial schema validator (allows missing optional fields)
   */
  createPartialValidator<T extends z.ZodRawShape>(schema: z.ZodObject<T>): any {
    return schema.partial();
  },

  /**
   * Create a deep partial schema validator
   */
  createDeepPartialValidator<T extends z.ZodRawShape>(schema: z.ZodObject<T>): any {
    return schema.deepPartial();
  }
};

// Main export
export { ValidationMiddleware };

// Export schemas for direct use
export const schemas = {
  BaseSchemas,
  PlayerSchemas,
  ActionSchemas,
  GameSchemas,
  SocketSchemas,
  ConfigSchemas
};