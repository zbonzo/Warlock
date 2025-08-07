/**
 * @fileoverview Utility functions for ability registration
 * Provides helper methods for dynamic ability registration
 * Migrated to TypeScript for Phase 6
 */

import type { Player, Monster, Ability } from '../../../types/generated.js';
import type { GameSystems } from '../SystemsFactory.js';
import config from '../../../config/index.js';

/**
 * Coordination information for ability execution
 */
export interface CoordinationInfo {
  coordinatedDamage?: boolean;
  damageBonus?: number;
  coordinatedHealing?: boolean;
  healingBonus?: number;
  coordinatedDefense?: boolean;
  defenseBonus?: number;
  coordinatedUtility?: boolean;
  utilityBonus?: number;
  isActive?: boolean;
  bonusMultiplier?: number;
  participantCount?: number;
  participantNames?: string[];
}

/**
 * Event log entry interface
 */
export interface LogEntry {
  id?: string;
  type: 'status' | 'damage' | 'heal' | 'system' | 'phase' | 'action' | 'level_up' | 'ability_unlock' | 'level_up_bonus' | 'monster_enhancement' | 'player_death' | 'kinfolk_pack_hunting' | 'class_effect' | 'class_level_up' | 'game_victory' | 'game_defeat' | 'ranger_tracking' | string;
  public: boolean;
  isPublic?: boolean; // For backward compatibility
  source?: string;
  attackerId?: string;
  targetId?: string;
  target?: string;
  message: string;
  privateMessage?: string;
  attackerMessage?: string;
  timestamp?: number;
  details?: Record<string, any>;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Ability handler function signature
 */
export type AbilityHandler = (
  actor: Player,
  target: Player | Monster | string,
  ability: Ability,
  log: LogEntry[],
  systems: GameSystems,
  coordinationInfo?: CoordinationInfo
) => boolean;

/**
 * Ability registry interface
 */
export interface AbilityRegistry {
  registerClassAbility(abilityType: string, handler: AbilityHandler): void;
  registerClassAbilities(abilityTypes: string[], handler: AbilityHandler): void;
  hasClassAbility(abilityType: string): boolean;
  executeClassAbility(
    abilityType: string,
    actor: Player,
    target: Player | Monster | string,
    ability: Ability,
    log: LogEntry[],
    systems: GameSystems,
    coordinationInfo?: CoordinationInfo
  ): boolean;
  registerRacialAbility(abilityType: string, handler: AbilityHandler): void;
  hasRacialAbility(abilityType: string): boolean;
  executeRacialAbility(
    abilityType: string,
    actor: Player,
    target: Player | Monster | string,
    ability: Ability,
    log: LogEntry[],
    systems: GameSystems,
    coordinationInfo?: CoordinationInfo
  ): boolean;
  getDebugInfo(): Record<string, unknown>;
}

/**
 * Helper to register all abilities of a specific category
 * @param registry - Ability registry to register with
 * @param category - Category to match ('Attack', 'Defense', 'Heal', 'Special')
 * @param handler - Handler function to use
 * @returns Array of registered ability types
 */
export function registerAbilitiesByCategory(
  registry: AbilityRegistry,
  category: string,
  handler: AbilityHandler
): string[] {
  const allAbilities: string[] = [];

  // Iterate through all class abilities
  Object.values(config.classAbilities || {}).forEach((classAbilities: any) => {
    classAbilities.forEach((ability: any) => {
      if (
        ability.category === category &&
        !registry.hasClassAbility(ability.type)
      ) {
        allAbilities.push(ability.type);
      }
    });
  });

  // Register all abilities with this category
  if (allAbilities.length > 0) {
    registry.registerClassAbilities(allAbilities, handler);
  }

  return allAbilities;
}

/**
 * Helper to register all abilities with a specific effect and target type
 * @param registry - Ability registry to register with
 * @param effect - Effect to match ('poison', 'shielded', etc.) or null
 * @param target - Target to match ('Single', 'Self', 'Multi')
 * @param handler - Handler function to use
 * @param excludeTypes - Ability types to exclude from registration
 * @returns Array of registered ability types
 */
export function registerAbilitiesByEffectAndTarget(
  registry: AbilityRegistry,
  effect: string | null,
  target: string,
  handler: AbilityHandler,
  excludeTypes: string[] = []
): string[] {
  const allAbilities: string[] = [];

  // Iterate through all class abilities
  Object.values(config.classAbilities || {}).forEach((classAbilities: any) => {
    classAbilities.forEach((ability: any) => {
      if (
        ability.effect === effect &&
        ability.target === target &&
        !registry.hasClassAbility(ability.type) &&
        !excludeTypes.includes(ability.type)
      ) {
        allAbilities.push(ability.type);
      }
    });
  });

  // Register all abilities with this effect and target
  if (allAbilities.length > 0) {
    registry.registerClassAbilities(allAbilities, handler);
  }

  return allAbilities;
}

/**
 * Helper to register abilities based on multiple criteria
 * @param registry - Ability registry to register with
 * @param criteria - Object containing criteria to match
 * @param handler - Handler function to use
 * @param excludeTypes - Ability types to exclude from registration
 * @returns Array of registered ability types
 */
export function registerAbilitiesByCriteria(
  registry: AbilityRegistry,
  criteria: Record<string, any>,
  handler: AbilityHandler,
  excludeTypes: string[] = []
): string[] {
  const allAbilities: string[] = [];

  // Iterate through all class abilities
  Object.values(config.classAbilities || {}).forEach((classAbilities: any) => {
    classAbilities.forEach((ability: any) => {
      // Skip already registered abilities and excluded types
      if (
        registry.hasClassAbility(ability.type) ||
        excludeTypes.includes(ability.type)
      ) {
        return;
      }

      // Check all criteria
      let matchesCriteria = true;
      for (const [key, value] of Object.entries(criteria)) {
        if (ability[key] !== value) {
          matchesCriteria = false;
          break;
        }
      }

      if (matchesCriteria) {
        allAbilities.push(ability.type);
      }
    });
  });

  // Register all abilities matching the criteria
  if (allAbilities.length > 0) {
    registry.registerClassAbilities(allAbilities, handler);
  }

  return allAbilities;
}

/**
 * Find all abilities with a specific type pattern
 * @param pattern - String pattern to match in ability type
 * @returns Array of ability types matching the pattern
 */
export function findAbilitiesByTypePattern(pattern: string): string[] {
  const allAbilities: string[] = [];

  Object.values(config.classAbilities || {}).forEach((classAbilities: any) => {
    classAbilities.forEach((ability: any) => {
      if (ability.type.includes(pattern)) {
        allAbilities.push(ability.type);
      }
    });
  });

  return allAbilities;
}

/**
 * Category breakdown interface
 */
interface CategoryBreakdown {
  Attack: string[];
  Defense: string[];
  Heal: string[];
  Special: string[];
}

/**
 * Target breakdown interface
 */
interface TargetBreakdown {
  Single: string[];
  Self: string[];
  Multi: string[];
}

/**
 * All abilities response interface
 */
export interface AllAbilitiesResponse {
  byCategory: CategoryBreakdown;
  byEffect: Record<string, string[]>;
  byTarget: TargetBreakdown;
  all: string[];
}

/**
 * Get all abilities for testing and debugging
 * @returns Object with all class abilities
 */
export function getAllAbilities(): AllAbilitiesResponse {
  const abilities: AllAbilitiesResponse = {
    byCategory: {
      Attack: [],
      Defense: [],
      Heal: [],
      Special: [],
    },
    byEffect: {},
    byTarget: {
      Single: [],
      Self: [],
      Multi: [],
    },
    all: [],
  };

  Object.values(config.classAbilities || {}).forEach((classAbilities: any) => {
    classAbilities.forEach((ability: any) => {
      // Add to category
      if (ability.category) {
        if (!abilities.byCategory[ability.category as keyof CategoryBreakdown]) {
          abilities.byCategory[ability.category as keyof CategoryBreakdown] = [];
        }
        abilities.byCategory[ability.category as keyof CategoryBreakdown].push(ability.type);
      }

      // Add to effect
      if (ability.effect) {
        if (!abilities.byEffect[ability.effect]) {
          abilities.byEffect[ability.effect] = [];
        }
        abilities.byEffect[ability.effect]?.push(ability.type);
      }

      // Add to target
      if (ability.target) {
        if (!abilities.byTarget[ability.target as keyof TargetBreakdown]) {
          abilities.byTarget[ability.target as keyof TargetBreakdown] = [];
        }
        abilities.byTarget[ability.target as keyof TargetBreakdown].push(ability.type);
      }

      // Add to all
      abilities.all.push(ability.type);
    });
  });

  return abilities;
}

/**
 * Apply threat for any ability use
 * This calculates and applies threat for any ability use
 * @param actor - The player using the ability
 * @param target - The target of the ability
 * @param ability - The ability being used
 * @param damageDealt - Amount of damage dealt (default 0)
 * @param healingDone - Amount of healing done (default 0)
 * @param systems - Game systems
 */
export function applyThreatForAbility(
  actor: Player,
  target: Player | Monster | string,
  ability: Ability,
  damageDealt: number = 0,
  healingDone: number = 0,
  systems: GameSystems
): void {
  // Get the monster controller from systems
  const monsterController = systems.monsterController;

  if (!monsterController || !monsterController.addThreat) {
    return; // Threat system not available
  }

  // Calculate threat components
  const damageToMonster = target === config.MONSTER_ID ? damageDealt : 0;
  const totalDamageDealt = damageDealt;
  const actorArmor = actor.getEffectiveArmor ? actor.getEffectiveArmor() : 0;

  // Add threat to the monster controller
  monsterController.addThreat(
    actor.id,
    damageToMonster,
    totalDamageDealt,
    healingDone,
    actorArmor
  );
}
