/**
 * @fileoverview Main message system aggregator
 * Combines all message files and provides unified access
 */

// Import core messages (existing functionality)
import coreMessages from './core.js';

// Import ability messages
import attackMessages from './abilities/attacks.js';
import defenseMessages from './abilities/defense.js';
import healingMessages from './abilities/healing.js';
import specialMessages from './abilities/special.js';
import racialMessages from './abilities/racial.js';

// Import system messages
import combatMessages from './combat.js';
import statusEffectMessages from './status-effects.js';
import warlockMessages from './warlock.js';
import monsterMessages from './monster.js';

// Import player and UI messages
import playerMessages from './player.js';
import uiMessages from './ui.js';
import serverMessages from './logs.js';

/**
 * Combined message configuration
 */
const messages = {
  // Core messages
  success: coreMessages.success,
  errors: coreMessages.errors,
  events: coreMessages.events,
  winConditions: coreMessages.winConditions,
  privateMessages: coreMessages.privateMessages,

  // Ability messages organized by category
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

  // Player and UI
  player: playerMessages,
  ui: uiMessages,
  serverLogMessages: serverMessages,
};

/**
 * Format a message template with provided parameters
 */
function formatMessage(template: string, params: Record<string, any> = {}): string {
  let formatted = template;

  for (const [key, value] of Object.entries(params)) {
    const placeholder = `{${key}}`;
    formatted = formatted.replace(new RegExp(placeholder, 'g'), String(value));
  }

  return formatted;
}

/**
 * Get a message by path (dot notation)
 */
function getMessage(path: string): string | null {
  const keys = path.split('.');
  let current: any = messages;

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return null;
    }
  }

  return typeof current === 'string' ? current : null;
}

/**
 * Get an error message
 */
function getError(key: string): string {
  return getMessage(`error.${key}`) || `Error: ${key}`;
}

/**
 * Get a success message
 */
function getSuccess(key: string): string {
  return getMessage(`success.${key}`) || `Success: ${key}`;
}

/**
 * Get an event message
 */
function getEvent(key: string): string {
  return getMessage(`events.${key}`) || `Event: ${key}`;
}

/**
 * Get an ability message by category and key
 */
function getAbilityMessage(category: string, key: string): string {
  return getMessage(`abilities.${category}.${key}`) || `Ability: ${category}.${key}`;
}

export default {
  // Message data
  success: messages.success,
  errors: messages.errors,
  events: messages.events,
  privateMessages: messages.privateMessages,
  winConditions: messages.winConditions,
  abilities: messages.abilities,
  combat: messages.combat,
  statusEffects: messages.statusEffects,
  warlock: messages.warlock,
  monster: messages.monster,
  player: messages.player,
  ui: messages.ui,
  serverLogMessages: messages.serverLogMessages,

  // Helper functions
  formatMessage,
  getMessage,
  getError,
  getSuccess,
  getEvent,
  getAbilityMessage,
};

export {
  formatMessage,
  getMessage,
  getError,
  getSuccess,
  getEvent,
  getAbilityMessage,
};
