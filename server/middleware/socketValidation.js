/**
 * @fileoverview Socket.IO validation middleware using Zod schemas
 * Provides validation for incoming socket events
 * Part of Phase 3 refactoring - Runtime Validation with Zod
 */
const { ValidationMiddleware, schemas } = require('../models/validation/ValidationMiddleware');
const logger = require('../utils/logger');

/**
 * Socket validation middleware
 * Validates incoming socket events against Zod schemas
 */
class SocketValidationMiddleware {
  constructor(options = {}) {
    this.validator = new ValidationMiddleware({
      strict: false,
      logValidationErrors: true,
      throwOnError: false
    });
    this.enableLogging = options.enableLogging !== false;
  }

  /**
   * Create validation middleware for a specific socket event
   * @param {z.ZodSchema} schema - Schema to validate against
   * @param {Object} options - Validation options
   * @returns {Function} Socket middleware function
   */
  validate(schema, options = {}) {
    const { 
      allowPartial = false, 
      logErrors = this.enableLogging,
      customErrorMessage = 'Invalid data received'
    } = options;

    return (socket, next) => {
      return (eventData, callback) => {
        try {
          // Use partial validation if requested
          const validationSchema = allowPartial ? schema.partial() : schema;
          const result = this.validator.validate(eventData, validationSchema);

          if (!result.success) {
            if (logErrors) {
              logger.warn('Socket event validation failed:', {
                socketId: socket.id,
                event: socket.eventName || 'unknown',
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
            });

            // Call callback with error if provided
            if (callback && typeof callback === 'function') {
              const error = new Error(customErrorMessage);
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
        } catch (error) {
          logger.error('Socket validation middleware error:', {
            socketId: socket.id,
            error: error.message,
            stack: error.stack
          });

          socket.emit('validationError', {
            type: 'error',
            message: 'Validation system error',
            error: error.message
          });

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
   * @param {Object} options - Validation options
   * @returns {Function} Validation middleware
   */
  validateJoinGame(options = {}) {
    return this.validate(schemas.SocketSchemas.joinGame, {
      customErrorMessage: 'Invalid join game data',
      ...options
    });
  }

  /**
   * Validate submit action event
   * @param {Object} options - Validation options
   * @returns {Function} Validation middleware
   */
  validateSubmitAction(options = {}) {
    return this.validate(schemas.SocketSchemas.submitAction, {
      customErrorMessage: 'Invalid action data',
      allowPartial: true, // Allow partial action data for flexibility
      ...options
    });
  }

  /**
   * Validate game code parameter
   * @param {Object} options - Validation options
   * @returns {Function} Validation middleware
   */
  validateGameCode(options = {}) {
    const gameCodeSchema = schemas.BaseSchemas.gameCode;
    return this.validate(gameCodeSchema, {
      customErrorMessage: 'Invalid game code format',
      ...options
    });
  }

  /**
   * Validate player name
   * @param {Object} options - Validation options
   * @returns {Function} Validation middleware
   */
  validatePlayerName(options = {}) {
    const playerNameSchema = schemas.BaseSchemas.playerId; // Using playerId schema for name validation
    return this.validate(playerNameSchema, {
      customErrorMessage: 'Invalid player name',
      ...options
    });
  }

  /**
   * Create a wrapper for socket event handlers with validation
   * @param {z.ZodSchema} schema - Schema to validate against
   * @param {Function} handler - Original event handler
   * @param {Object} options - Validation options
   * @returns {Function} Wrapped handler with validation
   */
  wrapHandler(schema, handler, options = {}) {
    const validator = this.validate(schema, options);

    return (socket) => {
      return async (eventData, callback) => {
        // Run validation
        const validationMiddleware = validator(socket, () => {});
        const validationResult = await validationMiddleware(eventData, (error, validatedData) => {
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
        } catch (error) {
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
   * Validate multiple fields in event data
   * @param {Object} fieldSchemas - Object mapping field names to schemas
   * @param {Object} options - Validation options
   * @returns {Function} Validation middleware
   */
  validateFields(fieldSchemas, options = {}) {
    return (socket, next) => {
      return (eventData, callback) => {
        const errors = [];
        const validatedData = {};

        for (const [fieldName, schema] of Object.entries(fieldSchemas)) {
          const fieldValue = eventData[fieldName];
          const result = this.validator.validate(fieldValue, schema);

          if (!result.success) {
            errors.push(...result.errors.map(err => `${fieldName}: ${err}`));
          } else {
            validatedData[fieldName] = result.data;
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
          });

          if (callback && typeof callback === 'function') {
            const error = new Error('Field validation failed');
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
const socketValidator = new SocketValidationMiddleware();

/**
 * Helper functions for common socket validations
 */
const SocketValidators = {
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

module.exports = {
  SocketValidationMiddleware,
  socketValidator,
  SocketValidators
};