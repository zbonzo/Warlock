/**
 * @fileoverview Error handling and APM utilities.
 * Centralizes error creation, handling, and performance monitoring.
 */
const { performance } = require('perf_hooks');
const logger = require('./logger');

/**
 * Error types.
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
 * Create a standardized error object.
 * @param {string} type - Error type from ErrorTypes.
 * @param {string} message - User-friendly error message.
 * @param {Object} details - Additional details (optional).
 * @returns {Error} A standard Error object with extra properties.
 */
function createError(type, message, details = {}) {
  const error = new Error(message);
  error.type = type;
  error.details = details;
  error.timestamp = new Date().toISOString();
  return error;
}

/**
 * A decorator for socket functions that adds error handling and performance monitoring.
 * @param {Object} socket - Socket.IO socket.
 * @param {Function} fn - The async function to execute.
 * @param {string} actionName - A unique name for the action (e.g., 'player:joinGame').
 * @returns {Function} Wrapped function with error handling and APM.
 */
function withSocketErrorHandling(socket, fn, actionName) {
  return async (...args) => {
    const startTime = performance.now();
    try {
      const result = await fn(...args);
      const duration = performance.now() - startTime;
      logger.info('SocketActionSuccess', {
        action: actionName,
        socketId: socket.id,
        playerId: socket.playerId, // Assuming playerId is attached to the socket
        durationMs: parseFloat(duration.toFixed(2)),
      });
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      handleSocketError(socket, error, actionName, duration);
      return false;
    }
  };
}

/**
 * Handle socket errors consistently.
 * @param {Object} socket - Socket.IO socket.
 * @param {Error} error - The error that occurred.
 * @param {string} actionName - Name of the action for logging.
 * @param {number} duration - The duration of the action before it failed.
 */
function handleSocketError(socket, error, actionName, duration) {
  const isKnownError =
    error.type && Object.values(ErrorTypes).includes(error.type);

  const errorContext = {
    action: actionName,
    socketId: socket.id,
    playerId: socket.playerId,
    durationMs: parseFloat(duration.toFixed(2)),
    error: {
      message: error.message,
      type: error.type,
      details: error.details,
      stack: error.stack, // Include stack for unexpected errors
    },
  };

  if (isKnownError) {
    logger.warn('SocketActionKnownError', errorContext);
  } else {
    // Ensure `type` and `message` are set for unexpected errors
    errorContext.error.type = ErrorTypes.SERVER;
    errorContext.error.message =
      error.message || 'An unexpected error occurred.';
    logger.error('SocketActionUnexpectedError', errorContext);
  }

  try {
    socket.emit('errorMessage', {
      message:
        error.message ||
        `An error occurred during ${actionName}. Please try again.`,
      code: error.type || ErrorTypes.SERVER,
    });
  } catch (emitError) {
    logger.error('FailedToSendErrorMessage', {
      originalAction: actionName,
      emitError: { message: emitError.message, stack: emitError.stack },
    });
  }
}

/**
 * Throw a validation error.
 * @param {string} message - User-friendly error message.
 * @param {Object} details - Validation details (optional).
 */
function throwValidationError(message, details = {}) {
  throw createError(ErrorTypes.VALIDATION, message, details);
}

// ... (other throw functions remain the same)
function throwGameStateError(message) {
  throw createError(ErrorTypes.GAME_STATE, message);
}
function throwPermissionError(message) {
  throw createError(ErrorTypes.PERMISSION, message);
}
function throwNotFoundError(message) {
  throw createError(ErrorTypes.NOT_FOUND, message);
}

module.exports = {
  ErrorTypes,
  createError,
  withSocketErrorHandling,
  handleSocketError,
  throwValidationError,
  throwGameStateError,
  throwPermissionError,
  throwNotFoundError,
};
