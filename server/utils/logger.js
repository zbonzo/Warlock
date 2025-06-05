/**
 * @fileoverview Logging utility for structured, consistent log formatting.
 * Outputs human-readable messages to console and structured JSON to a log file.
 */
const fs = require('fs');
const path = require('path');
const serverLogMessages = require('@config/messages/logs.js');

// STRETCH GOAL: Placeholder for an APM/Analytics client
// const apmClient = require('./apm-client');

const LOG_FILE_PATH = path.join(__dirname, '..', 'logs', 'application.log'); // Define log file path

/**
 * Ensure log directory exists.
 */
function ensureLogDirectoryExists() {
  const logDir = path.dirname(LOG_FILE_PATH);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
}

ensureLogDirectoryExists(); // Create log directory on startup if it doesn't exist

const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
};

const LEVEL_HIERARCHY = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const currentLevel = process.env.LOG_LEVEL
  ? LEVEL_HIERARCHY[process.env.LOG_LEVEL.toLowerCase()]
  : LEVEL_HIERARCHY.info;

/**
 * Retrieves and interpolates a log message from the logs configuration.
 * @param {string} level - The log level.
 * @param {string} eventKey - The unique key for the log event.
 * @param {object} context - Data to interpolate.
 * @returns {string} The formatted message string, or the eventKey if not found.
 * @private
 */
function getFormattedMessage(level, eventKey, context = {}) {
  let messageTemplate = serverLogMessages[level]?.[eventKey] || eventKey;

  for (const key in context) {
    if (Object.prototype.hasOwnProperty.call(context, key)) {
      const placeholder = `{${key}}`;
      let value = context[key];
      if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
          value = value.join(', ');
        } else if (value instanceof Error) {
          value = value.message;
        } else {
          // For console, a brief summary for objects might be better
          // For file log, the full object is in context
          value = '[Object]';
        }
      }
      messageTemplate = messageTemplate.replace(
        new RegExp(placeholder, 'g'),
        value
      );
    }
  }
  return messageTemplate;
}

/**
 * Writes the structured log entry to a file.
 * @param {object} logEntry - The structured JSON log object.
 * @private
 * TODO: Commented until I can find a better way to handle all the file writing
 */
function writeLogToFile(logEntry) {
  /*const logString = JSON.stringify(logEntry) + '\n'; // Add newline for each entry
  fs.appendFile(LOG_FILE_PATH, logString, (err) => {
    if (err) {
      // Fallback to console if file logging fails
      console.error('Failed to write log to file:', err);
      console.error('Original log entry:', logString);
    }
  });*/
}

/**
 * Prepares the full structured log object and the console message.
 * @param {string} level - Log level string (e.g., 'info').
 * @param {string} eventKey - Unique key for the log event.
 * @param {object} context - Supplementary data.
 * @private
 */
function processLog(level, eventKey, context = {}) {
  // 1. Prepare human-readable message for console
  const consoleMessage = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${getFormattedMessage(
    level,
    eventKey,
    context
  )}`;

  // 2. Prepare structured JSON object for file logging
  const fileLogEntry = {
    timestamp: new Date().toISOString(),
    level,
    eventKey,
    message: getFormattedMessage(level, eventKey, context), // Re-interpolate for completeness in file if needed
    ...context,
  };
  if (context.error && context.error instanceof Error) {
    fileLogEntry.error = {
      message: context.error.message,
      stack: context.error.stack,
      type: context.error.type,
      ...context.error,
    };
  }

  // 3. Log to console
  const consoleMethod = console[level] || console.log;
  consoleMethod(consoleMessage);

  // 4. Log to file
  writeLogToFile(fileLogEntry);
}

function error(eventKey, context = {}) {
  if (currentLevel >= LEVEL_HIERARCHY.error) {
    processLog(LOG_LEVELS.ERROR, eventKey, context);
    // if (context.error) apmClient.captureException(context.error);
  }
}

function warn(eventKey, context = {}) {
  if (currentLevel >= LEVEL_HIERARCHY.warn) {
    processLog(LOG_LEVELS.WARN, eventKey, context);
  }
}

function info(eventKey, context = {}) {
  if (currentLevel >= LEVEL_HIERARCHY.info) {
    processLog(LOG_LEVELS.INFO, eventKey, context);
  }
}

function debug(eventKey, context = {}) {
  if (currentLevel >= LEVEL_HIERARCHY.debug) {
    processLog(LOG_LEVELS.DEBUG, eventKey, context);
  }
}

function track(eventKey, properties = {}) {
  const interpolatedMessage =
    getFormattedMessage('info', eventKey, properties) || eventKey; // Track can use 'info' level for messages
  const consoleTrackMessage = `[TRACK] [${new Date().toISOString()}] ${interpolatedMessage}`;

  const fileTrackLog = {
    timestamp: new Date().toISOString(),
    type: 'track',
    eventKey,
    event: interpolatedMessage,
    properties,
  };

  console.log(consoleTrackMessage); // Specific console format for track events
  writeLogToFile(fileTrackLog);
  // apmClient.trackEvent(eventKey, properties);
}

module.exports = {
  error,
  warn,
  info,
  debug,
  track,
};
