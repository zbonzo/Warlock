/**
 * @fileoverview Status effects configuration
 * Defines default parameters and behavior for all status effects
 */

/**
 * Poison effect configuration
 */
const poison = {
  // Default values when not specified
  default: {
    damage: 5, // Damage per turn
    turns: 3, // Number of turns active
  },

  // Effect behavior
  stackable: false, // Can multiple poisons stack?
  refreshable: true, // Can poison be refreshed/renewed?

  // Interaction with other systems
  triggersStoneDegradation: true, // Causes stone armor to degrade
  canCauseDeath: true, // Can kill player when HP reaches 0

  // Display settings
  messages: {
    applied: '{playerName} is poisoned for {damage} damage over {turns} turns.',
    refreshed:
      "{playerName}'s poison is refreshed for {damage} damage over {turns} turns.",
    damage: '{playerName} suffers {damage} poison damage.',
    expired: 'The poison affecting {playerName} has worn off.',
  },
};

/**
 * Protection effect configuration
 */
const protected = {
  // Default values
  default: {
    armor: 2, // Additional armor provided
    turns: 1, // Duration in turns
  },

  // Effect behavior
  stackable: false, // Multiple protections don't stack
  refreshable: true, // Can be refreshed to extend duration

  // Mechanics
  armorStacks: true, // Adds to existing armor

  // Display settings
  messages: {
    applied:
      '{playerName} is protected with {armor} armor for {turns} turn(s).',
    refreshed: "{playerName}'s protection is refreshed for {turns} turn(s).",
    expired: '{playerName} is no longer protected.',
  },
};

/**
 * Invisibility effect configuration
 */
const invisible = {
  // Default values
  default: {
    turns: 1, // Duration in turns
  },

  // Effect behavior
  stackable: false, // Multiple invisibility don't stack
  refreshable: true, // Can extend duration

  // Mechanics
  preventsTargeting: true, // Cannot be targeted by attacks
  allowsSelfTargeting: true, // Can still target self
  breaksOnAction: false, // Doesn't break when acting

  // Interaction rules
  redirectsAttacks: true, // Attacks redirect to other targets
  affectsMonster: true, // Monster cannot target invisible players

  // Display settings
  messages: {
    applied: '{playerName} becomes invisible for {turns} turn(s).',
    refreshed: "{playerName}'s invisibility is extended for {turns} turn(s).",
    expired: '{playerName} is no longer invisible.',
    attackMissed:
      '{attackerName} tries to attack {playerName}, but they are invisible!',
  },
};

/**
 * Stunned effect configuration
 */
const stunned = {
  // Default values
  default: {
    turns: 1, // Duration in turns
  },

  // Effect behavior
  stackable: false, // Multiple stuns don't stack
  refreshable: true, // Can extend duration

  // Mechanics
  preventsActions: true, // Cannot perform any actions
  preventsRacialAbilities: true, // Cannot use racial abilities
  allowsPassiveEffects: true, // Still affected by poison, etc.

  // Display settings
  messages: {
    applied: '{playerName} is stunned for {turns} turn(s).',
    refreshed: '{playerName} remains stunned for {turns} more turn(s).',
    expired: '{playerName} is no longer stunned.',
    cannotAct: 'You are stunned and cannot act.',
  },
};

/**
 * Effect processing order
 * Lower numbers are processed first each round
 */
const processingOrder = {
  poison: 1, // Process poison damage first
  protected: 2, // Then update protection
  invisible: 3, // Then handle invisibility
  stunned: 4, // Finally process stun effects
};

/**
 * Global effect settings
 */
const global = {
  // Maximum effects per player
  maxEffectsPerPlayer: 10,

  // Effect duration limits
  maxTurns: 10, // No effect lasts longer than 10 turns
  minTurns: 1, // All effects last at least 1 turn

  // Processing settings
  processBeforeActions: true, // Process effects before player actions
  processAfterActions: false, // Don't process again after actions

  // Cleanup settings
  removeExpiredImmediately: true,
  allowZeroTurnEffects: false, // Remove effects with 0 turns remaining
};

/**
 * Helper function to get effect defaults by name
 * @param {string} effectName - Name of the effect
 * @returns {Object|null} Default parameters or null if not found
 */
function getEffectDefaults(effectName) {
  const effects = { poison, protected, invisible, stunned };
  return effects[effectName]?.default || null;
}

/**
 * Helper function to check if effect is stackable
 * @param {string} effectName - Name of the effect
 * @returns {boolean} Whether the effect can stack
 */
function isEffectStackable(effectName) {
  const effects = { poison, protected, invisible, stunned };
  return effects[effectName]?.stackable || false;
}

/**
 * Helper function to check if effect is refreshable
 * @param {string} effectName - Name of the effect
 * @returns {boolean} Whether the effect can be refreshed
 */
function isEffectRefreshable(effectName) {
  const effects = { poison, protected, invisible, stunned };
  return effects[effectName]?.refreshable || false;
}

/**
 * Helper function to get effect message template
 * @param {string} effectName - Name of the effect
 * @param {string} messageType - Type of message (applied, expired, etc.)
 * @param {Object} data - Data for message formatting
 * @returns {string|null} Message template or null if not found
 */
function getEffectMessage(effectName, messageType, data = {}) {
  // Use local variables instead of referring to config
  const effects = { poison, protected, invisible, stunned };
  const template = effects[effectName]?.messages?.[messageType];

  if (!template) {
    // Fallback messages
    if (messageType === 'applied') {
      return `${data.playerName} is affected by ${effectName}.`;
    } else if (messageType === 'refreshed') {
      return `${data.playerName}'s ${effectName} effect is refreshed.`;
    } else if (messageType === 'expired') {
      return `The ${effectName} effect on ${data.playerName} has worn off.`;
    }
    return '';
  }

  return formatEffectMessage(template, data);
}

/**
 * Helper function to format effect message
 * @param {string} template - Message template with placeholders
 * @param {Object} data - Data to fill in placeholders
 * @returns {string} Formatted message
 */
function formatEffectMessage(template, data = {}) {
  if (!template) return '';

  return template.replace(/{(\w+)}/g, (match, key) => {
    return data[key] || match;
  });
}

module.exports = {
  poison,
  protected,
  invisible,
  stunned,
  processingOrder,
  global,

  // Helper functions
  getEffectDefaults,
  isEffectStackable,
  isEffectRefreshable,
  getEffectMessage,
  formatEffectMessage,
};
