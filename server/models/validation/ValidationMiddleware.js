/**
 * @fileoverview Validation middleware using Zod schemas
 * Provides validation functions for commands, socket events, and API endpoints
 * Part of Phase 3 refactoring - Runtime Validation with Zod
 */
const { ZodError } = require('zod');
const { 
  BaseSchemas, 
  PlayerSchemas, 
  ActionSchemas, 
  GameSchemas, 
  SocketSchemas,
  ConfigSchemas 
} = require('./ZodSchemas');
const logger = require('../../utils/logger');

/**
 * Validation middleware class
 * Provides centralized validation using Zod schemas
 */
class ValidationMiddleware {
  constructor(options = {}) {
    this.strict = options.strict || false;
    this.logValidationErrors = options.logValidationErrors !== false;
    this.throwOnError = options.throwOnError || false;
  }

  /**
   * Validate data against a Zod schema
   * @param {any} data - Data to validate
   * @param {z.ZodSchema} schema - Zod schema to validate against
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  validate(data, schema, options = {}) {
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
          expected: err.expected,
          received: err.received
        }));

        const result = {
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
      const result = {
        success: false,
        data: null,
        errors: [error.message || 'Unknown validation error'],
        warnings: [],
        details: []
      };

      if (this.logValidationErrors) {
        logger.error('Non-Zod validation error:', {
          error: error.message,
          stack: error.stack
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
   * @param {any} data - Data to validate
   * @param {z.ZodSchema} schema - Zod schema to validate against
   * @returns {any|null} Validated data or null if invalid
   */
  validateSafe(data, schema) {
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
   * @param {z.ZodSchema} schema - Schema to validate request body against
   * @param {string} target - What to validate ('body', 'params', 'query')
   * @returns {Function} Express middleware function
   */
  express(schema, target = 'body') {
    return (req, res, next) => {
      const data = req[target];
      const result = this.validate(data, schema);
      
      if (!result.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: result.errors
        });
      }
      
      // Replace the data with validated/sanitized version
      req[target] = result.data;
      next();
    };
  }

  /**
   * Create middleware function for Socket.IO events
   * @param {z.ZodSchema} schema - Schema to validate event data against
   * @returns {Function} Socket.IO middleware function
   */
  socket(schema) {
    return (socket, next) => {
      return (eventData, callback) => {
        const result = this.validate(eventData, schema);
        
        if (!result.success) {
          const error = new Error('Invalid event data');
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
   * @param {Object} playerData - Player data to validate
   * @returns {Object} Validation result
   */
  validatePlayer(playerData) {
    return this.validate(playerData, PlayerSchemas.player);
  }

  /**
   * Validate player action
   * @param {Object} actionData - Action data to validate
   * @returns {Object} Validation result
   */
  validatePlayerAction(actionData) {
    return this.validate(actionData, ActionSchemas.playerAction);
  }

  /**
   * Validate ability action
   * @param {Object} abilityData - Ability action data to validate
   * @returns {Object} Validation result
   */
  validateAbilityAction(abilityData) {
    return this.validate(abilityData, ActionSchemas.abilityAction);
  }

  /**
   * Validate game state
   * @param {Object} gameStateData - Game state data to validate
   * @returns {Object} Validation result
   */
  validateGameState(gameStateData) {
    return this.validate(gameStateData, GameSchemas.gameState);
  }

  /**
   * Validate socket join game event
   * @param {Object} joinData - Join game data to validate
   * @returns {Object} Validation result
   */
  validateJoinGame(joinData) {
    return this.validate(joinData, SocketSchemas.joinGame);
  }

  /**
   * Validate socket submit action event
   * @param {Object} actionData - Submit action data to validate
   * @returns {Object} Validation result
   */
  validateSubmitAction(actionData) {
    return this.validate(actionData, SocketSchemas.submitAction);
  }

  /**
   * Validate server configuration
   * @param {Object} configData - Configuration data to validate
   * @returns {Object} Validation result
   */
  validateServerConfig(configData) {
    return this.validate(configData, ConfigSchemas.serverConfig);
  }

  /**
   * Validate game configuration
   * @param {Object} configData - Game configuration data to validate
   * @returns {Object} Validation result
   */
  validateGameConfig(configData) {
    return this.validate(configData, ConfigSchemas.gameConfig);
  }
}

/**
 * Custom validation error class
 */
class ValidationError extends Error {
  constructor(message, errors = [], details = []) {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
    this.details = details;
  }
}

/**
 * Pre-configured validation instances
 */
const strictValidator = new ValidationMiddleware({ 
  strict: true, 
  throwOnError: true 
});

const lenientValidator = new ValidationMiddleware({ 
  strict: false, 
  throwOnError: false 
});

const silentValidator = new ValidationMiddleware({ 
  strict: false, 
  throwOnError: false,
  logValidationErrors: false 
});

/**
 * Utility functions for common validation tasks
 */
const ValidationUtils = {
  /**
   * Sanitize player name
   * @param {string} name - Player name to sanitize
   * @returns {string} Sanitized name
   */
  sanitizePlayerName(name) {
    if (typeof name !== 'string') return '';
    return name.trim().slice(0, 30).replace(/[^\w\s-]/g, '');
  },

  /**
   * Validate game code format
   * @param {string} gameCode - Game code to validate
   * @returns {boolean} True if valid format
   */
  isValidGameCode(gameCode) {
    return BaseSchemas.gameCode.safeParse(gameCode).success;
  },

  /**
   * Validate player ID format
   * @param {string} playerId - Player ID to validate
   * @returns {boolean} True if valid format
   */
  isValidPlayerId(playerId) {
    return BaseSchemas.playerId.safeParse(playerId).success;
  },

  /**
   * Extract validation errors as simple strings
   * @param {ZodError} zodError - Zod error object
   * @returns {string[]} Array of error messages
   */
  extractErrorMessages(zodError) {
    if (!(zodError instanceof ZodError)) return [];
    return zodError.errors.map(err => 
      `${err.path.join('.')}: ${err.message}`
    );
  },

  /**
   * Create a partial schema validator (allows missing optional fields)
   * @param {z.ZodSchema} schema - Base schema
   * @returns {z.ZodSchema} Partial schema
   */
  createPartialValidator(schema) {
    return schema.partial();
  },

  /**
   * Create a deep partial schema validator
   * @param {z.ZodSchema} schema - Base schema
   * @returns {z.ZodSchema} Deep partial schema
   */
  createDeepPartialValidator(schema) {
    return schema.deepPartial();
  }
};

module.exports = {
  ValidationMiddleware,
  ValidationError,
  ValidationUtils,
  strictValidator,
  lenientValidator,
  silentValidator,
  // Export schemas for direct use
  schemas: {
    BaseSchemas,
    PlayerSchemas,
    ActionSchemas,
    GameSchemas,
    SocketSchemas,
    ConfigSchemas
  }
};