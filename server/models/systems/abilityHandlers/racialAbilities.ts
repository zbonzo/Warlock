/**
 * @fileoverview Racial ability handlers (Refactored)
 * 
 * This file has been refactored to use modular ability handlers.
 * Individual handlers have been moved to:
 * 
 * - abilities/racial/adaptability-abilities.ts: Adaptability and evolution abilities
 * - abilities/racial/combat-racial-abilities.ts: Combat-focused racial abilities
 * - abilities/racial/utility-racial-abilities.ts: Utility and support racial abilities
 * 
 * This provides better organization and easier maintenance.
 */

import type { AbilityRegistry } from './abilityRegistryUtils.js';

// Import modular handlers
import {
  // Adaptability abilities
  handleAdaptability,
  
  // Combat racial abilities
  handleBloodRage,
  handleUndying,
  handleStoneArmor,
  
  // Utility racial abilities
  handlePackBond,
  handleDespairAura,
  handleArtisanCrafting
} from './abilities/index.js';

/**
 * Register all racial ability handlers with the registry
 * @param registry - Ability registry to register with
 */
export function register(registry: AbilityRegistry): void {
  // Register racial abilities with the registry
  if (registry.registerRacialAbility) {
    // Adaptability abilities
    registry.registerRacialAbility('adaptability', handleAdaptability);
    
    // Combat racial abilities
    registry.registerRacialAbility('bloodRage', handleBloodRage);
    registry.registerRacialAbility('undying', handleUndying);
    registry.registerRacialAbility('stoneArmor', handleStoneArmor);
    
    // Utility racial abilities
    registry.registerRacialAbility('packBond', handlePackBond);
    registry.registerRacialAbility('despairAura', handleDespairAura);
    registry.registerRacialAbility('artisanCrafting', handleArtisanCrafting);
  }

  // Also register as class abilities for backward compatibility
  registry.registerClassAbility('adaptability', handleAdaptability);
  registry.registerClassAbility('bloodRage', handleBloodRage);
  registry.registerClassAbility('undying', handleUndying);
  registry.registerClassAbility('stoneArmor', handleStoneArmor);
  registry.registerClassAbility('packBond', handlePackBond);
  registry.registerClassAbility('despairAura', handleDespairAura);
  registry.registerClassAbility('artisanCrafting', handleArtisanCrafting);

  // Note: Stone Armor is typically passive and handled in combat system
  // but can also be activated for enhanced protection
}