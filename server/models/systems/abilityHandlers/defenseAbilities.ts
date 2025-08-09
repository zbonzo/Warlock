/**
 * @fileoverview Defense-related ability handlers (Refactored)
 *
 * This file has been refactored to use modular ability handlers.
 * Individual handlers have been moved to:
 *
 * - abilities/defense/protection-abilities.ts: Shield and protection abilities
 * - abilities/defense/stealth-abilities.ts: Invisibility and stealth abilities
 *
 * This provides better organization and easier maintenance.
 */

import type { AbilityRegistry } from './abilityRegistryUtils.js';
import {
  registerAbilitiesByEffectAndTarget,
  registerAbilitiesByCriteria
} from './abilityRegistryUtils.js';

// Import modular handlers
import {
  // Protection abilities
  handleShieldWall,
  handleMultiProtection,

  // Stealth abilities
  handleInvisibility,
  handleShadowstep
} from './abilities/index.js';

/**
 * Register all defense ability handlers with the registry
 * @param registry - Ability registry to register with
 */
export function register(registry: AbilityRegistry): void {
  // Base protection ability handlers
  registry.registerClassAbility('shieldWall', handleShieldWall);
  registry.registerClassAbility('shadowVeil', handleInvisibility);

  // Register all 'Defense' category abilities to use appropriate handlers based on effect
  registerAbilitiesByCriteria(
    registry,
    { category: 'Defense', effect: 'shielded' },
    (actor, target, ability, log, systems, coordinationInfo) => {
      return registry.executeClassAbility(
        'shieldWall',
        actor,
        target,
        ability,
        log,
        systems,
        coordinationInfo
      );
    }
  );

  // Register invisibility abilities
  registerAbilitiesByEffectAndTarget(
    registry,
    'invisible',
    'Self',
    (actor, target, ability, log, systems, coordinationInfo) => {
      return registry.executeClassAbility(
        'shadowVeil',
        actor,
        target,
        ability,
        log,
        systems,
        coordinationInfo
      );
    }
  );

  // Special abilities with their own handlers
  registry.registerClassAbility('shadowstep', handleShadowstep);
  registry.registerClassAbility('battleCry', handleMultiProtection);
  registry.registerClassAbility('divineShield', handleMultiProtection);

  // Register all abilities with 'protected' effect to use multi-protection
  registerAbilitiesByEffectAndTarget(
    registry,
    'protected',
    'Multi',
    (actor, target, ability, log, systems, coordinationInfo) => {
      return registry.executeClassAbility(
        'battleCry',
        actor,
        target,
        ability,
        log,
        systems,
        coordinationInfo
      );
    }
  );
}
