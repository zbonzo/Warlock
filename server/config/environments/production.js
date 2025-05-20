/**
 * @fileoverview Production environment configuration
 * Optimized settings for production deployment
 */
module.exports = {
  // Logging
  logLevel: 'info',
  
  // Production timeouts (longer for stability)
  gameTimeout: 45 * 60 * 1000, // 45 minutes
  roundTimeout: 90 * 1000,     // 90 seconds
  
  // Stricter action cooldowns for production
  actionCooldowns: {
    createGame: 3000,   // 3 seconds
    joinGame: 1500,     // 1.5 seconds
    playerReady: 800    // 0.8 seconds
  },
  
  // Production game limits
  maxPlayers: 16,       // Slightly reduced for performance
  minPlayers: 3,        // Require more players for better games
  
  // Stricter rate limiting in production
  rateLimiting: {
    defaultLimit: 3,            // Fewer actions allowed
    defaultTimeWindow: 60000,   // Standard window
    actionLimits: {
      createGame: { limit: 1, window: 120000 },  // 1 game per 2 minutes
      joinGame: { limit: 3, window: 60000 },     // 3 joins per minute
      performAction: { limit: 5, window: 60000 } // 5 actions per minute
    }
  },
  
  // CORS settings for production (should be specific domains)
  corsOrigins: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  
  // Production security settings
  security: {
    enableRateLimiting: true,
    logSuspiciousActivity: true,
    maxConnectionsPerIP: 3
  },
  
  // Performance optimizations
  performance: {
    enableGzip: true,
    enableEtag: true,
    cacheStaticFiles: true,
    cacheExpiry: 86400 // 1 day in seconds
  },
  
  // Server scaling
  maxGames: 500,
  serverMemoryThreshold: 0.85, // 85% memory usage threshold for alerts
  
  // Debug settings
  debug: {
    logAllEvents: false,
    showDetailedErrors: false,
    enableTestEndpoints: false
  }
};