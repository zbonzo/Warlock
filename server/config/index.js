/**
 * @fileoverview Main configuration file
 * Combines environment-specific settings with default configuration
 */
const path = require('path');
const fs = require('fs');

/**
 * Default configuration values
 * @type {Object}
 */
const defaultConfig = {
  // Server settings
  port: 3001,
  host: 'localhost',
  
  // Game settings
  maxPlayers: 20,
  minPlayers: 2,
  gameTimeout: 30 * 60 * 1000, // 30 minutes
  roundTimeout: 60 * 1000, // 1 minute
  
  // Security settings
  actionCooldowns: {
    createGame: 2000,   // 2 seconds
    joinGame: 1000,     // 1 second
    playerReady: 500    // 0.5 seconds
  },
  
  // Environment
  env: process.env.NODE_ENV || 'development',
  
  // CORS settings
  corsOrigins: '*',
  
  // Logging
  logLevel: 'info'
};

/**
 * Load environment-specific configuration
 * @returns {Object} Configuration object with defaults and environment-specific overrides
 */
const loadEnvConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  const configPath = path.join(__dirname, `${env}.js`);
  
  try {
    if (fs.existsSync(configPath)) {
      const envConfig = require(configPath);
      return { ...defaultConfig, ...envConfig };
    }
  } catch (err) {
    console.warn(`Failed to load environment configuration for ${env}:`, err.message);
  }
  
  return defaultConfig;
};

/**
 * Apply environment variables to configuration
 * @param {Object} config - Base configuration object
 * @returns {Object} Configuration with environment variable overrides
 */
const loadEnvVariables = (config) => {
  // Port can be set via environment variable
  if (process.env.PORT) {
    config.port = parseInt(process.env.PORT, 10);
  }
  
  // Log level can be set via environment variable
  if (process.env.LOG_LEVEL) {
    config.logLevel = process.env.LOG_LEVEL;
  }
  
  // Game timeout can be set via environment variable (in minutes)
  if (process.env.GAME_TIMEOUT_MINUTES) {
    config.gameTimeout = parseInt(process.env.GAME_TIMEOUT_MINUTES, 10) * 60 * 1000;
  }
  
  return config;
};

// Generate final configuration
const config = loadEnvVariables(loadEnvConfig());

module.exports = config;