/**
 * @fileoverview Development environment configuration
 * Overrides for local development
 */
module.exports = {
  // Logging
  logLevel: 'debug',

  // Development-specific timeouts (shorter for faster testing)
  gameTimeout: 10 * 60 * 1000, // 10 minutes instead of 30
  roundTimeout: 30 * 1000, // 30 seconds instead of 60

  // Relaxed action cooldowns for development
  actionCooldowns: {
    createGame: 1000, // 1 second
    joinGame: 500, // 0.5 seconds
    playerReady: 250, // 0.25 seconds
  },

  // Development-specific game settings
  minPlayers: 1, // Allow single player for testing

  // Rate limiting (more lenient in development)
  rateLimiting: {
    defaultLimit: 10, // More actions allowed
    defaultTimeWindow: 30000, // Shorter window
    actionLimits: {
      createGame: { limit: 5, window: 30000 },
      joinGame: { limit: 10, window: 30000 },
      performAction: { limit: 20, window: 30000 },
    },
  },

  // CORS settings for development
  corsOrigins: '*',

  // Development debugging features
  debug: {
    logAllEvents: true,
    showDetailedErrors: true,
    enableTestEndpoints: true,
  },
};

