/**
 * @fileoverview Socket.IO validation middleware using Zod schemas - TypeScript version
 * Provides validation for incoming socket events
 * Phase 9: TypeScript Migration - Converted from socketValidation.js
 */

import { Socket } from 'socket.io';
import { z } from 'zod';
import { ValidationMiddleware, schemas } from '../models/validation/ValidationMiddleware.js';
import logger from '../utils/logger.js';

/**
 * Validation options interface
 */
export interface ValidationOptions {
  allowPartial?: boolean;
  logErrors?: boolean;
  customErrorMessage?: string;
}

/**
 * Socket validation options interface
 */
export interface SocketValidationOptions {
  enableLogging?: boolean;
}

/**
 * Field schema mapping interface
 */
export interface FieldSchemas {
  [fieldName: string]: z.ZodSchema<any>;
}

/**
 * Validation error interface
 */
export interface ValidationError {
  type: 'validation' | 'error';
  message: string;
  errors?: string[];
  details?: any;
  error?: string;
}

/**
 * Socket event handler function type
 */
export type SocketEventHandler = (_eventData: any, _callback?: Function) => any;

/**
 * Socket middleware function type
 */
export type SocketMiddleware = (_socket: Socket, _next: Function) => SocketEventHandler;

/**
 * Socket validation middleware
 * Validates incoming socket events against Zod schemas
 */
export class SocketValidationMiddleware {
  private validator: ValidationMiddleware;
  private enableLogging: boolean;

  constructor(options: SocketValidationOptions = {}) {
    this.validator = new ValidationMiddleware({
      strict: false,
      logValidationErrors: true,
      throwOnError: false
    });
    this.enableLogging = options.enableLogging !== false;
  }

  /**
   * Create validation middleware for a specific socket event
   */
  validate(schema: z.ZodSchema<any>, options: ValidationOptions = {}): SocketMiddleware {
    const {
      allowPartial = false,
      logErrors = this.enableLogging,
      customErrorMessage = 'Invalid data received'
    } = options;

    return (_socket: Socket, _next: Function): SocketEventHandler => {
      return (eventData: any, callback?: Function): any => {
        try {
          // Use partial validation if requested
          const validationSchema = allowPartial && schema instanceof z.ZodObject ? schema.partial() : schema;
          const result = this.validator.validate(eventData, validationSchema);

          if (!result.success) {
            if (logErrors) {
              logger.warn('Socket event validation failed:', {
                socketId: socket.id,
                event: (socket as any).eventName || 'unknown',
                errors: result.errors,
                data: eventData
              });
            }

            // Emit error to client
            socket.emit('validationError', {
              type: 'validation',
              message: customErrorMessage,
              errors: result.errors,
              details: result.details
            } as ValidationError);

            // Call callback with error if provided
            if (callback && typeof callback === 'function') {
              const error: any = new Error(customErrorMessage);
              error.validationErrors = result.errors;
              return callback(error);
            }

            return false;
          }

          // Validation successful - continue with validated data
          if (callback && typeof callback === 'function') {
            return callback(null, result.data);
          }

          return true;
        } catch (error: any) {
          logger.error('Socket validation middleware error:', {
            socketId: socket.id,
            error: error.message,
            stack: error.stack
          });

          socket.emit('validationError', {
            type: 'error',
            message: 'Validation system error',
            error: error.message
          } as ValidationError);

          if (callback && typeof callback === 'function') {
            return callback(error);
          }

          return false;
        }
      };
    };
  }

  /**
   * Validate join game event
   */
  validateJoinGame(options: ValidationOptions = {}): SocketMiddleware {
    return this.validate(schemas.SocketSchemas.joinGame, {
      customErrorMessage: 'Invalid join game data',
      ...options
    });
  }

  /**
   * Validate submit action event
   */
  validateSubmitAction(options: ValidationOptions = {}): SocketMiddleware {
    return this.validate(schemas.SocketSchemas.submitAction, {
      customErrorMessage: 'Invalid action data',
      allowPartial: true, // Allow partial action data for flexibility
      ...options
    });
  }

  /**
   * Validate game code parameter
   */
  validateGameCode(options: ValidationOptions = {}): SocketMiddleware {
    const gameCodeSchema = schemas.BaseSchemas.gameCode;
    return this.validate(gameCodeSchema, {
      customErrorMessage: 'Invalid game code format',
      ...options
    });
  }

  /**
   * Validate player name
   */
  validatePlayerName(options: ValidationOptions = {}): SocketMiddleware {
    const playerNameSchema = schemas.BaseSchemas.playerId; // Using playerId schema for name validation
    return this.validate(playerNameSchema, {
      customErrorMessage: 'Invalid player name',
      ...options
    });
  }

  /**
   * Create a wrapper for socket event handlers with validation
   */
  wrapHandler(
    schema: z.ZodSchema<any>,
    handler: (_socket: Socket) => SocketEventHandler,
    options: ValidationOptions = {}
  ): (_socket: Socket) => SocketEventHandler {
    const validator = this.validate(schema, options);

    return (socket: Socket): SocketEventHandler => {
      return async (eventData: any, callback?: Function): Promise<any> => {
        // Run validation
        const validationMiddleware = validator(socket, () => {});
        const validationResult = await validationMiddleware(eventData, (error: any, validatedData: any) => {
          if (error) {
            logger.warn('Socket handler validation failed:', {
              socketId: socket.id,
              error: error.message,
              validationErrors: error.validationErrors
            });
            return false;
          }
          return validatedData;
        });

        // If validation failed, don't call the handler
        if (!validationResult) {
          return;
        }

        // Call original handler with validated data
        try {
          return await handler(socket)(validationResult, callback);
        } catch (error: any) {
          logger.error('Socket handler execution error:', {
            socketId: socket.id,
            error: error.message,
            stack: error.stack
          });

          socket.emit('errorMessage', {
            type: 'execution',
            message: 'Action failed to execute',
            error: error.message
          });

          if (callback && typeof callback === 'function') {
            callback(error);
          }
        }
      };
    };
  }

  /**
   * Validate multiple fields in event data with field name whitelisting
   */
  validateFields(fieldSchemas: FieldSchemas, _options: ValidationOptions = {}): SocketMiddleware {
    return (_socket: Socket, _next: Function): SocketEventHandler => {
      return (eventData: any, callback?: Function): any => {
        const errors: string[] = [];
        const validatedData: any = {};

        // Dangerous field names that should never be accepted
        const dangerousFields = ['__proto__', 'constructor', 'prototype'];

        for (const [fieldName, schema] of Object.entries(fieldSchemas)) {
          // Skip dangerous field names to prevent prototype pollution
          if (dangerousFields.includes(fieldName)) {
            errors.push(`${fieldName}: Field name not allowed`);
            continue;
          }

          // Validate field name is safe (alphanumeric + underscore only)
          if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(fieldName)) {
            errors.push(`${fieldName}: Invalid field name format`);
            continue;
          }

          // eslint-disable-next-line security/detect-object-injection -- fieldName validated with regex on line 265
          const fieldValue = Object.prototype.hasOwnProperty.call(eventData, fieldName) ? eventData[fieldName] : undefined;
          const result = this.validator.validate(fieldValue, schema);

          if (!result.success) {
            errors.push(...result.errors.map(err => `${fieldName}: ${err}`));
          } else {
            // Use defineProperty for safer assignment
            Object.defineProperty(validatedData, fieldName, {
              value: result.data,
              enumerable: true,
              writable: true,
              configurable: true
            });
          }
        }

        if (errors.length > 0) {
          if (this.enableLogging) {
            logger.warn('Socket field validation failed:', {
              socketId: socket.id,
              errors,
              data: eventData
            });
          }

          socket.emit('validationError', {
            type: 'validation',
            message: 'Invalid field data',
            errors
          } as ValidationError);

          if (callback && typeof callback === 'function') {
            const error: any = new Error('Field validation failed');
            error.validationErrors = errors;
            return callback(error);
          }

          return false;
        }

        // All fields valid
        if (callback && typeof callback === 'function') {
          return callback(null, validatedData);
        }

        return true;
      };
    };
  }
}

// Create default instance
export const socketValidator = new SocketValidationMiddleware();

/**
 * Helper functions for common socket validations
 */
export const SocketValidators = {
  /**
   * Validate basic game join with game code and player name
   */
  gameJoin: socketValidator.validateFields({
    gameCode: schemas.BaseSchemas.gameCode,
    playerName: schemas.BaseSchemas.playerId
  }),

  /**
   * Validate character selection
   */
  characterSelect: socketValidator.validateFields({
    gameCode: schemas.BaseSchemas.gameCode,
    race: schemas.BaseSchemas.playerRace,
    className: schemas.BaseSchemas.playerClass
  }),

  /**
   * Validate action submission
   */
  actionSubmit: socketValidator.validateSubmitAction(),

  /**
   * Validate game code only
   */
  gameCodeOnly: socketValidator.validateFields({
    gameCode: schemas.BaseSchemas.gameCode
  })
};

export default {
  SocketValidationMiddleware,
  socketValidator,
  SocketValidators
};
