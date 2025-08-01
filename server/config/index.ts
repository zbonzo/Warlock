/**
 * @fileoverview Centralized configuration loader (TypeScript)
 * Exports all game configuration with type safety and validation
 */
import path from 'path';
import fs from 'fs';

// Import all the new loaders
import { abilityLoader } from './loaders/AbilityLoader';
import { classLoader } from './loaders/ClassLoader';
import { raceLoader } from './loaders/RaceLoader';
import { gameBalanceLoader } from './loaders/GameBalanceLoader';
import type { CorruptionLimitChecks } from './gameBalance';
import { statusEffectsLoader } from './loaders/StatusEffectsLoader';
import { messagesLoader } from './loaders/MessagesLoader';

// Import remaining JavaScript configs (legacy)
const characterConfig = require('./character'); // Contains consolidated exports

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
  MONSTER_ID: '__monster__',

  // Security settings
  actionCooldowns: {
    createGame: 2000, // 2 seconds
    joinGame: 1000, // 1 second
    playerReady: 500, // 0.5 seconds
  },

  // Environment
  env: process.env['NODE_ENV'] || 'development',

  // CORS settings
  corsOrigins: '*',

  // Logging
  logLevel: 'info',
} as const;

/**
 * Load environment-specific configuration
 */
const loadEnvConfig = (): Record<string, any> => {
  const env = process.env['NODE_ENV'] || 'development';
  const configPath = path.join(__dirname, 'environments', `${env}.js`);

  try {
    if (fs.existsSync(configPath)) {
      const envConfig = require(configPath);
      return envConfig;
    }
  } catch (err: any) {
    console.warn(
      `Failed to load environment configuration for ${env}:`,
      err.message
    );
  }

  return {};
};

/**
 * Apply environment variables to configuration
 */
const loadEnvVariables = (config: typeof defaultConfig): typeof defaultConfig => {
  const envConfig = { ...config };

  // Port can be set via environment variable
  if (process.env['PORT']) {
    (envConfig as any).port = parseInt(process.env['PORT'], 10);
  }

  // Log level can be set via environment variable
  if (process.env['LOG_LEVEL']) {
    (envConfig as any).logLevel = process.env['LOG_LEVEL'];
  }

  // Game timeout can be set via environment variable (in minutes)
  if (process.env['GAME_TIMEOUT_MINUTES']) {
    (envConfig as any).gameTimeout =
      parseInt(process.env['GAME_TIMEOUT_MINUTES'], 10) * 60 * 1000;
  }

  return envConfig;
};

// Generate base server configuration
const baseServerConfig = loadEnvVariables({
  ...defaultConfig,
  ...loadEnvConfig(),
});

/**
 * Enhanced configuration functions using the new loaders
 * These maintain backwards compatibility with existing code
 */

// Ability functions
const abilityFunctions = {
  // Backwards compatibility functions that delegate to the loader
  getAbility: (abilityId: string) => abilityLoader.getAbility(abilityId),
  getAbilities: (abilityIds: string[]) => abilityLoader.getAbilities(abilityIds),
  getAbilitiesByTag: (tag: string) => abilityLoader.getAbilitiesByTag(tag),
  getAbilitiesByCategory: (category: 'Attack' | 'Defense' | 'Heal' | 'Special') => 
    abilityLoader.getAbilitiesByCategory(category),
  getAllAbilityIds: () => abilityLoader.getAllAbilityIds(),
  getAbilityButtonText: (abilityId: string) => abilityLoader.getAbilityButtonText(abilityId),
  
  // Enhanced functions with business logic
  isAbilityAvailable: (abilityId: string, context: any = {}) => 
    abilityLoader.isAbilityAvailable(abilityId, context),
  calculateAbilityDamage: (abilityId: string, context: any = {}) => {
    const ability = abilityLoader.getAbility(abilityId);
    return ability ? abilityLoader.calculateDamage(ability, context) : 0;
  },
  getAbilityCooldown: (abilityId: string) => abilityLoader.getCooldownInfo(abilityId),
  getAbilityEffect: (abilityId: string) => abilityLoader.getEffectInfo(abilityId),
  
  // Access to the raw abilities object for backwards compatibility
  get abilities() {
    return abilityLoader.getAllAbilities();
  },
  
  // Hot reload function
  reloadAbilities: () => abilityLoader.reloadIfChanged(),
  
  // Statistics and debugging
  getAbilityStats: () => abilityLoader.getAbilityStats(),
};

// Class functions
const classFunctions = {
  getAvailableClasses: () => classLoader.getAvailableClasses(),
  getClassCategories: () => classLoader.getClassCategories(),
  getClassesByCategory: (category: any) => classLoader.getClassesByCategory(category),
  getClassAttributes: (className: string) => classLoader.getClassAttributes(className),
  getClassAbilities: (className: string, maxLevel?: number) => classLoader.getClassAbilities(className, maxLevel),
  getAllClassAbilities: (className: string) => classLoader.getAllClassAbilities(className),
  getClassAbilityForLevel: (className: string, level: number) => classLoader.getClassAbilityForLevel(className, level),
  getClassInfo: (className: string) => classLoader.getClassInfo(className),
  calculateClassStats: (className: string, context?: any) => classLoader.calculateClassStats(className, context),
  validateClassAbilities: () => classLoader.validateClassAbilities(),
  isValidClass: (className: string) => classLoader.isValidClass(className),
  
  // Legacy compatibility
  get availableClasses() {
    return classLoader.getAvailableClasses();
  },
  get classCategories() {
    return classLoader.getClassCategories();
  },
  get classAttributes() {
    return classLoader.getAllClassData().classAttributes;
  },
  get classAbilityProgression() {
    return classLoader.getAllClassData().classAbilityProgression;
  },
};

// Race functions
const raceFunctions = {
  getAvailableRaces: () => raceLoader.getAvailableRaces(),
  getRaceAttributes: (raceName: string) => raceLoader.getRaceAttributes(raceName),
  getRacialAbility: (raceName: string) => raceLoader.getRacialAbility(raceName),
  getCompatibleClasses: (raceName: string) => raceLoader.getCompatibleClasses(raceName),
  getCompatibleRaces: (className: string) => raceLoader.getCompatibleRaces(className),
  isValidCombination: (raceName: string, className: string) => raceLoader.isValidCombination(raceName, className),
  calculateRaceStats: (raceName: string, context?: any) => raceLoader.calculateRaceStats(raceName, context),
  isValidRace: (raceName: string) => raceLoader.isValidRace(raceName),
  
  // Legacy compatibility
  get availableRaces() {
    return raceLoader.getAvailableRaces();
  },
  get raceAttributes() {
    return raceLoader.getAllRaceData().raceAttributes;
  },
  get racialAbilities() {
    return raceLoader.getAllRaceData().racialAbilities;
  },
  get classRaceCompatibility() {
    return raceLoader.getClassRaceCompatibility();
  },
};

// Enhanced message functions
const messageFunctions = {
  getMessage: (category: string, key: string) => messagesLoader.getMessage(category, key),
  getAbilityMessage: (category: string, key: string) => messagesLoader.getAbilityMessage(category, key),
  getError: (key: string, data?: any) => messagesLoader.getError(key, data),
  getSuccess: (key: string, data?: any) => messagesLoader.getSuccess(key, data),
  getEvent: (key: string, data?: any) => messagesLoader.getEvent(key, data),
  formatMessage: (template: string, data?: any) => messagesLoader.formatMessage(template, data),
  
  // Enhanced message functions
  getPrivateMessage: (key: string, context?: any) => messagesLoader.getPrivateMessage(key, context),
  getWinCondition: (key: string, context?: any) => messagesLoader.getWinCondition(key, context),
  getCombatMessage: (key: string, context?: any) => messagesLoader.getCombatMessage(key, context),
  getWarlockMessage: (key: string, context?: any) => messagesLoader.getWarlockMessage(key, context),
  getMonsterMessage: (key: string, context?: any) => messagesLoader.getMonsterMessage(key, context),
  getPlayerMessage: (key: string, context?: any) => messagesLoader.getPlayerMessage(key, context),
  getUIMessage: (key: string, context?: any) => messagesLoader.getUIMessage(key, context),
  getServerLogMessage: (level: any, key: string, context?: any) => messagesLoader.getServerLogMessage(level, key, context),
  
  // Legacy compatibility
  get messages() {
    return messagesLoader.getLegacyMessages().messages;
  },
  get events() {
    return messagesLoader.getAllMessagesData().events;
  },
  get errors() {
    return messagesLoader.getAllMessagesData().errors;
  },
  get success() {
    return messagesLoader.getAllMessagesData().success;
  },
  get privateMessages() {
    return messagesLoader.getAllMessagesData().privateMessages;
  },
  get abilities() {
    return messagesLoader.getAllMessagesData().abilities;
  },
  get combat() {
    return messagesLoader.getAllMessagesData().combat;
  },
  get statusEffects() {
    return messagesLoader.getAllMessagesData().statusEffects;
  },
  get warlock() {
    return messagesLoader.getAllMessagesData().warlock;
  },
  get monster() {
    return messagesLoader.getAllMessagesData().monster;
  },
  get player() {
    return messagesLoader.getAllMessagesData().player;
  },
  get ui() {
    return messagesLoader.getAllMessagesData().ui;
  },
  get serverLogMessages() {
    return messagesLoader.getAllMessagesData().serverLogMessages;
  },
  get winConditions() {
    return messagesLoader.getAllMessagesData().winConditions;
  },
};

/**
 * Complete configuration object
 * Combines server config with all game-specific configs
 */
const config = {
  // Server configuration (from environment)
  ...baseServerConfig,

  // Character configuration (existing)
  ...characterConfig,

  // Enhanced systems
  ...abilityFunctions,
  ...classFunctions,
  ...raceFunctions,
  ...messageFunctions,

  // Enhanced game balance functions
  calculateMonsterHp: (level: number) => gameBalanceLoader.calculateMonsterHp(level),
  calculateMonsterDamage: (age: number) => gameBalanceLoader.calculateMonsterDamage(age),
  calculateDamageReduction: (armor: number) => gameBalanceLoader.calculateDamageReduction(armor),
  calculateConversionChance: (
    warlockCount: number,
    totalPlayers: number,
    modifier?: number,
    limitChecks?: CorruptionLimitChecks,
    recentlyDetected?: boolean
  ) => gameBalanceLoader.calculateConversionChance(warlockCount, totalPlayers, modifier, limitChecks, recentlyDetected),
  calculateWarlockCount: (playerCount: number) => gameBalanceLoader.calculateWarlockCount(playerCount),
  calculateThreatGeneration: (
    damageToMonster?: number,
    totalDamageDealt?: number,
    healingDone?: number,
    playerArmor?: number
  ) => gameBalanceLoader.calculateThreatGeneration(damageToMonster, totalDamageDealt, healingDone, playerArmor),
  calculateCoordinationBonus: (
    baseAmount: number,
    coordinatingPlayers: number,
    type?: 'damage' | 'healing'
  ) => gameBalanceLoader.calculateCoordinationBonus(baseAmount, coordinatingPlayers, type),
  shouldActiveComebackMechanics: (
    goodPlayersRemaining: number,
    totalPlayersRemaining: number
  ) => gameBalanceLoader.shouldActiveComebackMechanics(goodPlayersRemaining, totalPlayersRemaining),
  applyComebackBonus: (
    baseAmount: number,
    type: 'damage' | 'healing' | 'armor',
    isGoodPlayer: boolean,
    comebackActive: boolean
  ) => gameBalanceLoader.applyComebackBonus(baseAmount, type, isGoodPlayer, comebackActive),
  
  // Enhanced status effects functions
  getEffectDefaults: (effectName: string) => statusEffectsLoader.getEffectDefaults(effectName),
  isEffectStackable: (effectName: string) => statusEffectsLoader.isEffectStackable(effectName),
  isEffectRefreshable: (effectName: string) => statusEffectsLoader.isEffectRefreshable(effectName),
  getEffectMessage: (effectName: string, messageType: string, context?: any) => 
    statusEffectsLoader.getEffectMessage(effectName, messageType, context),
  formatEffectMessage: (template: string, context?: any) => 
    statusEffectsLoader.formatEffectMessage(template, context),
  
  // Legacy compatibility properties
  get gameBalance() {
    return gameBalanceLoader.getAllBalanceData();
  },
  get statusEffects() {
    return statusEffectsLoader.getAllStatusEffectsData();
  },

  // Calculated values
  get maxGameCode(): number {
    return this.gameBalance?.gameCode?.maxValue || 9999;
  },
  get minGameCode(): number {
    return this.gameBalance?.gameCode?.minValue || 1000;
  },

  // Enhanced methods with type safety
  validateAbilityAction: (abilityId: string, params: Record<string, any>): boolean => {
    return abilityLoader.validateAbilityParams(abilityId, params);
  },

  // Development helpers
  get isDevelopment(): boolean {
    return this.env === 'development';
  },
  
  get isProduction(): boolean {
    return this.env === 'production';
  },

  // Enhanced config health check
  validateConfiguration: (): { valid: boolean; errors: string[]; warnings: string[] } => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    try {
      // Validate abilities
      const abilityStats = abilityLoader.getAbilityStats();
      if (abilityStats.total === 0) {
        errors.push('No abilities loaded');
      }
      
      // Validate classes
      const classValidation = classLoader.validateClassAbilities();
      if (!classValidation.isValid) {
        errors.push(...classValidation.missing);
        warnings.push(...classValidation.warnings);
      }
      
      // Validate races
      const raceValidation = raceLoader.validateCompatibility();
      if (!raceValidation.isValid) {
        errors.push(...raceValidation.orphanedClasses.map(c => `Class '${c}' has no compatible races`));
        errors.push(...raceValidation.orphanedRaces.map(r => `Race '${r}' has no compatible classes`));
        warnings.push(...raceValidation.warnings);
      }
      
      // Validate balance
      const balanceValidation = gameBalanceLoader.validateBalanceCoherence();
      if (!balanceValidation.isValid) {
        errors.push(...balanceValidation.errors);
        warnings.push(...balanceValidation.warnings);
      }
      
      // Validate status effects
      const statusValidation = statusEffectsLoader.validateEffectIntegrity();
      if (!statusValidation.isValid) {
        errors.push(...statusValidation.errors);
        warnings.push(...statusValidation.warnings);
      }
      
      // Validate messages
      const messageValidation = messagesLoader.validateMessagePlaceholders();
      if (!messageValidation.isValid) {
        warnings.push(...messageValidation.warnings);
      }
      
    } catch (error: any) {
      errors.push(`Configuration validation failed: ${error.message}`);
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  },
  
  // Hot reload all configurations
  reloadConfiguration: (): boolean => {
    let reloaded = false;
    reloaded = abilityLoader.reloadIfChanged() || reloaded;
    reloaded = classLoader.reloadIfChanged() || reloaded;
    reloaded = raceLoader.reloadIfChanged() || reloaded;
    reloaded = gameBalanceLoader.reloadIfChanged() || reloaded;
    reloaded = statusEffectsLoader.reloadIfChanged() || reloaded;
    reloaded = messagesLoader.reloadIfChanged() || reloaded;
    return reloaded;
  },
  
  // Get comprehensive configuration statistics
  getConfigurationStats: () => {
    return {
      abilities: abilityLoader.getAbilityStats(),
      classes: classLoader.getClassBalanceStats(),
      races: raceLoader.getRaceBalanceStats(),
      balance: gameBalanceLoader.getBalanceStats(),
      statusEffects: statusEffectsLoader.getEffectStats(),
      messages: messagesLoader.getMessageStats(),
    };
  },
};

// Type exports for external use
export type ConfigType = typeof config;
export type AbilityCategory = 'Attack' | 'Defense' | 'Heal' | 'Special';
export type AbilityTarget = 'Single' | 'Self' | 'Multi';
export type ClassCategory = 'Melee' | 'Caster' | 'Ranged';
export type UsageLimit = 'passive' | 'perGame' | 'perRound' | 'perTurn';

// Default export for backwards compatibility
export default config;