/**
 * @fileoverview Updated game balance configuration with monster scaling fixes
 * Centralized balance settings for monster, player, and warlock mechanics
 */

/**
 * Monster scaling and behavior configuration
 */
const monster = {
  // Base stats for level 1 monster
  baseHp: 100,
  baseDamage: 10,
  baseAge: 0,

  // Enhanced scaling formulas
  hpPerLevel: 75, // Increased from 50
  useExponentialScaling: true, // New option for exponential scaling
  hpScalingMultiplier: 1.5, // 150% scaling rate vs players

  // Damage scaling with age
  damageScaling: {
    ageMultiplier: 1, // Damage = baseDamage * (age + ageMultiplier)
    maxAge: null, // null = no age limit
  },

  // Monster targeting preferences
  targeting: {
    preferLowestHp: true,
    canAttackInvisible: false,
    fallbackToHighestHp: true,
  },
};

/**
 * Player combat and progression configuration
 */
const player = {
  // Armor and damage reduction
  armor: {
    reductionRate: 0.1, // 10% reduction per armor point
    maxReduction: 0.9, // 90% max damage reduction
    minReduction: 0.0, // 0% min (for negative armor)
  },

  // Level up bonuses
  levelUp: {
    hpIncrease: 0.2, // 20% HP increase
    damageIncrease: 1.25, // 25% damage increase (multiply by 1.25)
    fullHealOnLevelUp: true,
  },

  // Healing mechanics
  healing: {
    modifierBase: 2.0, // healingMod = modifierBase - damageMod
    warlockSelfHealOnly: true,
    rejectWarlockHealing: true,
  },

  // Death and resurrection
  death: {
    pendingDeathSystem: true, // Use pending death vs instant death
    allowResurrection: true, // Enable racial resurrection abilities
  },
};

/**
 * Enhanced warlock conversion mechanics with corruption control
 */
const warlock = {
  // Conversion chance calculation
  conversion: {
    baseChance: 0.15, // Reduced from 0.2
    maxChance: 0.4, // Reduced from 0.5
    scalingFactor: 0.25, // Reduced from 0.3

    // New corruption control options
    preventLevelUpCorruption: false, // Option to disable corruption on level-ups
    maxCorruptionsPerRound: 2, // Maximum corruptions allowed per round
    maxCorruptionsPerPlayer: 1, // Maximum times a single player can corrupt others per round
    corruptionCooldown: 2, // Rounds before a player can corrupt again

    // Modifiers for different scenarios
    aoeModifier: 0.3, // Reduced from 0.5
    randomModifier: 0.3, // Reduced from 0.5
    untargetedModifier: 0.3, // Reduced from 0.5
  },

  // Win conditions
  winConditions: {
    allWarlocksGone: 'Good', // Good wins if no warlocks left
    allPlayersWarlocks: 'Evil', // Evil wins if only warlocks remain
    majorityThreshold: 0.5, // Warlocks are "winning" if > 50% of alive players
  },
};

/**
 * Stone Armor mechanics (Dwarf racial)
 */
const stoneArmor = {
  initialValue: 10, // Starting stone armor value
  degradationPerHit: 1, // Amount lost per hit taken
  minimumValue: -10, // Most negative armor allowed
  allowNegative: true, // Can go negative for vulnerability
};

/**
 * Combat order and timing
 */
const combat = {
  // Action order priorities (lower numbers go first)
  actionOrder: {
    ultraFast: { min: 1, max: 9 }, // Claw Swipe, etc.
    defensive: { min: 10, max: 99 }, // Shield abilities
    special: { min: 100, max: 999 }, // Traps, Death Mark
    attacks: { min: 1000, max: 9999 }, // Most attack abilities
    healing: { min: 10000, max: 99999 }, // Healing abilities
  },

  // Default orders for new abilities
  defaultOrders: {
    attack: 5000,
    defense: 50,
    heal: 50000,
    special: 500,
  },
};

/**
 * Game code generation
 */
const gameCode = {
  minValue: 1000,
  maxValue: 9999,
  length: 4,
};

/**
 * Rate limiting and security
 */
const rateLimiting = {
  // Default socket rate limiting
  defaultLimit: 5, // Actions per window
  defaultTimeWindow: 60000, // 60 seconds

  // Specific action limits (can override in environment configs)
  actionLimits: {
    createGame: { limit: 2, window: 60000 },
    joinGame: { limit: 5, window: 60000 },
    performAction: { limit: 10, window: 60000 },
  },
};

/**
 * Enhanced helper function to calculate monster HP for a given level
 * @param {number} level - Game level
 * @returns {number} Monster HP
 */
function calculateMonsterHp(level) {
  if (monster.useExponentialScaling) {
    // Exponential formula: baseHp * (level^1.3) + (level-1) * hpPerLevel
    return Math.floor(
      monster.baseHp * Math.pow(level, 1.3) + (level - 1) * monster.hpPerLevel
    );
  }
  // Fallback to linear scaling
  return monster.baseHp + (level - 1) * monster.hpPerLevel;
}

/**
 * Helper function to calculate monster damage based on age
 * @param {number} age - Monster age
 * @returns {number} Damage amount
 */
function calculateMonsterDamage(age) {
  return monster.baseDamage * (age + monster.damageScaling.ageMultiplier);
}

/**
 * Helper function to calculate warlock conversion chance with limits
 * @param {number} warlockCount - Number of warlocks
 * @param {number} totalPlayers - Total alive players
 * @param {number} modifier - Conversion modifier (default 1.0)
 * @param {Object} limitChecks - Object with corruption limit information
 * @returns {number} Conversion chance (0.0 to 1.0)
 */
function calculateConversionChance(
  warlockCount,
  totalPlayers,
  modifier = 1.0,
  limitChecks = {}
) {
  // Check corruption limits first
  if (
    limitChecks.roundLimitReached ||
    limitChecks.playerLimitReached ||
    limitChecks.playerOnCooldown
  ) {
    return 0.0; // No conversion possible
  }

  const baseChance = warlock.conversion.baseChance;
  const scalingFactor = warlock.conversion.scalingFactor;
  const maxChance = warlock.conversion.maxChance;

  const rawChance = Math.min(
    maxChance,
    baseChance + (warlockCount / totalPlayers) * scalingFactor
  );
  return rawChance * modifier;
}

/**
 * Helper function to calculate damage reduction from armor (FIXED)
 * @param {number} armor - Total armor value
 * @returns {number} Damage reduction percentage (0.0 to 1.0)
 */
function calculateDamageReduction(armor) {
  if (armor <= 0) {
    // Negative armor increases damage taken
    return Math.max(-2.0, armor * player.armor.reductionRate); // Cap at -200% (3x damage)
  }

  // Positive armor reduces damage
  return Math.min(
    player.armor.maxReduction,
    armor * player.armor.reductionRate
  );
}

/**
 * Calculate player stats based on race and class combination
 * @param {string} race - Player's race
 * @param {string} className - Player's class
 * @returns {Object|null} Calculated stats or null if invalid combination
 */
function calculateStats(race, className) {
  // Import the character config (you might need to adjust the path)
  const characterConfig = require('./character');

  // Check if the combination is valid
  if (!characterConfig.isValidCombination(race, className)) {
    return null;
  }

  // Get base stats from config
  const baseHp = characterConfig.player?.baseHp || 100;
  const baseArmor = characterConfig.player?.baseArmor || 0;
  const baseDamageMod = characterConfig.player?.baseDamageMod || 1.0;

  // Get race and class modifiers
  const raceAttributes = characterConfig.raceAttributes[race] || {};
  const classAttributes = characterConfig.classAttributes[className] || {};

  // Calculate final stats
  const hpModifier =
    (raceAttributes.hpModifier || 1.0) * (classAttributes.hpModifier || 1.0);
  const armorModifier =
    (raceAttributes.armorModifier || 0.0) +
    (classAttributes.armorModifier || 0.0);
  const damageModifier =
    (raceAttributes.damageModifier || 1.0) *
    (classAttributes.damageModifier || 1.0);

  return {
    maxHp: Math.floor(baseHp * hpModifier),
    armor: baseArmor + armorModifier,
    damageMod: damageModifier,
  };
}

module.exports = {
  monster,
  player,
  warlock,
  stoneArmor,
  combat,
  gameCode,
  rateLimiting,
  armor: player.armor,
  armorReduction: player.armor.reductionRate,
  maxArmorReduction: player.armor.maxReduction,
  minArmorReduction: player.armor.minReduction,

  // Helper functions
  calculateStats,
  calculateMonsterHp,
  calculateMonsterDamage,
  calculateConversionChance,
  calculateDamageReduction,
};
