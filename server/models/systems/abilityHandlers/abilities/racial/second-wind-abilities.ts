/**
 * @fileoverview Second Wind racial ability
 * Handles the Artisan racial: cleanse negative effects and recover a burst of HP
 */

import { createHealLog } from '../../../../../utils/logEntry.js';
import type { Player, Monster, Ability } from '../../../../../types/generated.js';
import type {
  AbilityHandler,
  CoordinationInfo,
  LogEntry
} from '../../abilityRegistryUtils.js';
import type { GameSystems } from '../../../SystemsFactory.js';

// Status effects considered detrimental enough for Second Wind to cleanse
const NEGATIVE_EFFECTS = ['poison', 'bleed', 'stunned', 'weakened', 'vulnerable'];

/**
 * Handle Second Wind - Artisan racial ability
 */
export const handleSecondWind: AbilityHandler = (
  actor: Player,
  _target: Player | Monster,
  ability: Ability,
  log: LogEntry[],
  systems: GameSystems,
  _coordinationInfo?: CoordinationInfo
): boolean => {
  if (!actor || !ability) {
    return false;
  }

  const params = (ability as any).params || {};
  const healPercent = Number(params.healPercent) || 0.3;

  // Cleanse negative status effects
  const cleansedEffects: string[] = [];
  for (const effectName of NEGATIVE_EFFECTS) {
    if (systems.statusEffectManager?.hasEffect?.(actor.id, effectName)) {
      const removed = systems.statusEffectManager?.removeEffectsByType?.(actor.id, effectName, log) || 0;
      if (removed > 0) {
        cleansedEffects.push(effectName);
      }
    }
  }

  // Heal a portion of max HP
  const maxHp = (actor as any).maxHp || 0;
  const healAmount = Math.floor(maxHp * healPercent);
  const healingResult = systems.combatSystem?.applyHealing?.(actor, healAmount, {
    source: actor.id,
    type: 'direct',
    ability: ability.id,
  }) || { success: true, finalHealing: healAmount, wasOverhealing: false };

  const finalHealing = healingResult.finalHealing ?? healAmount;

  log.push(createHealLog(
    actor.id,
    actor.id,
    finalHealing,
    cleansedEffects.length > 0
      ? `${actor.name} catches a Second Wind, shaking off ${cleansedEffects.join(', ')} and recovering ${finalHealing} HP!`
      : `${actor.name} catches a Second Wind and recovers ${finalHealing} HP!`,
    {
      details: { cleansedEffects, healAmount: finalHealing },
      priority: 'high',
      public: true,
    }
  ));

  return true;
};
