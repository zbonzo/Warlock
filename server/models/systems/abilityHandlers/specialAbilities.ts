/**
 * @fileoverview Special ability handlers (Refactored)
 *
 * This file has been refactored to use modular ability handlers.
 * Individual handlers have been moved to:
 *
 * - abilities/special/detection-abilities.ts: Detection and revelation abilities
 * - abilities/special/control-abilities.ts: Control and buff abilities
 * - abilities/special/barbarian-abilities.ts: Barbarian-specific abilities
 *
 * This provides better organization and easier maintenance.
 */

import type { AbilityRegistry } from './abilityRegistryUtils.js';
import {
  registerAbilitiesByEffectAndTarget,
} from './abilityRegistryUtils.js';

// Import modular handlers
import {
  // Detection abilities
  handleEyeOfFate,
  handlePrimalRoar,
  handleSanctuaryOfTruth,

  // Control abilities
  handleControlMonster,
  handleSpiritGuard,
  handleStunAbility,

  // Barbarian abilities
  handleBloodFrenzy,
  handleUnstoppableRage,
  handleRelentlessFury,
  handleThirstyBlade,
  handleSweepingStrike
} from './abilities/index.js';

/**
 * Register all special ability handlers with the registry
 * @param registry - Ability registry to register with
 */
export function register(registry: AbilityRegistry): void {
  // Register detection abilities
  registry.registerClassAbility('fatesEye', handleEyeOfFate);
  registry.registerClassAbility('primalRoar', handlePrimalRoar);
  registry.registerClassAbility('bloodFrenzy', handleBloodFrenzy);
  registry.registerClassAbility('unstoppableRage', handleUnstoppableRage);
  registry.registerClassAbility('spiritGuard', handleSpiritGuard);
  registry.registerClassAbility('sanctuaryOfTruth', handleSanctuaryOfTruth);
  registry.registerClassAbility('controlMonster', handleControlMonster);

  // Register Barbarian passive abilities
  registry.registerClassAbility('relentlessFury', handleRelentlessFury);
  registry.registerClassAbility('thirstyBlade', handleThirstyBlade);
  registry.registerClassAbility('sweepingStrike', handleSweepingStrike);

  // Register all abilities with 'detect' effect
  registerAbilitiesByEffectAndTarget(
    registry,
    'detect',
    'Single',
    (actor, target, ability, log, systems, coordinationInfo) => {
      return registry.executeClassAbility(
        'fatesEye',
        actor,
        target,
        ability,
        log,
        systems,
        coordinationInfo
      );
    }
  );

  // Register stun abilities
  registry.registerClassAbility('entangle', handleStunAbility);

  // Register all abilities with 'stunned' effect
  registerAbilitiesByEffectAndTarget(
    registry,
    'stunned',
    'Multi',
    (actor, target, ability, log, systems, coordinationInfo) => {
      if ((ability as any).name !== 'entangle') {
        // Skip ones with specific handlers
        return registry.executeClassAbility(
          'entangle',
          actor,
          target,
          ability,
          log,
          systems,
          coordinationInfo
        );
      }
      return false;
    }
  );
}
