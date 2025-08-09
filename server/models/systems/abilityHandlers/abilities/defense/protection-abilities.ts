/**
 * @fileoverview Protection-based defense ability handlers
 * Handles abilities that provide shields, armor, and protection
 */

import { createActionLog } from '../../../../../utils/logEntry.js';
import { secureId } from '../../../../../utils/secureRandom.js';
import type { Player, Monster, Ability } from '../../../../../types/generated.js';
import type {
  AbilityHandler,
  CoordinationInfo,
  LogEntry
} from '../../abilityRegistryUtils.js';
import type { GameSystems } from '../../../SystemsFactory.js';


/**
 * Handle shield wall - provides damage reduction
 */
export const handleShieldWall: AbilityHandler = (
  actor: Player,
  target: Player | Monster,
  ability: Ability,
  log: LogEntry[],
  systems: GameSystems,
  _coordinationInfo?: CoordinationInfo
): boolean => {
  if (!actor || !target || !ability) {
    return false;
  }

  // Can only target players
  if (!Object.prototype.hasOwnProperty.call(target, 'isAlive')) {
    return false;
  }

  const targetPlayer = target as Player;

  // Check if target is alive
  if ((targetPlayer as any).isAlive === false || (targetPlayer as any).hp <= 0) {
    return false;
  }

  const params = (ability as any).params || {};
  const shieldAmount = Number(params.shieldAmount) || 15;
  const duration = Number(params.duration) || 3;
  const damageReduction = Number(params.damageReduction) || 0.3; // 30% damage reduction

  // Apply shield effect
  const statusResult = systems.statusEffectManager?.applyStatusEffect?.(target, {
    id: secureId('shield-wall'),
    name: 'shielded',
    type: 'buff',
    duration,
    params: {
      shieldAmount,
      damageReduction,
      sourceId: actor.id,
      sourceName: actor.name
    }
  }) || { success: false };

  if (statusResult.success) {
    log.push(createActionLog(
      actor.id,
      target.id,
      `${actor.name} casts Shield Wall on ${targetPlayer.name}, granting ${shieldAmount} shield and ${Math.round(damageReduction * 100)}% damage reduction for ${duration} turns!`,
      {
        details: {
          shieldAmount,
          damageReduction,
          duration
        },
        priority: 'high',
        public: true
      }
    ));

    return true;
  }

  return false;
};

/**
 * Handle multi-protection abilities (Battle Cry, Divine Shield, etc.)
 */
export const handleMultiProtection: AbilityHandler = (
  actor: Player,
  target: Player | Monster,
  ability: Ability,
  log: LogEntry[],
  systems: GameSystems,
  _coordinationInfo?: CoordinationInfo
): boolean => {
  if (!actor || !ability) {
    return false;
  }

  const game = systems.game;
  if (!game) {
    return false;
  }

  // Get all living allied players (including self)
  const targets = Array.from(game.players.values()).filter(
    p => (p as any).isAlive !== false && (p as any).hp > 0
  );

  if (targets.length === 0) {
    return false;
  }

  const params = (ability as any).params || {};
  const protectionAmount = Number(params.protectionAmount) || 10;
  const duration = Number(params.duration) || 4;
  const effectName = ability['name']?.toLowerCase().replace(/\s/g, '_') || 'protection';

  let protectedTargets = 0;

  // Apply protection to all living allies
  for (const protectionTarget of targets) {
    const statusResult = systems.statusEffectManager?.applyStatusEffect?.(protectionTarget as Player, {
      id: secureId(`${effectName}-${(protectionTarget as any).id}`),
      name: 'protected',
      type: 'buff',
      duration,
      params: {
        protectionAmount,
        sourceId: actor.id,
        sourceName: actor.name,
        effectName
      }
    }) || { success: false };

    if (statusResult.success) {
      protectedTargets++;
    }
  }

  if (protectedTargets > 0) {
    log.push(createActionLog(
      actor.id,
      'multiple',
      `${actor.name} casts ${ability['name']}, protecting ${protectedTargets} allies with ${protectionAmount} protection for ${duration} turns!`,
      {
        details: {
          protectedCount: protectedTargets,
          protectionAmount,
          duration,
          effectName
        },
        priority: 'high',
        public: true
      }
    ));

    return true;
  }

  return false;
};
