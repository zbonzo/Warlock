/**
 * @fileoverview Entry point for all ability handlers
 * Registers handlers with the AbilityRegistry
 * Migrated to TypeScript for Phase 6
 */

import type { AbilityRegistry, AllAbilitiesResponse } from './abilityRegistryUtils';
import { getAllAbilities } from './abilityRegistryUtils';

// Import handler modules - these will be migrated progressively
const attackAbilities = require('./attackAbilities');
const healAbilities = require('./healAbilities');
const defenseAbilities = require('./defenseAbilities');
const specialAbilities = require('./specialAbilities');
const racialAbilities = require('./racialAbilities');

/**
 * Debug information interface
 */
export interface DebugInfo {
  registeredHandlers: string[];
  totalHandlers: number;
  unregisteredAbilities: string[];
  timestamp: number;
}

/**
 * Ability handler module interface
 */
export interface AbilityHandlerModule {
  register(registry: AbilityRegistry): void;
}

/**
 * Register all ability handlers with the provided registry
 * @param registry - The ability registry to register handlers with
 * @returns Debug information about registered handlers
 */
export function registerAbilityHandlers(registry: AbilityRegistry): DebugInfo {
  // Validate registry parameter
  if (!registry || typeof registry.hasClassAbility !== 'function') {
    throw new Error('Invalid ability registry provided to registerAbilityHandlers');
  }

  // Register handlers from each category
  try {
    attackAbilities.register(registry);
    healAbilities.register(registry);
    defenseAbilities.register(registry);
    specialAbilities.register(registry);
    racialAbilities.register(registry);
  } catch (error: any) {
    console.error('Error registering ability handlers:', error);
    throw new Error(`Failed to register ability handlers: ${error?.message || 'Unknown error'}`);
  }
  
  // For debugging: check if all abilities have been registered
  const unregisteredAbilities = checkUnregisteredAbilities(registry);
  
  // Return debug info about registered handlers
  const debugInfo = registry.getDebugInfo();
  
  return {
    registeredHandlers: Array.isArray(debugInfo.handlers) ? debugInfo.handlers : [],
    totalHandlers: typeof debugInfo.total === 'number' ? debugInfo.total : 0,
    unregisteredAbilities,
    timestamp: Date.now()
  };
}

/**
 * Check if any abilities are not registered with handlers
 * @param registry - The ability registry to check
 * @returns Array of unregistered ability types
 * @private
 */
function checkUnregisteredAbilities(registry: AbilityRegistry): string[] {
  try {
    const allAbilities: AllAbilitiesResponse = getAllAbilities();
    
    // Check for unregistered abilities
    const unregistered = allAbilities.all.filter(abilityType => 
      !registry.hasClassAbility(abilityType)
    );
    
    if (unregistered.length > 0) {
      console.warn(`Warning: The following abilities don't have registered handlers: ${unregistered.join(', ')}`);
    }
    
    return unregistered;
  } catch (error: any) {
    console.error('Error checking unregistered abilities:', error);
    // Don't throw here as this is just for debugging
    return [];
  }
}

/**
 * Type guard to check if an object is a valid AbilityRegistry
 * @param obj - Object to check
 * @returns Whether the object is a valid AbilityRegistry
 */
export function isValidAbilityRegistry(obj: any): obj is AbilityRegistry {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.hasClassAbility === 'function' &&
    typeof obj.registerClassAbility === 'function' &&
    typeof obj.registerClassAbilities === 'function' &&
    typeof obj.executeClassAbility === 'function' &&
    typeof obj.getDebugInfo === 'function'
  );
}

/**
 * Get a list of all ability handler modules for validation
 * @returns Array of ability handler modules
 */
export function getAbilityHandlerModules(): AbilityHandlerModule[] {
  return [
    attackAbilities,
    healAbilities,
    defenseAbilities,
    specialAbilities,
    racialAbilities
  ].filter(module => module && typeof module.register === 'function');
}

/**
 * Validate that all required ability handler modules are present
 * @returns Whether all required modules are available
 */
export function validateAbilityHandlerModules(): boolean {
  const requiredModules = [
    'attackAbilities',
    'healAbilities', 
    'defenseAbilities',
    'specialAbilities',
    'racialAbilities'
  ];
  
  const availableModules = getAbilityHandlerModules();
  
  if (availableModules.length !== requiredModules.length) {
    console.error(`Expected ${requiredModules.length} ability handler modules, but found ${availableModules.length}`);
    return false;
  }
  
  return true;
}

// Re-export types for external use
export type { 
  AbilityRegistry,
  AbilityHandlerModule,
  AllAbilitiesResponse
} from './abilityRegistryUtils';

// Default export for CommonJS compatibility
module.exports = { registerAbilityHandlers };