/**
 * @fileoverview Stealth and invisibility defense ability handlers
 * Handles abilities that provide invisibility, stealth, and evasion
 */

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
 * Handle invisibility abilities (Shadow Veil, etc.)
 */
export const handleInvisibility: AbilityHandler = (
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

  // Can only target players
  if (!(target as any).hasOwnProperty('isAlive')) {
    return false;
  }

  const targetPlayer = target as Player;

  // Check if target is alive
  if ((targetPlayer as any).isAlive === false || (targetPlayer as any).hp <= 0) {
    return false;
  }

  const params = (ability as any).params || {};
  const duration = Number(params.duration) || 2;
  const dodgeChance = Number(params.dodgeChance) || 0.8; // 80% chance to dodge attacks

  // Apply invisibility effect
  const statusResult = systems.statusEffectManager?.applyStatusEffect?.(target, {
    id: `invisible-${Date.now()}`,
    name: 'invisible',
    type: 'buff',
    duration,
    params: {
      dodgeChance,
      sourceId: actor.id,
      sourceName: actor.name
    }
  }) || { success: false };

  if (statusResult.success) {
    log.push({
      id: `invisibility-success-${Date.now()}`,
      timestamp: Date.now(),
      type: 'action',
      source: actor.id,
      target: target.id,
      message: `${actor.name} casts invisibility on ${targetPlayer.name}, granting ${Math.round(dodgeChance * 100)}% dodge chance for ${duration} turns!`,
      details: {
        duration,
        dodgeChance
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
 * Handle shadowstep - instant movement/teleportation ability
 */
export const handleShadowstep: AbilityHandler = (
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

  // Shadowstep typically targets self
  const actualTarget = target || actor;

  // Check if target is alive
  if ((actualTarget as any).hp <= 0) {
    return false;
  }

  const params = (ability as any).params || {};
  const dodgeNextAttack = params.dodgeNextAttack || true;
  const speedBonus = Number(params.speedBonus) || 1.5; // 50% speed bonus
  const duration = Number(params.duration) || 1; // Usually very short duration

  // Apply shadowstep effects
  const effects = [];

  // Dodge next attack
  if (dodgeNextAttack) {
    const dodgeResult = systems.statusEffectManager?.applyStatusEffect?.(actualTarget, {
      id: `shadowstep-dodge-${Date.now()}`,
      name: 'dodge_next_attack',
      type: 'buff',
      duration: 1, // Only lasts until next attack
      params: {
        sourceId: actor.id,
        sourceName: actor.name
      }
    }) || { success: false };
    if (dodgeResult.success) effects.push('dodge');
  }

  // Speed bonus
  if (speedBonus > 1) {
    const speedResult = systems.statusEffectManager?.applyStatusEffect?.(actualTarget, {
      id: `shadowstep-speed-${Date.now()}`,
      name: 'speed_boost',
      type: 'buff',
      duration,
      params: {
        speedMultiplier: speedBonus,
        sourceId: actor.id,
        sourceName: actor.name
      }
    }) || { success: false };
    if (speedResult.success) effects.push('speed');
  }

  if (effects.length > 0) {
    const targetName = (actualTarget as Player).name || 'unknown';
    
    log.push({
      id: `shadowstep-success-${Date.now()}`,
      timestamp: Date.now(),
      type: 'action',
      source: actor.id,
      target: actualTarget.id,
      message: `${actor.name} performs Shadowstep on ${targetName}, granting ${effects.join(' and ')} effects!`,
      details: {
        effects,
        duration,
        speedBonus
      },
      public: true,
      isPublic: true,
      priority: 'high'
    });

    return true;
  }

  return false;
};