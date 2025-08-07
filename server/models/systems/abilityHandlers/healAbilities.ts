/**
 * @fileoverview Heal-related ability handlers (Refactored)
 * 
 * This file has been refactored to use modular ability handlers.
 * Individual handlers have been moved to:
 * 
 * - abilities/heal/basic-healing.ts: Standard healing abilities
 * - abilities/heal/regeneration-abilities.ts: Healing over time and regeneration
 * 
 * This provides better organization and easier maintenance.
 */

import type { AbilityRegistry } from './abilityRegistryUtils.js';
import {
  registerAbilitiesByCategory,
  registerAbilitiesByEffectAndTarget
} from './abilityRegistryUtils.js';

// Import modular handlers
import {
  // Basic healing
  handleHeal,
  handleMultiHeal,
  
  // Regeneration abilities
  handleHealingOverTime,
  handleRapidRegeneration,
  handleLifeSteal
} from './abilities/index.js';

/**
 * Register all heal ability handlers with the registry
 * @param registry - Ability registry to register with
 */
export function register(registry: AbilityRegistry): void {
  // Register basic healing abilities
  registry.registerClassAbility('heal', handleHeal);
  registry.registerClassAbility('swiftMend', handleHeal);
  registry.registerClassAbility('bandage', handleHeal);
  registry.registerClassAbility('cauterize', handleHeal);
  registry.registerClassAbility('ancestralHeal', handleHeal);

  // Register multi-heal abilities
  registry.registerClassAbility('groupHeal', handleMultiHeal);
  registry.registerClassAbility('divineLight', handleMultiHeal);

  // Register regeneration abilities
  registry.registerClassAbility('regeneration', handleHealingOverTime);
  registry.registerClassAbility('rapidRegeneration', handleRapidRegeneration);
  registry.registerClassAbility('lifeSteal', handleLifeSteal);

  // Register all abilities with 'Heal' category to use basic heal handler
  registerAbilitiesByCategory(
    registry,
    'Heal',
    (actor, target, ability, log, systems, coordinationInfo) => {
      // Check if it's a multi-target heal
      if ((ability as any).target === 'Multi' || (ability as any).target === 'All') {
        return registry.executeClassAbility(
          'groupHeal',
          actor,
          target,
          ability,
          log,
          systems,
          coordinationInfo
        );
      } else {
        return registry.executeClassAbility(
          'heal',
          actor,
          target,
          ability,
          log,
          systems,
          coordinationInfo
        );
      }
    }
  );

  // Register all abilities with 'heal' effect
  registerAbilitiesByEffectAndTarget(
    registry,
    'heal',
    'Single',
    (actor, target, ability, log, systems, coordinationInfo) => {
      return registry.executeClassAbility(
        'heal',
        actor,
        target,
        ability,
        log,
        systems,
        coordinationInfo
      );
    }
  );

  // Register healing over time abilities
  registerAbilitiesByEffectAndTarget(
    registry,
    'regeneration',
    'Single',
    (actor, target, ability, log, systems, coordinationInfo) => {
      return registry.executeClassAbility(
        'regeneration',
        actor,
        target,
        ability,
        log,
        systems,
        coordinationInfo
      );
    }
  );

  // Register multi-heal abilities
  registerAbilitiesByEffectAndTarget(
    registry,
    'heal',
    'Multi',
    (actor, target, ability, log, systems, coordinationInfo) => {
      return registry.executeClassAbility(
        'groupHeal',
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