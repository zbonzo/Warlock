/**
 * @fileoverview Regeneration and healing over time ability handlers
 * Handles abilities that provide sustained healing effects
 */

import { createActionLog, createHealLog } from '../../../../../utils/logEntry.js';
import { secureId } from '../../../../../utils/secureRandom.js';
import type { Player, Monster, Ability } from '../../../../../types/generated.js';
import type {
  AbilityHandler,
  CoordinationInfo,
  LogEntry
} from '../../abilityRegistryUtils.js';
import type { GameSystems } from '../../../SystemsFactory.js';

import config from '../../../../../config/index.js';
import messages from '../../../../../config/messages/index.js';

/**
 * Handle healing over time abilities
 */
export const handleHealingOverTime: AbilityHandler = (
  actor: Player,
  target: Player | Monster,
  ability: Ability,
  log: LogEntry[],
  systems: GameSystems,
  coordinationInfo?: CoordinationInfo
): boolean => {
  if (!actor || !target || !ability) {
    return false;
  }

  // Can only heal players
  if (!(target as any).hasOwnProperty('isAlive')) {
    return false;
  }

  const targetPlayer = target as Player;

  // Check if target is alive
  if ((targetPlayer as any).isAlive === false || (targetPlayer as any).hp <= 0) {
    return false;
  }

  const params = (ability as any).params || {};
  const healingPerTurn = Number(params.healingPerTurn) || 8;
  const duration = Number(params.duration) || 4;
  const immediateHealing = Number(params.immediateHealing) || 0;

  // Apply immediate healing if specified
  if (immediateHealing > 0) {
    const immediateResult = systems.combatSystem?.applyHealing?.(target, immediateHealing, {
      source: actor.id,
      type: 'instant',
      ability: ability['id']
    });

    if (immediateResult?.success) {
      log.push(createHealLog(
        actor.id,
        target.id,
        immediateResult.finalHealing,
        `${actor.name} immediately heals ${targetPlayer.name} for ${immediateResult.finalHealing} HP!`,
        { details: { immediateHealing: immediateResult.finalHealing }, priority: 'medium', public: true }
      ));
    }
  }

  // Apply healing over time effect
  const statusResult = systems.statusEffectManager?.applyStatusEffect?.(target, {
    id: secureId('healing-over-time'),
    name: 'regeneration',
    type: 'buff',
    duration,
    params: {
      healingPerTurn,
      sourceId: actor.id,
      sourceName: actor.name
    }
  }) || { success: false };

  if (statusResult.success) {
    log.push({
      id: secureId('hot-applied'),
      timestamp: Date.now(),
      type: 'action',
      source: actor.id,
      target: target.id,
      message: `${actor.name} applies healing over time to ${targetPlayer.name} (${healingPerTurn} HP/turn for ${duration} turns)!`,
      details: {
        healingPerTurn,
        duration,
        immediateHealing
      },
      public: true,
      isPublic: true,
      priority: 'high'
    });

    return true;
  }

  return false;
};

/**
 * Handle rapid regeneration abilities
 */
export const handleRapidRegeneration: AbilityHandler = (
  actor: Player,
  target: Player | Monster,
  ability: Ability,
  log: LogEntry[],
  systems: GameSystems,
  coordinationInfo?: CoordinationInfo
): boolean => {
  if (!actor || !target || !ability) {
    return false;
  }

  // Can only heal players
  if (!(target as any).hasOwnProperty('isAlive')) {
    return false;
  }

  const targetPlayer = target as Player;

  // Check if target is alive
  if ((targetPlayer as any).isAlive === false || (targetPlayer as any).hp <= 0) {
    return false;
  }

  const params = (ability as any).params || {};
  const healingPerTurn = Number(params.healingPerTurn) || 12;
  const duration = Number(params.duration) || 3;
  const healingMultiplier = Number(params.healingMultiplier) || 1.5;

  // Apply rapid regeneration effect
  const statusResult = systems.statusEffectManager?.applyStatusEffect?.(target, {
    id: secureId('rapid-regeneration'),
    name: 'rapid_regeneration',
    type: 'buff',
    duration,
    params: {
      healingPerTurn,
      healingMultiplier,
      sourceId: actor.id,
      sourceName: actor.name
    }
  }) || { success: false };

  if (statusResult.success) {
    log.push({
      id: secureId('rapid-regen-success'),
      timestamp: Date.now(),
      type: 'action',
      source: actor.id,
      target: target.id,
      message: `${actor.name} applies rapid regeneration to ${targetPlayer.name} (${healingPerTurn} HP/turn x${healingMultiplier} multiplier for ${duration} turns)!`,
      details: {
        healingPerTurn,
        duration,
        healingMultiplier
      },
      public: true,
      isPublic: true,
      priority: 'high'
    });

    return true;
  }

  return false;
};

/**
 * Handle life steal abilities
 */
export const handleLifeSteal: AbilityHandler = (
  actor: Player,
  target: Player | Monster,
  ability: Ability,
  log: LogEntry[],
  systems: GameSystems,
  coordinationInfo?: CoordinationInfo
): boolean => {
  if (!actor || !ability) {
    return false;
  }

  const params = (ability as any).params || {};
  const duration = Number(params.duration) || 3;
  const lifestealPercentage = Number(params.lifestealPercentage) || 0.3; // 30% of damage dealt

  // Apply life steal effect to the actor
  const statusResult = systems.statusEffectManager?.applyStatusEffect?.(actor, {
    id: secureId('life-steal'),
    name: 'life_steal',
    type: 'buff',
    duration,
    params: {
      lifestealPercentage,
      sourceId: actor.id,
      sourceName: actor.name
    }
  }) || { success: false };

  if (statusResult.success) {
    log.push({
      id: secureId('life-steal-success'),
      timestamp: Date.now(),
      type: 'action',
      source: actor.id,
      message: `${actor.name} gains life steal for ${duration} turns (${Math.round(lifestealPercentage * 100)}% of damage dealt)!`,
      details: {
        duration,
        lifestealPercentage
      },
      public: true,
      isPublic: true,
      priority: 'high'
    });

    return true;
  }

  return false;
};
