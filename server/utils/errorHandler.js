/**
 * @fileoverview Error handling utilities
 * Centralizes error creation, handling, and propagation
 */
const logger = require('./logger');

/**
 * Error types
 * @enum {string}
 */
const ErrorTypes = {
  VALIDATION: 'VALIDATION_ERROR',
  GAME_STATE: 'GAME_STATE_ERROR',
  PERMISSION: 'PERMISSION_ERROR',
  NOT_FOUND: 'NOT_FOUND_ERROR',
  SERVER: 'SERVER_ERROR',
};

/**
 * Create a standardized error object
 * @param {string} type - Error type from ErrorTypes
 * @param {string} message - User-friendly error message
 * @param {Object} details - Additional details (optional)
 * @returns {Object} Standardized error object
 */
function createError(type, message, details = {}) {
  return {
    type,
    message,
    details,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Handle errors in socket-based functions
 * @param {Object} socket - Socket.IO socket
 * @param {Function} fn - Function to execute
 * @param {string} actionName - Name of the action for logging
 * @returns {Function} Wrapped function with error handling
 */
function withSocketErrorHandling(socket, fn, actionName) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      handleSocketError(socket, error, actionName);
      return false;
    }
  };
}

/**
 * Handle socket errors consistently
 * @param {Object} socket - Socket.IO socket
 * @param {Error} error - The error that occurred
 * @param {string} actionName - Name of the action for logging
 */
function handleSocketError(socket, error, actionName) {
  // Determine if this is one of our known error types
  const isKnownError = error.type && Object.values(ErrorTypes).includes(error.type);
  
  // Log the error with appropriate severity
  if (isKnownError) {
    logger.warn(`${actionName} error: ${error.message}`, { errorDetails: error.details });
  } else {
    logger.error(`Unexpected ${actionName} error: ${error.message}`, error);
  }
  
  // Send appropriate error message to client
  try {
    socket.emit('errorMessage', { 
      message: error.message || `An error occurred during ${actionName}. Please try again.`,
      code: error.type || ErrorTypes.SERVER
    });
  } catch (emitError) {
    logger.error(`Failed to send error message: ${emitError.message}`);
  }
}

/**
 * Throw a validation error
 * @param {string} message - User-friendly error message
 * @param {Object} details - Validation details (optional)
 */
function throwValidationError(message, details = {}) {
  const error = createError(ErrorTypes.VALIDATION, message, details);
  throw error;
}

/**
 * Throw a game state error
 * @param {string} message - User-friendly error message
 */
function throwGameStateError(message) {
  const error = createError(ErrorTypes.GAME_STATE, message);
  throw error;
}

/**
 * Throw a permission error
 * @param {string} message - User-friendly error message
 */
function throwPermissionError(message) {
  const error = createError(ErrorTypes.PERMISSION, message);
  throw error;
}

/**
 * Throw a not found error
 * @param {string} message - User-friendly error message
 */
function throwNotFoundError(message) {
  const error = createError(ErrorTypes.NOT_FOUND, message);
  throw error;
}

module.exports = {
  ErrorTypes,
  createError,
  withSocketErrorHandling,
  handleSocketError,
  throwValidationError,
  throwGameStateError,
  throwPermissionError,
  throwNotFoundError
};