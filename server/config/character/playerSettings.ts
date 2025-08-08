/**
 * @fileoverview Player configuration settings
 * Defines player-related settings and defaults with strict TypeScript typing
 */

/**
 * Interface for player configuration settings
 */
export interface PlayerSettingsConfig {
  /** Default player name when none is provided */
  defaultPlayerName: string;
  /** Base hit points for all players */
  baseHp: number;
  /** Base armor value for all players */
  baseArmor: number;
  /** Base damage modifier for all players */
  baseDamageMod: number;
  /** Reconnection window in milliseconds */
  reconnectionWindow: number;
  /** Maximum number of reconnection attempts allowed */
  maxReconnectionAttempts: number;
  /** HP increase percentage per level (as decimal) */
  hpIncreasePerLevel: number;
  /** Damage increase percentage per level (as decimal) */
  damageIncreasePerLevel: number;
  /** Whether to use pending death system instead of immediate death */
  pendingDeathEnabled: boolean;
  /** Delay in milliseconds before processing death after showing death message */
  deathMessageDelay: number;
}

/**
 * Player configuration with strict typing
 */
export const playerSettings: PlayerSettingsConfig = {
  // Default player settings
  defaultPlayerName: 'The Unknown Hero',
  baseHp: 250,
  baseArmor: 2.0,
  baseDamageMod: 1.0,

  // Reconnection settings
  reconnectionWindow: 60 * 1000, // 60 seconds in milliseconds
  maxReconnectionAttempts: 3,

  // Leveling settings
  hpIncreasePerLevel: 0.1, // 10% HP increase per level
  damageIncreasePerLevel: 0.25, // 25% damage/healing increase per level

  // Death and resurrection
  pendingDeathEnabled: true, // Use pending death instead of immediate death
  deathMessageDelay: 1500, // Show death message for 1.5 seconds before processing
};

/**
 * Type guard to check if an object conforms to PlayerSettingsConfig
 * @param obj - Object to check
 * @returns Whether the object is a valid PlayerSettingsConfig
 */
export function isValidPlayerSettings(obj: any): obj is PlayerSettingsConfig {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.defaultPlayerName === 'string' &&
    typeof obj.baseHp === 'number' &&
    typeof obj.baseArmor === 'number' &&
    typeof obj.baseDamageMod === 'number' &&
    typeof obj.reconnectionWindow === 'number' &&
    typeof obj.maxReconnectionAttempts === 'number' &&
    typeof obj.hpIncreasePerLevel === 'number' &&
    typeof obj.damageIncreasePerLevel === 'number' &&
    typeof obj.pendingDeathEnabled === 'boolean' &&
    typeof obj.deathMessageDelay === 'number' &&
    // Validate numeric constraints
    obj.baseHp > 0 &&
    obj.baseArmor >= 0 &&
    obj.baseDamageMod > 0 &&
    obj.reconnectionWindow > 0 &&
    obj.maxReconnectionAttempts > 0 &&
    obj.hpIncreasePerLevel >= 0 &&
    obj.damageIncreasePerLevel >= 0 &&
    obj.deathMessageDelay >= 0
  );
}

/**
 * Helper function to calculate player HP at a given level
 * @param level - Player level (1-based)
 * @returns Calculated HP for the level
 */
export function calculatePlayerHpAtLevel(level: number): number {
  if (level < 1) {
    throw new Error('Player level must be 1 or greater');
  }

  const baseHp = playerSettings.baseHp;
  const hpIncrease = playerSettings.hpIncreasePerLevel;

  // HP = baseHp * (1 + hpIncrease)^(level-1)
  return Math.floor(baseHp * Math.pow(1 + hpIncrease, level - 1));
}

/**
 * Helper function to calculate damage modifier at a given level
 * @param level - Player level (1-based)
 * @returns Calculated damage modifier for the level
 */
export function calculateDamageModifierAtLevel(level: number): number {
  if (level < 1) {
    throw new Error('Player level must be 1 or greater');
  }

  const baseDamageMod = playerSettings.baseDamageMod;
  const damageIncrease = playerSettings.damageIncreasePerLevel;

  // DamageMod = baseDamageMod * (1 + damageIncrease)^(level-1)
  return baseDamageMod * Math.pow(1 + damageIncrease, level - 1);
}

/**
 * Helper function to check if reconnection is allowed
 * @param attemptCount - Number of reconnection attempts made
 * @param timeSinceDisconnect - Time since last disconnect in milliseconds
 * @returns Whether reconnection should be allowed
 */
export function isReconnectionAllowed(
  attemptCount: number,
  timeSinceDisconnect: number
): boolean {
  return (
    attemptCount < playerSettings.maxReconnectionAttempts &&
    timeSinceDisconnect <= playerSettings.reconnectionWindow
  );
}

// Default export for ES modules
export default playerSettings;
