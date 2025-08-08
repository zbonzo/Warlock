/**
 * @fileoverview Error handling and APM utilities.
 * Centralizes error creation, handling, and performance monitoring.
 */

import { performance } from 'perf_hooks';
import logger from './logger.js';

/**
 * Error types.
 * Note: All enum values are used by the error handling functions below
 */
export enum ErrorTypes {
  // eslint-disable-next-line no-unused-vars
  VALIDATION = 'VALIDATION_ERROR',
  // eslint-disable-next-line no-unused-vars
  GAME_STATE = 'GAME_STATE_ERROR',
  // eslint-disable-next-line no-unused-vars
  PERMISSION = 'PERMISSION_ERROR',
  // eslint-disable-next-line no-unused-vars
  NOT_FOUND = 'NOT_FOUND_ERROR',
  // eslint-disable-next-line no-unused-vars
  SERVER = 'SERVER_ERROR',
}

interface ErrorDetails {
  [key: string]: any;
}

interface CustomError extends Error {
  type: ErrorTypes;
  details: ErrorDetails;
  timestamp: string;
}

interface Socket {
  id: string;
  playerId?: string;
  emit: (_event: string, _data: any) => void;
}

interface ErrorContext {
  action: string;
  socketId: string;
  playerId?: string;
  durationMs: number;
  error: {
    message: string;
    type: ErrorTypes;
    details?: ErrorDetails;
    stack?: string;
  };
}

interface ErrorMessage {
  message: string;
  code: ErrorTypes;
}

/**
 * Create a standardized error object.
 */
export function createError(type: ErrorTypes, message: string, details: ErrorDetails = {}): CustomError {
  const error = new Error(message) as CustomError;
  error.type = type;
  error.details = details;
  error.timestamp = new Date().toISOString();
  return error;
}

/**
 * A decorator for socket functions that adds error handling and performance monitoring.
 */
export function withSocketErrorHandling<T extends any[], R>(
  socket: Socket,
  fn: (..._args: T) => Promise<R>,
  actionName: string
): (..._args: T) => Promise<R | false> {
  return async (...args: T): Promise<R | false> => {
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
      handleSocketError(socket, error as Error, actionName, duration);
      return false;
    }
  };
}

/**
 * Handle socket errors consistently.
 */
export function handleSocketError(socket: Socket, error: Error, actionName: string, duration: number): void {
  const customError = error as CustomError;
  const isKnownError = customError.type && Object.values(ErrorTypes).includes(customError.type);

  const errorContext: ErrorContext = {
    action: actionName,
    socketId: socket.id,
    playerId: socket.playerId,
    durationMs: parseFloat(duration.toFixed(2)),
    error: {
      message: error.message,
      type: customError.type,
      details: customError.details,
      stack: error.stack, // Include stack for unexpected errors
    },
  };

  if (isKnownError) {
    logger.warn('SocketActionKnownError', errorContext);
  } else {
    console.error('FULL ERROR DETAILS:', error);
    console.error('STACK TRACE:', error.stack);
    // Ensure `type` and `message` are set for unexpected errors
    errorContext.error.type = ErrorTypes.SERVER;
    errorContext.error.message = error.message || 'An unexpected error occurred.';
    logger.error('SocketActionUnexpectedError', errorContext);
  }

  try {
    const errorMessage: ErrorMessage = {
      message: error.message || `An error occurred during ${actionName}. Please try again.`,
      code: customError.type || ErrorTypes.SERVER,
    };
    socket.emit('errorMessage', errorMessage);
  } catch (emitError) {
    logger.error('FailedToSendErrorMessage', {
      originalAction: actionName,
      emitError: {
        message: (emitError as Error).message,
        stack: (emitError as Error).stack
      },
    });
  }
}

/**
 * Throw a validation error.
 */
export function throwValidationError(message: string, details: ErrorDetails = {}): never {
  throw createError(ErrorTypes.VALIDATION, message, details);
}

/**
 * Throw a game state error.
 */
export function throwGameStateError(message: string): never {
  throw createError(ErrorTypes.GAME_STATE, message);
}

/**
 * Throw a permission error.
 */
export function throwPermissionError(message: string): never {
  throw createError(ErrorTypes.PERMISSION, message);
}

/**
 * Throw a not found error.
 */
export function throwNotFoundError(message: string): never {
  throw createError(ErrorTypes.NOT_FOUND, message);
}

export default {
  ErrorTypes,
  createError,
  withSocketErrorHandling,
  handleSocketError,
  throwValidationError,
  throwGameStateError,
  throwPermissionError,
  throwNotFoundError,
};
