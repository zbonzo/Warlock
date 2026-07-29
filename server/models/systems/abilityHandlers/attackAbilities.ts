/**
 * @fileoverview Attack-related ability handlers (Refactored)
 *
 * This file has been refactored to use modular ability handlers.
 * Individual handlers have been moved to:
 *
 * - abilities/attack/basic-attack.ts: Standard single-target attacks
 * - abilities/attack/poison-attacks.ts: Poison-based attacks
 * - abilities/attack/aoe-attacks.ts: Area of effect attacks
 * - abilities/attack/multi-hit-attacks.ts: Multi-hit attacks
 * - abilities/attack/special-attacks.ts: Special attack mechanics
 *
 * This provides better organization and easier maintenance.
 */

import type { AbilityRegistry } from './abilityRegistryUtils.js';
import {
  registerAbilitiesByCategory,
  registerAbilitiesByEffectAndTarget,
} from './abilityRegistryUtils.js';

// Import modular handlers
import {
  // Basic attacks
  handleAttack,

  // Poison attacks
  handlePoisonStrike,
  handleDeathMark,
  handlePoisonTrap,

  // AOE attacks
  handleAoeDamage,
  handleInfernoBlast,
  handleMeteorShower,

  // Multi-hit attacks
  handleMultiHitAttack,
  handleRicochetRound,

  // Special attacks
  handleVulnerabilityStrike,
  handleRecklessStrike,
  handleBarbedArrow,
  handlePyroblast
} from './abilities/index.js';

/**
 * Register all attack ability handlers with the registry
 * @param registry - Ability registry to register with
 */
export function register(registry: AbilityRegistry): void {
  // Register ability handlers by category and effect

  // 1. Basic single-target attack handler
  registry.registerClassAbility('attack', handleAttack);

  // 2. Register specific handlers BEFORE the category catch-all so they aren't overwritten

  // Poison-based abilities
  registry.registerClassAbility('poisonStrike', handlePoisonStrike);

  // Register all single-target poison-effect attacks to use the poison handler
  // (must run before the Attack catch-all so these don't get registered as plain attacks)
  registerAbilitiesByEffectAndTarget(
    registry,
    'poison',
    'Single',
    (actor, target, ability, log, systems, coordinationInfo) => {
      return registry.executeClassAbility(
        'poisonStrike',
        actor,
        target,
        ability,
        log,
        systems,
        coordinationInfo
      );
    },
    ['poisonStrike'] // already registered above
  );
  registry.registerClassAbility('deathMark', handleDeathMark);
  registry.registerClassAbility('poisonTrap', handlePoisonTrap);
  registry.registerClassAbility('multiHitAttack', handleMultiHitAttack);
  registry.registerClassAbility('barbedArrow', handleBarbedArrow);
  registry.registerClassAbility('pyroblast', handlePyroblast);
  registry.registerClassAbility('vulnerabilityStrike', handleVulnerabilityStrike);

  // AOE damage abilities
  registry.registerClassAbility('meteorShower', handleMeteorShower);
  registry.registerClassAbility('infernoBlast', handleInfernoBlast);
  registry.registerClassAbility('chainLightning', handleAoeDamage);

  registry.registerClassAbility('shiv', handleBarbedArrow);

  // Register all AoE damage abilities (with null effect and Multi target)
  // Exclude already registered ones
  registerAbilitiesByEffectAndTarget(
    registry,
    null,
    'Multi',
    (actor, target, ability, log, systems, coordinationInfo) => {
      return registry.executeClassAbility(
        'meteorShower',
        actor,
        target,
        ability,
        log,
        systems,
        coordinationInfo
      );
    },
    ['infernoBlast', 'chainLightning', 'ricochetRound'] // Exclude abilities with specific handlers
  );

  registry.registerClassAbility('arcaneBarrage', handleMultiHitAttack);
  registry.registerClassAbility('twinStrike', handleMultiHitAttack);
  registry.registerClassAbility('ricochetRound', handleRicochetRound);

  registry.registerClassAbility('recklessStrike', handleRecklessStrike);

  // Register all vulnerable effect abilities
  registerAbilitiesByEffectAndTarget(
    registry,
    'vulnerable',
    'Single',
    (actor, target, ability, log, systems, coordinationInfo) => {
      return registry.executeClassAbility(
        'vulnerabilityStrike',
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
