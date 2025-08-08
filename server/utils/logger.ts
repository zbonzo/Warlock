/**
 * @fileoverview Logging utility for structured, consistent log formatting.
 * Outputs human-readable messages to console and structured JSON to a log file.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import server log messages
import serverLogMessages from '../config/messages/logs.js';

// STRETCH GOAL: Placeholder for an APM/Analytics client
// import apmClient from './apm-client';

const LOG_FILE_PATH = path.join(__dirname, '..', 'logs', 'application.log');

interface LogContext {
  [key: string]: any;
  error?: unknown;
}

interface GameContext {
  gameCode?: string;
  socketId?: string;
  playerName?: string;
}

interface FileLogEntry {
  timestamp: string;
  level: string;
  eventKey: string;
  message: string;
  gameCode?: string;
  socketId?: string;
  playerName?: string;
  error?: {
    message: string;
    stack?: string;
    type?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

interface TrackLogEntry {
  timestamp: string;
  type: 'track';
  eventKey: string;
  event: string;
  properties: Record<string, any>;
}

/**
 * Ensure log directory exists.
 */
function ensureLogDirectoryExists(): void {
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
} as const;

const LEVEL_HIERARCHY = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
} as const;

type LogLevel = keyof typeof LEVEL_HIERARCHY;

const currentLevel = process.env['LOG_LEVEL']
  ? LEVEL_HIERARCHY[process.env['LOG_LEVEL'].toLowerCase() as LogLevel] ?? LEVEL_HIERARCHY.info
  : LEVEL_HIERARCHY.info;

/**
 * Retrieves and interpolates a log message from the logs configuration.
 */
function getFormattedMessage(level: string, eventKey: string, context: LogContext = {}): string {
  // Dynamic message template access needed for flexible logging system
  let messageTemplate = (serverLogMessages as any)[level]?.[eventKey] || eventKey;

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
        String(value)
      );
    }
  }
  return messageTemplate;
}

/**
 * Writes the structured log entry to a file.
 * TODO: Commented until I can find a better way to handle all the file writing
 */
function writeLogToFile(_logEntry: FileLogEntry | TrackLogEntry): void {
  /* const logString = JSON.stringify(logEntry) + '\n'; // Add newline for each entry
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
 */
function processLog(level: string, eventKey: string, context: LogContext = {}, gameContext: GameContext = {}): void {
  const timestamp = new Date().toISOString();
  const levelUpper = level.toUpperCase();

  // Enhanced format: [dev:server] [timestamp] [LEVEL] [GameCode] [SocketID] [PlayerName] message
  const gameCode = gameContext.gameCode || 'none';
  const socketId = gameContext.socketId || 'null';
  const playerName = gameContext.playerName || 'system  '; // 8 chars

  // Format socket ID (first 4 chars unless debug)
  const formattedSocketId = (level === 'debug' ? socketId : socketId.substring(0, 4));

  // Format player name (first 8 chars, padded to 8 if shorter)
  const formattedPlayerName = level === 'debug'
    ? playerName
    : playerName.substring(0, 8).padEnd(8, ' ');

  // Build the enhanced console message
  let consoleMessage: string;
  if (gameContext.gameCode || gameContext.socketId || gameContext.playerName) {
    consoleMessage = `[dev:server] [${timestamp}] [${levelUpper}] [${gameCode}] [${formattedSocketId}] [${formattedPlayerName}] ${getFormattedMessage(
      level,
      eventKey,
      context
    )}`;
  } else {
    // Fallback to original format for backward compatibility
    consoleMessage = `[${timestamp}] [${levelUpper}] ${getFormattedMessage(
      level,
      eventKey,
      context
    )}`;
  }

  // 2. Prepare structured JSON object for file logging
  const fileLogEntry: FileLogEntry = {
    timestamp,
    level,
    eventKey,
    message: getFormattedMessage(level, eventKey, context),
    gameCode: gameContext.gameCode,
    socketId: gameContext.socketId,
    playerName: gameContext.playerName,
  };

  // Add context properties except for conflicting ones
  Object.keys(context).forEach(key => {
    if (key !== 'message') {
      // Dynamic property assignment needed for flexible logging context
      (fileLogEntry as any)[key] = context[key];
    }
  });

  if (context.error) {
    const errorObj = context.error instanceof Error ? context.error : new Error(String(context.error));
    fileLogEntry.error = {
      message: errorObj.message,
      stack: errorObj.stack,
      // Dynamic property access needed for custom error types
      type: (errorObj as any).type,
      name: errorObj.name,
    };
  }

  // 3. Log to console
  // Dynamic console method access needed for flexible log levels
  const consoleMethod = (console as any)[level] || console.log;
  consoleMethod(consoleMessage);

  // 4. Log to file
  writeLogToFile(fileLogEntry);
}

function error(eventKey: string, context: LogContext = {}, gameContext: GameContext = {}): void {
  if (currentLevel >= LEVEL_HIERARCHY.error) {
    processLog(LOG_LEVELS.ERROR, eventKey, context, gameContext);
    // if (context.error) apmClient.captureException(context.error);
  }
}

function warn(eventKey: string, context: LogContext = {}, gameContext: GameContext = {}): void {
  if (currentLevel >= LEVEL_HIERARCHY.warn) {
    processLog(LOG_LEVELS.WARN, eventKey, context, gameContext);
  }
}

function info(eventKey: string, context: LogContext = {}, gameContext: GameContext = {}): void {
  if (currentLevel >= LEVEL_HIERARCHY.info) {
    processLog(LOG_LEVELS.INFO, eventKey, context, gameContext);
  }
}

function debug(eventKey: string, context: LogContext = {}, gameContext: GameContext = {}): void {
  if (currentLevel >= LEVEL_HIERARCHY.debug) {
    processLog(LOG_LEVELS.DEBUG, eventKey, context, gameContext);
  }
}

function track(eventKey: string, properties: Record<string, any> = {}): void {
  const interpolatedMessage =
    getFormattedMessage('info', eventKey, properties) || eventKey; // Track can use 'info' level for messages
  const consoleTrackMessage = `[TRACK] [${new Date().toISOString()}] ${interpolatedMessage}`;

  const fileTrackLog: TrackLogEntry = {
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

// Helper function for logging errors from catch blocks
function logError(eventKey: string, error: unknown, gameContext: GameContext = {}): void {
  logger.error(eventKey, { error }, gameContext);
}

const logger = {
  error,
  warn,
  info,
  debug,
  track,
  logError,
};

export default logger;

// Type exports (for TypeScript only - not affecting runtime)
// export type { LogContext, GameContext, LogLevel };
