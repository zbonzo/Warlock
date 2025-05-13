/**
 * @fileoverview Logging utility for consistent log formatting
 * Centralizes logging configuration and behavior
 */

/**
 * Log levels for controlling output verbosity
 * @enum {number}
 */
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

// Current log level from environment or default to INFO
const currentLevel = process.env.LOG_LEVEL 
  ? LOG_LEVELS[process.env.LOG_LEVEL.toUpperCase()] 
  : LOG_LEVELS.INFO;

/**
 * Format log message with timestamp and level
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @returns {string} Formatted message
 * @private
 */
function formatMessage(level, message) {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level}] ${message}`;
}

/**
 * Log error message
 * @param {string} message - Log message
 * @param {...any} args - Additional arguments
 */
function error(message, ...args) {
  if (currentLevel >= LOG_LEVELS.ERROR) {
    console.error(formatMessage('ERROR', message), ...args);
  }
}

/**
 * Log warning message
 * @param {string} message - Log message
 * @param {...any} args - Additional arguments
 */
function warn(message, ...args) {
  if (currentLevel >= LOG_LEVELS.WARN) {
    console.warn(formatMessage('WARN', message), ...args);
  }
}

/**
 * Log info message
 * @param {string} message - Log message
 * @param {...any} args - Additional arguments
 */
function info(message, ...args) {
  if (currentLevel >= LOG_LEVELS.INFO) {
    console.info(formatMessage('INFO', message), ...args);
  }
}

/**
 * Log debug message
 * @param {string} message - Log message
 * @param {...any} args - Additional arguments
 */
function debug(message, ...args) {
  if (currentLevel >= LOG_LEVELS.DEBUG) {
    console.debug(formatMessage('DEBUG', message), ...args);
  }
}

module.exports = {
  error,
  warn,
  info,
  debug
};