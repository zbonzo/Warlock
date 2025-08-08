/**
 * @fileoverview Test environment configuration
 * Settings optimized for automated testing
 */
import { EnvironmentConfig } from './types.js';

const config: EnvironmentConfig = {
  // Logging
  logLevel: 'error', // Minimal logging during tests

  // Super short timeouts for faster tests
  gameTimeout: 30 * 1000,     // 30 seconds
  roundTimeout: 5 * 1000,     // 5 seconds

  // Minimal cooldowns for faster tests
  actionCooldowns: {
    createGame: 0,      // No cooldown
    joinGame: 0,        // No cooldown
    playerReady: 0      // No cooldown
  },

  // Test configuration
  minPlayers: 1,        // Allow single player for testing
  maxPlayers: 8,        // Limit test games

  // Disable rate limiting for tests
  rateLimiting: {
    defaultLimit: 1000,        // Essentially unlimited
    defaultTimeWindow: 1000,   // Short window
    actionLimits: {
      createGame: { limit: 1000, window: 1000 },
      joinGame: { limit: 1000, window: 1000 },
      performAction: { limit: 1000, window: 1000 }
    }
  },

  // CORS for testing
  corsOrigins: '*',

  // Deterministic behavior for tests
  enableRandomness: false,  // Make random events deterministic

  // In-memory database for tests
  database: {
    inMemory: true,
    logging: false
  },

  // Special test helpers
  testing: {
    enableTestHelpers: true,
    mockNetworkDelay: 0,
    controlledRandomSeed: 12345, // Fixed seed for "random" events
    skipAnimations: true,
    forceExecutionOrder: true,
    automaticCleanup: true
  },

  // Debug config
  debug: {
    logAllEvents: false,
    showDetailedErrors: true,
    enableTestEndpoints: true
  }
};

export default config;
