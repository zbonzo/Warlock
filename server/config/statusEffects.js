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
  stackable: true, // Can multiple poisons stack?
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
const shielded = {
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
    applied: '{playerName} is shielded with {armor} armor for {turns} turn(s).',
    refreshed: "{playerName}'s protection is refreshed for {turns} turn(s).",
    expired: '{playerName} is no longer shielded.',
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
 * Vulnerability effect configuration
 */
const vulnerable = {
  // Default values
  default: {
    damageIncrease: 25, // Percentage to increase damage taken
    turns: 2, // Duration in turns
  },

  // Effect behavior
  stackable: false, // Multiple vulnerabilities don't stack
  refreshable: true, // Can be refreshed to extend duration

  // Mechanics
  affectsDamageCalculation: true, // Increases damage taken

  // Display settings
  messages: {
    applied:
      '{playerName} is vulnerable and will take {damageIncrease}% more damage for {turns} turn(s).',
    refreshed: "{playerName}'s vulnerability is refreshed for {turns} turn(s).",
    expired: '{playerName} is no longer vulnerable.',
  },
};

/**
 * Weakened effect configuration (new for Barbarian's Primal Roar)
 */
const weakened = {
  // Default values
  default: {
    damageReduction: 0.25, // Percentage to reduce damage dealt (25% = deals 75% damage)
    turns: 1, // Duration in turns
  },

  // Effect behavior
  stackable: false, // Multiple weakened effects don't stack
  refreshable: true, // Can be refreshed to extend duration

  // Mechanics
  affectsDamageCalculation: true, // Reduces damage dealt

  // Display settings
  messages: {
    applied:
      '{playerName} is weakened and will deal {damageReduction}% less damage for {turns} turn(s).',
    refreshed: "{playerName}'s weakness is renewed for {turns} turn(s).",
    expired: '{playerName} is no longer weakened.',
  },
};

/**
 * Enraged effect configuration (new for Barbarian's Unstoppable Rage)
 */
const enraged = {
  // Default values
  default: {
    damageBoost: 1.5, // Damage multiplier (1.5 = 150% damage)
    damageResistance: 0.3, // Damage reduction when taking damage (30% reduction)
    turns: 2, // Duration in turns
  },

  // Effect behavior
  stackable: false, // Multiple rage effects don't stack
  refreshable: false, // Cannot be refreshed (too powerful)

  // Mechanics
  affectsDamageCalculation: true, // Affects both damage dealt and taken
  preventsHealing: true, // Cannot be healed while enraged
  hasEndEffect: true, // Has negative effect when it expires

  // Display settings
  messages: {
    applied:
      '{playerName} enters an unstoppable rage! Damage increased by {damageBoost}% and damage resistance increased by {damageResistance}% for {turns} turn(s).',
    expired:
      "{playerName}'s rage subsides, leaving them exhausted and vulnerable.",
    cannotBeHealed: '{playerName} is too enraged to accept healing.',
  },
};

const healingOverTime = {
  // Default values
  default: {
    amount: 5, // Healing per turn
    turns: 3, // Duration in turns
  },

  // Effect behavior
  stackable: false, // Multiple healing effects don't stack
  refreshable: true, // Can be refreshed to extend duration

  // Mechanics
  healsPerTurn: true, // Applies healing each turn
  canOverheal: false, // Cannot heal above max HP

  // Display settings
  messages: {
    applied:
      '{playerName} is blessed with healing over time for {amount} HP per turn for {turns} turns.',
    refreshed: "{playerName}'s healing blessing is renewed for {turns} turns.",
    expired: 'The healing blessing on {playerName} has faded.',
    heal: '{playerName} regenerates {amount} health from their blessing.',
  },
};

/**
 * Effect processing order
 * Lower numbers are processed first each round
 */
const processingOrder = {
  poison: 1, // Process poison damage first
  shielded: 2, // Then update protection
  vulnerable: 3, // Handle vulnerability effects
  weakened: 4, // Handle weakened effects
  enraged: 5, // Handle enraged effects
  invisible: 6, // Then handle invisibility
  stunned: 7, // Finally process stun effects
  healingOverTime: 8, // Process healing effects last
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
  const effects = {
    poison,
    shielded,
    invisible,
    stunned,
    vulnerable,
    weakened,
    enraged,
    healingOverTime,
  };
  return effects[effectName]?.default || null;
}

/**
 * Helper function to check if effect is stackable
 * @param {string} effectName - Name of the effect
 * @returns {boolean} Whether the effect can stack
 */
function isEffectStackable(effectName) {
  const effects = {
    poison,
    shielded,
    invisible,
    stunned,
    vulnerable,
    weakened,
    enraged,
    healingOverTime,
  };
  return effects[effectName]?.stackable || false;
}

/**
 * Helper function to check if effect is refreshable
 * @param {string} effectName - Name of the effect
 * @returns {boolean} Whether the effect can be refreshed
 */
function isEffectRefreshable(effectName) {
  const effects = {
    poison,
    shielded,
    invisible,
    stunned,
    vulnerable,
    weakened,
    enraged,
    healingOverTime,
  };
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
  const effects = {
    poison,
    shielded,
    invisible,
    stunned,
    vulnerable,
    weakened,
    enraged,
    healingOverTime,
  };
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
  shielded,
  vulnerable,
  invisible,
  stunned,
  weakened,
  enraged,
  healingOverTime,
  processingOrder,
  global,

  // Helper functions
  getEffectDefaults,
  isEffectStackable,
  isEffectRefreshable,
  getEffectMessage,
  formatEffectMessage,
};
