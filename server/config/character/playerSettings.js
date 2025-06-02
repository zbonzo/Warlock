/**
 * @fileoverview Player configuration settings
 * Defines player-related settings and defaults
 */

/**
 * Player configuration
 * @type {Object}
 */
const playerSettings = {
  // Default player settings
  defaultPlayerName: 'Player',
  baseHp: 100,
  baseArmor: 0,
  baseDamageMod: 1.0,
  
  // Reconnection settings
  reconnectionWindow: 60 * 1000, // 60 seconds in milliseconds
  maxReconnectionAttempts: 3,
  
  // Leveling settings
  hpIncreasePerLevel: 0.2, // 20% HP increase per level
  damageIncreasePerLevel: 0.25, // 25% damage increase per level
  
  // Death and resurrection
  pendingDeathEnabled: true, // Use pending death instead of immediate death
  deathMessageDelay: 1500 // Show death message for 1.5 seconds before processing
};

module.exports = playerSettings;
