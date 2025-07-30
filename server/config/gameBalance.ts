/**
 * @fileoverview Enhanced game balance configuration with new coordination and comeback mechanics
 * Centralized balance settings for monster, player, warlock mechanics, and new team balance features
 */

// Type definitions for game balance configuration
export interface MonsterConfig {
  baseHp: number;
  baseDamage: number;
  baseAge: number;
  hpPerLevel: number;
  useExponentialScaling: boolean;
  hpScalingMultiplier: number;
  damageScaling: {
    ageMultiplier: number;
    maxAge: number | null;
  };
  targeting: {
    preferLowestHp: boolean;
    useThreatSystem: boolean;
    canAttackInvisible: boolean;
    fallbackToHighestHp: boolean;
    canAttackWarlock: boolean;
  };
  threat: {
    enabled: boolean;
    armorMultiplier: number;
    damageMultiplier: number;
    healingMultiplier: number;
    decayRate: number;
    monsterDeathReduction: number;
    avoidLastTargetRounds: number;
    enableTiebreaker: boolean;
    fallbackToLowestHp: boolean;
    minimumThreatThreshold: number;
    logThreatChanges: boolean;
  };
}

export interface PlayerArmorConfig {
  reductionRate: number;
  maxReduction: number;
  minReduction: number;
}

export interface PlayerLevelUpConfig {
  hpIncrease: number;
  damageIncrease: number;
  fullHealOnLevelUp: boolean;
}

export interface PlayerHealingConfig {
  modifierBase: number;
  warlockSelfHealOnly: boolean;
  rejectWarlockHealing: boolean;
  antiDetection: {
    enabled: boolean;
    alwaysHealWarlocks: boolean;
    detectionChance: number;
    requireActualHealing: boolean;
    applyToHealingOverTime: boolean;
    logDetections: boolean;
  };
}

export interface PlayerDeathConfig {
  pendingDeathSystem: boolean;
  allowResurrection: boolean;
}

export interface PlayerConfig {
  armor: PlayerArmorConfig;
  levelUp: PlayerLevelUpConfig;
  healing: PlayerHealingConfig;
  death: PlayerDeathConfig;
}

export interface CoordinationBonusConfig {
  enabled: boolean;
  damageBonus: number;
  healingBonus: number;
  appliesToMonster: boolean;
  maxBonusTargets: number;
  announceCoordination: boolean;
}

export interface WarlockConversionConfig {
  baseChance: number;
  maxChance: number;
  scalingFactor: number;
  preventLevelUpCorruption: boolean;
  maxCorruptionsPerRound: number;
  maxCorruptionsPerPlayer: number;
  corruptionCooldown: number;
  aoeModifier: number;
  randomModifier: number;
  untargetedModifier: number;
}

export interface WarlockCorruptionConfig {
  canCorruptWhenDetected: boolean;
  detectionDamagePenalty: number;
  corruptionIsPublic: boolean;
  detectionPenaltyDuration: number;
}

export interface WarlockScalingConfig {
  enabled: boolean;
  playersPerWarlock: number;
  minimumWarlocks: number;
  maximumWarlocks: number;
  scalingMethod: 'linear' | 'exponential' | 'custom';
  customScaling: Record<number, number>;
}

export interface WarlockWinConditionsConfig {
  allWarlocksGone: 'Good' | 'Evil';
  allPlayersWarlocks: 'Good' | 'Evil';
  majorityThreshold: number;
}

export interface WarlockConfig {
  conversion: WarlockConversionConfig;
  corruption: WarlockCorruptionConfig;
  scaling: WarlockScalingConfig;
  winConditions: WarlockWinConditionsConfig;
}

export interface ComebackMechanicsConfig {
  enabled: boolean;
  threshold: number;
  damageIncrease: number;
  healingIncrease: number;
  armorIncrease: number;
  corruptionResistance: number;
  announceActivation: boolean;
}

export interface StoneArmorConfig {
  initialValue: number;
  degradationPerHit: number;
  minimumValue: number;
  allowNegative: boolean;
}

export interface ActionOrderRange {
  min: number;
  max: number;
}

export interface CombatConfig {
  actionOrder: {
    ultraFast: ActionOrderRange;
    defensive: ActionOrderRange;
    special: ActionOrderRange;
    attacks: ActionOrderRange;
    healing: ActionOrderRange;
  };
  defaultOrders: {
    attack: number;
    defense: number;
    heal: number;
    special: number;
  };
}

export interface AbilityVarianceConfig {
  critChance: number;
  failChance: number;
  ultraFailChance: number;
  critMultiplier: number;
}

export interface GameCodeConfig {
  minValue: number;
  maxValue: number;
  length: number;
}

export interface ActionLimitConfig {
  limit: number;
  window: number;
}

export interface RateLimitingConfig {
  defaultLimit: number;
  defaultTimeWindow: number;
  actionLimits: {
    createGame: ActionLimitConfig;
    joinGame: ActionLimitConfig;
    performAction: ActionLimitConfig;
  };
}

export interface PlayerStats {
  maxHp: number;
  armor: number;
  damageMod: number;
}

export interface CorruptionLimitChecks {
  roundLimitReached?: boolean;
  playerLimitReached?: boolean;
  playerOnCooldown?: boolean;
}

/**
 * Monster scaling and behavior configuration
 */
export const monster: MonsterConfig = {
  // Base stats for level 1 monster
  baseHp: 100,
  baseDamage: 25,
  baseAge: 0,

  // Enhanced scaling formulas
  hpPerLevel: 0, // Increased from 50
  useExponentialScaling: true, // New option for exponential scaling
  hpScalingMultiplier: 2.5, // 150% scaling rate vs players

  // Damage scaling with age
  damageScaling: {
    ageMultiplier: 1, // Damage = baseDamage * (age + ageMultiplier)
    maxAge: null, // null = no age limit
  },

  // Monster targeting preferences
  targeting: {
    preferLowestHp: false, // Disable to use threat system instead
    useThreatSystem: true, // Enable threat-based targeting
    canAttackInvisible: false, // Existing setting
    fallbackToHighestHp: true, // Existing setting
    canAttackWarlock: false, // Existing setting
  },
  threat: {
    // Core threat system toggle
    enabled: true,

    // Threat generation formula components
    // Formula: ((armor × damageToMonster) + totalDamage + healing) × decayRate
    armorMultiplier: 1.0, // How much armor amplifies threat from monster damage
    damageMultiplier: 1.0, // Base multiplier for all damage dealt
    healingMultiplier: 0.8, // How much healing generates threat (80% of damage value)

    // Threat management over time
    decayRate: 0.25, // 25% threat reduction each round (configurable)
    monsterDeathReduction: 0.5, // 50% threat reduction when monster dies/respawns

    // Targeting restrictions to prevent feedback loops
    avoidLastTargetRounds: 1, // Don't target same player for X rounds (configurable)

    // Tiebreaker and fallback behavior
    enableTiebreaker: true, // Use random selection when multiple players tied for highest threat
    fallbackToLowestHp: true, // Fall back to lowest HP targeting if no threat exists

    // Debug and tuning options
    minimumThreatThreshold: 0.1, // Remove threat values below this to keep table clean
    logThreatChanges: true, // Enable debug logging for threat calculations
  },
};

/**
 * Player combat and progression configuration
 */
export const player: PlayerConfig = {
  // Armor and damage reduction
  armor: {
    reductionRate: 0.1, // 10% reduction per armor point
    maxReduction: 0.75, // 90% max damage reduction
    minReduction: 0.0, // 0% min (for negative armor)
  },

  // Level up bonuses
  levelUp: {
    hpIncrease: 0.08, // 20% HP increase
    damageIncrease: 1.15, // 25% damage increase (multiply by 1.25)
    fullHealOnLevelUp: true,
  },

  healing: {
    modifierBase: 2.0, // healingMod = modifierBase - damageMod

    // OLD SYSTEM - DEPRECATED: These are now ignored to prevent warlock detection
    warlockSelfHealOnly: false, // DEPRECATED: Always heal warlocks now
    rejectWarlockHealing: false, // DEPRECATED: Always heal warlocks now

    // NEW: Anti-detection system
    antiDetection: {
      enabled: true, // Enable anti-detection healing system
      alwaysHealWarlocks: true, // Always heal warlocks (no rejection)
      detectionChance: 0.05, // 5% chance to detect warlock when they receive actual healing
      requireActualHealing: true, // Only detect if warlock actually received HP (not at full health)
      applyToHealingOverTime: true, // Apply detection chance to healing over time effects
      logDetections: true, // Log detection events
    },
  },

  // Death and resurrection
  death: {
    pendingDeathSystem: true, // Use pending death vs instant death
    allowResurrection: true, // Enable racial resurrection abilities
  },
};

/**
 * NEW: Coordination bonus system for team tactics
 */
export const coordinationBonus: CoordinationBonusConfig = {
  enabled: true, // Enable/disable coordination bonuses
  damageBonus: 10, // +10% damage per additional player targeting same enemy
  healingBonus: 15, // +10% healing per additional player healing same target
  appliesToMonster: true, // Whether bonuses work when attacking monster
  maxBonusTargets: 5, // Maximum number of coordinating players that provide bonus
  announceCoordination: false, // Whether to announce coordination in battle log
};

/**
 * Enhanced warlock conversion mechanics with corruption control and detection penalties
 */
export const warlock: WarlockConfig = {
  // Conversion chance calculation
  conversion: {
    baseChance: 0.45, // Base conversion chance
    maxChance: 0.65, // Maximum conversion chance
    scalingFactor: 0.4, // How much warlock count affects chance

    // New corruption control options
    preventLevelUpCorruption: false, // Option to disable corruption on level-ups
    maxCorruptionsPerRound: 1, // Maximum corruptions allowed per round
    maxCorruptionsPerPlayer: 1, // Maximum times a single player can corrupt others per round
    corruptionCooldown: 1, // Rounds before a player can corrupt again

    // Modifiers for different scenarios
    aoeModifier: 0.3, // Reduced from 0.5
    randomModifier: 0.3, // Reduced from 0.5
    untargetedModifier: 0.3, // Reduced from 0.5
  },

  // NEW: Warlock detection penalties
  corruption: {
    canCorruptWhenDetected: false, // Can't corrupt same turn as detected
    detectionDamagePenalty: 15, // +15% damage when detected this turn
    corruptionIsPublic: true, // Corruption messages are private by default
    detectionPenaltyDuration: 1, // How many turns the detection penalty lasts
  },

  scaling: {
    enabled: true, // Enable/disable warlock scaling
    playersPerWarlock: 4, // How many players per additional warlock (4 = every 4 players adds 1 warlock)
    minimumWarlocks: 1, // Minimum number of warlocks regardless of player count
    maximumWarlocks: 5, // Maximum number of warlocks regardless of player count

    scalingMethod: 'custom' as const, // 'linear', 'exponential', 'custom'

    customScaling: {
      1: 1, // 1-3 players = 1 warlock
      2: 1,
      3: 1,
      4: 1, // 4-7 players = 1 warlock
      5: 1,
      6: 1,
      7: 1,
      8: 2, // 8-11 players = 2 warlocks
      9: 2,
      10: 2,
      11: 3,
      12: 3, // 12-15 players = 3 warlocks
      13: 3,
      14: 3,
      15: 3,
      16: 3, // 16-19 players = 4 warlocks
      17: 4,
      18: 4,
      19: 4,
      20: 5, // 20+ players = 5 warlocks
    },
  },
  // Win conditions
  winConditions: {
    allWarlocksGone: 'Good' as const, // Good wins if no warlocks left
    allPlayersWarlocks: 'Evil' as const, // Evil wins if only warlocks remain
    majorityThreshold: 0.5, // Warlocks are "winning" if > 50% of alive players
  },
};

/**
 * NEW: Comeback mechanics for good team when losing
 */
export const comebackMechanics: ComebackMechanicsConfig = {
  enabled: true, // Enable/disable comeback mechanics
  threshold: 25, // Activates when ≤25% of good players remaining
  damageIncrease: 25, // +25% damage for remaining good players
  healingIncrease: 25, // +25% healing for remaining good players
  armorIncrease: 1.0, // +1 armor for remaining good players
  corruptionResistance: 15, // 15% resistance to corruption attempts
  announceActivation: true, // Whether to announce when comeback mechanics activate
};

/**
 * Stone Armor mechanics (Rockhewn racial)
 */
export const stoneArmor: StoneArmorConfig = {
  initialValue: 5, // Starting stone armor value
  degradationPerHit: 1, // Amount lost per hit taken
  minimumValue: -1, // Most negative armor allowed
  allowNegative: true, // Can go negative for vulnerability
};

/**
 * Combat order and timing
 */
export const combat: CombatConfig = {
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
 * Critical/failure chance configuration
 */
export const abilityVariance: AbilityVarianceConfig = {
  critChance: 0.05, // 5% chance to critically succeed
  failChance: 0.05, // 5% chance to completely fail
  ultraFailChance: 0.05, // 1% chance to target a random entity instead
  critMultiplier: 1.5, // 150% effect multiplier on crit/ultra fail
};

/**
 * Game code generation
 */
export const gameCode: GameCodeConfig = {
  minValue: 1000,
  maxValue: 9999,
  length: 4,
};

/**
 * Rate limiting and security
 */
export const rateLimiting: RateLimitingConfig = {
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
 * @param level - Game level
 * @returns Monster HP
 */
export function calculateMonsterHp(level: number): number {
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
 * @param age - Monster age
 * @returns Damage amount
 */
export function calculateMonsterDamage(age: number): number {
  return monster.baseDamage * (age + monster.damageScaling.ageMultiplier);
}

/**
 * Helper function to calculate warlock conversion chance with limits and detection penalties
 * @param warlockCount - Number of warlocks
 * @param totalPlayers - Total alive players
 * @param modifier - Conversion modifier (default 1.0)
 * @param limitChecks - Object with corruption limit information
 * @param recentlyDetected - Whether the warlock was recently detected
 * @returns Conversion chance (0.0 to 1.0)
 */
export function calculateConversionChance(
  warlockCount: number,
  totalPlayers: number,
  modifier: number = 1.0,
  limitChecks: CorruptionLimitChecks = {},
  recentlyDetected: boolean = false
): number {
  // Check corruption limits first
  if (
    limitChecks.roundLimitReached ||
    limitChecks.playerLimitReached ||
    limitChecks.playerOnCooldown
  ) {
    return 0.0; // No conversion possible
  }

  // Check if corruption is blocked by recent detection
  if (recentlyDetected && !warlock.corruption.canCorruptWhenDetected) {
    return 0.0; // Cannot corrupt when recently detected
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
 * @param armor - Total armor value
 * @returns Damage reduction percentage (0.0 to 1.0)
 */
export function calculateDamageReduction(armor: number): number {
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
 * NEW: Calculate coordination bonus for damage/healing
 * @param baseAmount - Base damage or healing amount
 * @param coordinatingPlayers - Number of other players targeting same target
 * @param type - 'damage' or 'healing'
 * @returns Modified amount with coordination bonus
 */
export function calculateCoordinationBonus(
  baseAmount: number,
  coordinatingPlayers: number,
  type: 'damage' | 'healing' = 'damage'
): number {
  if (!coordinationBonus.enabled || coordinatingPlayers <= 0) {
    return baseAmount;
  }

  const maxCoordinators = Math.min(
    coordinatingPlayers,
    coordinationBonus.maxBonusTargets - 1
  );
  let bonusPercent = 0;

  if (type === 'healing') {
    bonusPercent = coordinationBonus.healingBonus;
  } else {
    bonusPercent = coordinationBonus.damageBonus;
  }

  const totalBonus = maxCoordinators * bonusPercent;
  return Math.floor(baseAmount * (1 + totalBonus / 100));
}

/**
 * NEW: Check if comeback mechanics should be active
 * @param goodPlayersRemaining - Number of good players still alive
 * @param totalPlayersRemaining - Total players still alive
 * @returns Whether comeback mechanics are active
 */
export function shouldActiveComebackMechanics(
  goodPlayersRemaining: number,
  totalPlayersRemaining: number
): boolean {
  if (!comebackMechanics.enabled || totalPlayersRemaining === 0) {
    return false;
  }

  const goodPlayerPercent =
    (goodPlayersRemaining / totalPlayersRemaining) * 100;
  return goodPlayerPercent <= comebackMechanics.threshold;
}

/**
 * NEW: Apply comeback bonuses to damage/healing/armor
 * @param baseAmount - Base amount
 * @param type - 'damage', 'healing', or 'armor'
 * @param isGoodPlayer - Whether the player is good (not warlock)
 * @param comebackActive - Whether comeback mechanics are active
 * @returns Modified amount with comeback bonus
 */
export function applyComebackBonus(
  baseAmount: number,
  type: 'damage' | 'healing' | 'armor',
  isGoodPlayer: boolean,
  comebackActive: boolean
): number {
  if (!comebackActive || !isGoodPlayer) {
    return baseAmount;
  }

  switch (type) {
    case 'damage':
      return Math.floor(
        baseAmount * (1 + comebackMechanics.damageIncrease / 100)
      );
    case 'healing':
      return Math.floor(
        baseAmount * (1 + comebackMechanics.healingIncrease / 100)
      );
    case 'armor':
      return baseAmount + comebackMechanics.armorIncrease;
    default:
      return baseAmount;
  }
}

/**
 * Calculate player stats based on race and class combination
 * @param race - Player's race
 * @param className - Player's class
 * @returns Calculated stats or null if invalid combination
 */
export function calculateStats(race: string, className: string): PlayerStats | null {
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
    ((raceAttributes.hpModifier || 1.0) + (classAttributes.hpModifier || 1.0)) /
    2;
  const armorModifier =
    ((raceAttributes.armorModifier || 0.0) +
      (classAttributes.armorModifier || 0.0)) /
    2;
  const damageModifier =
    ((raceAttributes.damageModifier || 1.0) +
      (classAttributes.damageModifier || 1.0)) /
    2;

  return {
    maxHp: Math.floor(baseHp * hpModifier),
    armor: baseArmor + armorModifier,
    damageMod: damageModifier,
  };
}

/**
 * Calculate the number of warlocks needed based on player count
 * @param playerCount - Total number of players in the game
 * @returns Number of warlocks that should be active
 */
export function calculateWarlockCount(playerCount: number): number {
  const scalingConfig = warlock.scaling;

  if (!scalingConfig.enabled) {
    return scalingConfig.minimumWarlocks;
  }

  let warlockCount: number;

  switch (scalingConfig.scalingMethod) {
    case 'linear':
      // Linear scaling: every X players adds 1 warlock
      warlockCount =
        Math.floor((playerCount - 1) / scalingConfig.playersPerWarlock) + 1;
      break;

    case 'exponential':
      // Exponential scaling (for future use)
      warlockCount = Math.floor(Math.sqrt(playerCount)) + 1;
      break;

    case 'custom':
      // Custom scaling table
      warlockCount = scalingConfig.minimumWarlocks;
      for (const [threshold, count] of Object.entries(
        scalingConfig.customScaling
      )) {
        if (playerCount >= parseInt(threshold)) {
          warlockCount = count;
        }
      }
      break;

    default:
      warlockCount = scalingConfig.minimumWarlocks;
  }

  // Apply min/max constraints
  warlockCount = Math.max(scalingConfig.minimumWarlocks, warlockCount);
  warlockCount = Math.min(scalingConfig.maximumWarlocks, warlockCount);

  return warlockCount;
}

export function calculateThreatGeneration(
  damageToMonster: number = 0,
  totalDamageDealt: number = 0,
  healingDone: number = 0,
  playerArmor: number = 0
): number {
  const threatConfig = monster.threat;

  if (!threatConfig.enabled) return 0;

  const armorThreat =
    playerArmor * damageToMonster * threatConfig.armorMultiplier;
  const damageThreat = totalDamageDealt * threatConfig.damageMultiplier;
  const healThreat = healingDone * threatConfig.healingMultiplier;

  return armorThreat + damageThreat + healThreat;
}

// Legacy exports for backward compatibility
export const armor = player.armor;
export const armorReduction = player.armor.reductionRate;
export const maxArmorReduction = player.armor.maxReduction;
export const minArmorReduction = player.armor.minReduction;

// Default export for CommonJS compatibility
export default {
  monster,
  player,
  warlock,
  coordinationBonus,
  comebackMechanics,
  stoneArmor,
  combat,
  abilityVariance,
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
  calculateWarlockCount,
  calculateThreatGeneration,
  calculateCoordinationBonus,
  shouldActiveComebackMechanics,
  applyComebackBonus,
};