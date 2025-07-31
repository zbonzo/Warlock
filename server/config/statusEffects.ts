/**
 * @fileoverview Status effects configuration
 * Defines default parameters and behavior for all status effects
 */

// Status effect interfaces
interface StatusEffectDefault {
  damage?: number;
  turns: number;
  armor?: number;
  amount?: number;
  damageIncrease?: number;
  damageReduction?: number;
  damageBoost?: number;
  damageResistance?: number;
  degradationPerHit?: number;
  resurrectedHp?: number;
  usesLeft?: number;
  healthThreshold?: number;
  healingPercent?: number;
}

interface StatusEffectMessages {
  applied?: string;
  refreshed?: string;
  expired?: string;
  damage?: string;
  stacked?: string;
  attackMissed?: string;
  cannotAct?: string;
  cannotBeHealed?: string;
  triggered?: string;
  heal?: string;
  degraded?: string;
}

interface StatusEffectConfig {
  default: StatusEffectDefault;
  stackable: boolean;
  refreshable: boolean;
  triggersStoneDegradation?: boolean;
  canCauseDeath?: boolean;
  damagePerTurn?: boolean;
  allowsActions?: boolean;
  processAtEndOfTurn?: boolean;
  armorStacks?: boolean;
  preventsTargeting?: boolean;
  allowsSelfTargeting?: boolean;
  breaksOnAction?: boolean;
  redirectsAttacks?: boolean;
  affectsMonster?: boolean;
  preventsActions?: boolean;
  preventsRacialAbilities?: boolean;
  allowsPassiveEffects?: boolean;
  affectsDamageCalculation?: boolean;
  preventsHealing?: boolean;
  hasEndEffect?: boolean;
  healsPerTurn?: boolean;
  canOverheal?: boolean;
  isPermanent?: boolean;
  isPassive?: boolean;
  degradesOnHit?: boolean;
  triggersOnDeath?: boolean;
  revealsCorruption?: boolean;
  healsEndOfRound?: boolean;
  providesDetection?: boolean;
  reducesDamageTaken?: boolean;
  messages: StatusEffectMessages;
}

/**
 * Poison effect configuration
 */
const poison: StatusEffectConfig = {
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
 * Bleed effect configuration - Similar to poison but distinct
 */
const bleed: StatusEffectConfig = {
  // Default values
  default: {
    damage: 5, // Damage per turn
    turns: 3, // Duration in turns
  },

  // Effect behavior
  stackable: true, // Multiple bleeds can stack
  refreshable: true, // Can extend duration

  // Mechanics
  damagePerTurn: true, // Deals damage at end of turn
  allowsActions: true, // Can still act normally
  processAtEndOfTurn: true, // Process during end-of-turn phase

  // Display settings
  messages: {
    applied: '{playerName} is bleeding for {damage} damage per turn for {turns} turn(s).',
    stacked: '{playerName} has multiple bleeding wounds for {damage} total damage per turn.',
    refreshed: '{playerName} continues bleeding for {turns} more turn(s).',
    damage: '{playerName} takes {damage} bleed damage.',
    expired: 'The bleeding affecting {playerName} has stopped.',
  },
};

/**
 * Protection effect configuration
 */
const shielded: StatusEffectConfig = {
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
const invisible: StatusEffectConfig = {
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
const stunned: StatusEffectConfig = {
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
const vulnerable: StatusEffectConfig = {
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
const weakened: StatusEffectConfig = {
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
const enraged: StatusEffectConfig = {
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

const healingOverTime: StatusEffectConfig = {
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
 * Stone Armor effect configuration (Rockhewn racial passive)
 */
const stoneArmor: StatusEffectConfig = {
  // Default values
  default: {
    armor: 6, // Initial armor value
    degradationPerHit: 1, // How much armor degrades per hit
    turns: -1, // Permanent (-1)
  },

  // Effect behavior
  stackable: false, // Multiple stone armor don't stack
  refreshable: false, // Cannot be refreshed (racial passive)

  // Mechanics
  isPermanent: true, // Lasts for entire game
  isPassive: true, // Racial passive ability
  degradesOnHit: true, // Armor value decreases when hit

  // Display settings
  messages: {
    applied: '{playerName} gains Stone Armor ({armor} armor that degrades by {degradationPerHit} per hit).',
    expired: "{playerName}'s Stone Armor has been completely worn away.",
    degraded: "{playerName}'s Stone Armor degrades (armor reduced).",
  },
};

/**
 * Undying effect configuration (Lich racial passive)
 */
const undying: StatusEffectConfig = {
  // Default values
  default: {
    resurrectedHp: 1, // HP to resurrect with
    usesLeft: 1, // Number of times can be used
    turns: -1, // Permanent (-1)
  },

  // Effect behavior
  stackable: false, // Multiple undying don't stack
  refreshable: false, // Cannot be refreshed (racial passive)

  // Mechanics
  isPermanent: true, // Lasts for entire game
  isPassive: true, // Racial passive ability
  triggersOnDeath: true, // Activates when player would die

  // Display settings
  messages: {
    applied: '{playerName} gains the Undying blessing (resurrect to {resurrectedHp} HP once).',
    triggered: '{playerName} dies but returns to life with {resurrectedHp} HP!',
    expired: "{playerName}'s Undying blessing has been used up.",
  },
};

/**
 * Moonbeam effect configuration (Crestfallen racial passive)
 */
const moonbeam: StatusEffectConfig = {
  // Default values
  default: {
    healthThreshold: 0.5, // Trigger when below 50% HP
    turns: -1, // Permanent (-1)
  },

  // Effect behavior
  stackable: false, // Multiple moonbeam don't stack
  refreshable: false, // Cannot be refreshed (racial passive)

  // Mechanics
  isPermanent: true, // Lasts for entire game
  isPassive: true, // Racial passive ability
  revealsCorruption: true, // Reveals if attacker is corrupted

  // Display settings
  messages: {
    applied: '{playerName} gains Moonbeam (reveals corruption when wounded below {healthThreshold}% HP).',
    triggered: 'The Moonbeam reveals that {attackerName} is corrupted!',
  },
};

/**
 * Life Bond effect configuration (Kinfolk racial passive)
 */
const lifeBond: StatusEffectConfig = {
  // Default values
  default: {
    healingPercent: 0.05, // 5% of monster's remaining HP
    turns: -1, // Permanent (-1)
  },

  // Effect behavior
  stackable: false, // Multiple life bond don't stack
  refreshable: false, // Cannot be refreshed (racial passive)

  // Mechanics
  isPermanent: true, // Lasts for entire game
  isPassive: true, // Racial passive ability
  healsEndOfRound: true, // Heals at end of each round

  // Display settings
  messages: {
    applied: '{playerName} gains Life Bond (heal for {healingPercent}% of monster HP each round).',
    heal: '{playerName} heals {amount} HP from Life Bond.',
  },
};

/**
 * Spirit Guard effect configuration (Oracle ability)
 */
const spiritGuard: StatusEffectConfig = {
  // Default values
  default: {
    armor: 3, // Armor bonus
    turns: 2, // Duration in turns
  },

  // Effect behavior
  stackable: false, // Multiple spirit guard don't stack
  refreshable: true, // Can be refreshed to extend duration

  // Mechanics
  armorStacks: true, // Adds to existing armor
  providesDetection: true, // May provide warlock detection

  // Display settings
  messages: {
    applied: '{playerName} is protected by Spirit Guard (+{armor} armor for {turns} turns).',
    refreshed: "{playerName}'s Spirit Guard protection is renewed for {turns} turns.",
    expired: 'The Spirit Guard protecting {playerName} fades away.',
  },
};

/**
 * Sanctuary effect configuration (Oracle ability)
 */
const sanctuary: StatusEffectConfig = {
  // Default values
  default: {
    damageReduction: 0.5, // 50% damage reduction
    turns: 1, // Duration in turns
  },

  // Effect behavior
  stackable: false, // Multiple sanctuary don't stack
  refreshable: true, // Can be refreshed to extend duration

  // Mechanics
  reducesDamageTaken: true, // Reduces incoming damage
  preventsTargeting: false, // Can still be targeted

  // Display settings
  messages: {
    applied: '{playerName} enters a Sanctuary ({damageReduction}% damage reduction for {turns} turns).',
    refreshed: "{playerName}'s Sanctuary protection is renewed for {turns} turns.",
    expired: '{playerName} leaves the Sanctuary.',
  },
};

/**
 * Effect processing order
 * Lower numbers are processed first each round
 */
const processingOrder = {
  poison: 1, // Process poison damage first
  bleed: 2, // Process bleed damage (similar to poison)
  stoneArmor: 3, // Process stone armor early (for degradation)
  shielded: 4, // Then update protection
  spiritGuard: 5, // Handle spirit guard protection
  sanctuary: 6, // Handle sanctuary protection
  vulnerable: 7, // Handle vulnerability effects
  weakened: 8, // Handle weakened effects
  enraged: 9, // Handle enraged effects
  invisible: 10, // Then handle invisibility
  stunned: 11, // Process stun effects
  healingOverTime: 12, // Process healing effects
  lifeBond: 13, // Process life bond healing last
  moonbeam: 13, // Process detection effects last
  undying: 14, // Process undying last (triggers on death)
} as const;

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
} as const;

/**
 * Helper function to get effect defaults by name
 */
function getEffectDefaults(effectName: string): StatusEffectDefault | null {
  const effects = {
    poison,
    bleed,
    shielded,
    invisible,
    stunned,
    vulnerable,
    weakened,
    enraged,
    healingOverTime,
    stoneArmor,
    undying,
    moonbeam,
    lifeBond,
    spiritGuard,
    sanctuary,
  };
  return (effects as any)[effectName]?.default || null;
}

/**
 * Helper function to check if effect is stackable
 */
function isEffectStackable(effectName: string): boolean {
  const effects = {
    poison,
    bleed,
    shielded,
    invisible,
    stunned,
    vulnerable,
    weakened,
    enraged,
    healingOverTime,
    stoneArmor,
    undying,
    moonbeam,
    lifeBond,
    spiritGuard,
    sanctuary,
  };
  return (effects as any)[effectName]?.stackable || false;
}

/**
 * Helper function to check if effect is refreshable
 */
function isEffectRefreshable(effectName: string): boolean {
  const effects = {
    poison,
    bleed,
    shielded,
    invisible,
    stunned,
    vulnerable,
    weakened,
    enraged,
    healingOverTime,
    stoneArmor,
    undying,
    moonbeam,
    lifeBond,
    spiritGuard,
    sanctuary,
  };
  return (effects as any)[effectName]?.refreshable || false;
}

/**
 * Helper function to get effect message template
 */
function getEffectMessage(effectName: string, messageType: string, data: Record<string, any> = {}): string {
  // Use local variables instead of referring to config
  const effects = {
    poison,
    bleed,
    shielded,
    invisible,
    stunned,
    vulnerable,
    weakened,
    enraged,
    healingOverTime,
    stoneArmor,
    undying,
    moonbeam,
    lifeBond,
    spiritGuard,
    sanctuary,
  };
  const template = (effects as any)[effectName]?.messages?.[messageType];

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
 */
function formatEffectMessage(template: string, data: Record<string, any> = {}): string {
  if (!template) return '';

  return template.replace(/{(\w+)}/g, (match, key) => {
    return data[key] || match;
  });
}

export default {
  poison,
  bleed,
  shielded,
  vulnerable,
  invisible,
  stunned,
  weakened,
  enraged,
  healingOverTime,
  stoneArmor,
  undying,
  moonbeam,
  lifeBond,
  spiritGuard,
  sanctuary,
  processingOrder,
  global,

  // Helper functions
  getEffectDefaults,
  isEffectStackable,
  isEffectRefreshable,
  getEffectMessage,
  formatEffectMessage,
};

export {
  poison,
  bleed,
  shielded,
  vulnerable,
  invisible,
  stunned,
  weakened,
  enraged,
  healingOverTime,
  stoneArmor,
  undying,
  moonbeam,
  lifeBond,
  spiritGuard,
  sanctuary,
  processingOrder,
  global,
  getEffectDefaults,
  isEffectStackable,
  isEffectRefreshable,
  getEffectMessage,
  formatEffectMessage,
};

export type { StatusEffectConfig, StatusEffectDefault, StatusEffectMessages };