/**
 * @fileoverview Centralized configuration loader
 * Exports all game configuration from a single entry point
 */
const path = require('path');
const fs = require('fs');

// Load game-specific configs
const classAbilities = require('./classAbilities');
const racialAbilities = require('./racialAbilities');
const gameBalance = require('./gameBalance');
const statusEffects = require('./statusEffects');
const messages = require('./messages');

/**
 * Default configuration values
 * These are the base server/game settings
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
 * @returns {Object} Environment-specific overrides
 */
const loadEnvConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  const configPath = path.join(__dirname, 'environments', `${env}.js`);
  
  try {
    if (fs.existsSync(configPath)) {
      const envConfig = require(configPath);
      return envConfig;
    }
  } catch (err) {
    console.warn(`Failed to load environment configuration for ${env}:`, err.message);
  }
  
  return {};
};

/**
 * Apply environment variables to configuration
 * @param {Object} config - Base configuration object
 * @returns {Object} Configuration with environment variable overrides
 */
const loadEnvVariables = (config) => {
  const envConfig = { ...config };
  
  // Port can be set via environment variable
  if (process.env.PORT) {
    envConfig.port = parseInt(process.env.PORT, 10);
  }
  
  // Log level can be set via environment variable
  if (process.env.LOG_LEVEL) {
    envConfig.logLevel = process.env.LOG_LEVEL;
  }
  
  // Game timeout can be set via environment variable (in minutes)
  if (process.env.GAME_TIMEOUT_MINUTES) {
    envConfig.gameTimeout = parseInt(process.env.GAME_TIMEOUT_MINUTES, 10) * 60 * 1000;
  }
  
  return envConfig;
};

// Generate base server configuration
const baseServerConfig = loadEnvVariables({ ...defaultConfig, ...loadEnvConfig() });

/**
 * Complete configuration object
 * Combines server config with all game-specific configs
 */
const config = {
  // Server configuration (from environment)
  ...baseServerConfig,
  
  // Game mechanics configurations
  classAbilities,
  racialAbilities,
  gameBalance,
  statusEffects,
  messages,
  
  // Convenience methods
  getClassAbilities: (className) => classAbilities[className] || [],
  getRacialAbility: (raceName) => racialAbilities[raceName] || null,
  getStatusEffectDefaults: (effectName) => statusEffects[effectName]?.default || {},
  getMessage: (category, key) => messages[category]?.[key] || 'Unknown message',
  
  // Calculated values (examples)
  get maxGameCode() {
    return this.gameBalance?.gameCode?.maxValue || 9999;
  },
  get minGameCode() {
    return this.gameBalance?.gameCode?.minValue || 1000;
  }
};

module.exports = config;