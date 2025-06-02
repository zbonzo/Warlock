/**
 * @fileoverview Main message system aggregator
 * Combines all message files and provides unified access
 */

// Import core messages (existing functionality)
const coreMessages = require('./core');

// Import ability messages
const attackMessages = require('./abilities/attacks');
const defenseMessages = require('./abilities/defense');
const healingMessages = require('./abilities/healing');
const specialMessages = require('./abilities/special');
const racialMessages = require('./abilities/racial');

// Import system messages
const combatMessages = require('./combat');
const statusEffectMessages = require('./status-effects');
const warlockMessages = require('./warlock');
const monsterMessages = require('./monster');

// Import player and UI messages
const playerMessages = require('./player');
const uiMessages = require('./ui');

/**
 * Combined message configuration
 */
const messages = {
  // Existing core categories (maintain backward compatibility)
  errors: coreMessages.errors,
  success: coreMessages.success,
  events: coreMessages.events,
  privateMessages: coreMessages.privateMessages,
  winConditions: coreMessages.winConditions,

  // New organized categories
  abilities: {
    attacks: attackMessages,
    defense: defenseMessages,
    healing: healingMessages,
    special: specialMessages,
    racial: racialMessages,
  },

  // System messages
  combat: combatMessages,
  statusEffects: statusEffectMessages,
  warlock: warlockMessages,
  monster: monsterMessages,

  // Player and UI messages
  player: playerMessages,
  ui: uiMessages,
};

/**
 * Helper function to get message from nested categories
 * @param {string} category - Message category path (e.g., 'abilities.attacks')
 * @param {string} key - Message key
 * @returns {string|null} Message template or null if not found
 */
function getAbilityMessage(category, key) {
  const categoryPath = category.split('.');
  let messageConfig = messages;

  // Navigate to the message category
  for (const path of categoryPath) {
    messageConfig = messageConfig[path];
    if (!messageConfig) {
      return null;
    }
  }

  return messageConfig[key] || null;
}

/**
 * Helper function to format messages with placeholders
 * @param {string} template - Message template with {placeholder} syntax
 * @param {Object} data - Data to replace placeholders with
 * @returns {string} Formatted message
 */
function formatMessage(template, data = {}) {
  if (!template) return '';

  return template.replace(/{(\w+)}/g, (match, key) => {
    return data[key] !== undefined ? data[key] : match;
  });
}

/**
 * Helper function to get message by category and key
 * @param {string} category - Message category (errors, success, events, etc.)
 * @param {string} key - Message key
 * @returns {string|null} Message template or null if not found
 */
function getMessage(category, key) {
  const categories = {
    errors: messages.errors,
    success: messages.success,
    events: messages.events,
    privateMessages: messages.privateMessages,
    winConditions: messages.winConditions,
  };
  return categories[category]?.[key] || null;
}

/**
 * Helper function to get formatted error message
 * @param {string} key - Error key
 * @param {Object} data - Data for placeholders
 * @returns {string} Formatted error message
 */
function getError(key, data = {}) {
  const template = messages.errors[key];
  return template ? formatMessage(template, data) : 'Unknown error occurred.';
}

/**
 * Helper function to get formatted success message
 * @param {string} key - Success key
 * @param {Object} data - Data for placeholders
 * @returns {string} Formatted success message
 */
function getSuccess(key, data = {}) {
  const template = messages.success[key];
  return template ? formatMessage(template, data) : 'Action completed.';
}

/**
 * Helper function to get formatted event message
 * @param {string} key - Event key
 * @param {Object} data - Data for placeholders
 * @returns {string} Formatted event message
 */
function getEvent(key, data = {}) {
  const template = messages.events[key];
  return template ? formatMessage(template, data) : '';
}

module.exports = {
  messages,
  events: messages.events,
  errors: messages.errors,
  success: messages.success,
  privateMessages: messages.privateMessages,
  abilities: messages.abilities,
  combat: messages.combat,
  statusEffects: messages.statusEffects,
  warlock: messages.warlock,
  monster: messages.monster,
  player: messages.player,
  ui: messages.ui,
  formatMessage,
  getMessage,
  getError,
  getSuccess,
  getEvent,
  getAbilityMessage,
};


