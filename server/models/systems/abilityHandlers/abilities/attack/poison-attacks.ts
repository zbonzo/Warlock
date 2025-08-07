/**
 * @fileoverview Poison-based attack ability handlers
 * Handles abilities that deal damage and apply poison effects
 */

import type { Player, Monster, Ability } from '../../../../../types/generated.js';
import type {
  AbilityHandler,
  CoordinationInfo,
  LogEntry
} from '../../abilityRegistryUtils.js';
import type { GameSystems } from '../../../SystemsFactory.js';
import { applyThreatForAbility } from '../../abilityRegistryUtils.js';

import config from '../../../../../config/index.js';
import messages from '../../../../../config/messages/index.js';

/**
 * Handle poison strike - attack that applies poison on successful hit
 */
export const handlePoisonStrike: AbilityHandler = (
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

  // Check if target is invisible
  if ((target as any).statusEffects && (target as any).statusEffects.invisible) {
    log.push({
      id: `poison-strike-invisible-${Date.now()}`,
      timestamp: Date.now(),
      type: 'action',
      source: actor.id,
      target: target.id,
      message: `${actor.name} attacks ${(target as Player).name} but misses due to invisibility!`,
      details: { reason: 'target_invisible' },
      public: true,
      isPublic: true,
      priority: 'medium'
    });
    return false;
  }

  // First apply regular attack damage with coordination bonuses
  const baseDamage = Number(ability['damage']) || 0;
  let finalDamage = Number(baseDamage);

  // Apply coordination bonus
  if (coordinationInfo && coordinationInfo.isActive) {
    const coordinationBonus = Math.floor(Number(baseDamage) * Number(coordinationInfo.bonusMultiplier));
    finalDamage += Number(coordinationBonus);
  }

  // Apply damage
  const damageResult = systems.combatSystem?.applyDamage?.(target, finalDamage, {
    source: actor.id,
    type: 'physical',
    ability: ability['id']
  }) || { success: false, finalDamage: 0 };

  if (!damageResult.success) {
    return false;
  }

  // Then apply poison if attack was successful and target is still alive
  if ((target as any).isAlive !== false && (target as any).hp > 0) {
    const poisonParams = (ability as any).params || {};
    const poisonDamage = Number(poisonParams.poisonDamage) || 5;
    const poisonDuration = Number(poisonParams.poisonDuration) || 3;

    // Apply poison status effect
    const statusResult = systems.statusEffectManager?.applyStatusEffect?.(target, {
      id: `poison-${Date.now()}`,
      name: 'poison',
      type: 'debuff',
      duration: poisonDuration,
      params: {
        damagePerTurn: poisonDamage,
        sourceId: actor.id,
        sourceName: actor.name
      }
    }) || { success: false };

    if (statusResult.success) {
      const targetName = (target as Player).name || (target as Monster).name;
      
      log.push({
        id: `poison-strike-success-${Date.now()}`,
        timestamp: Date.now(),
        type: 'damage',
        source: actor.id,
        target: target.id,
        message: `${actor.name} strikes ${targetName} for ${damageResult.finalDamage} damage and applies poison (${poisonDamage}/turn for ${poisonDuration} turns)!`,
        details: {
          damage: damageResult.finalDamage,
          poisonDamage,
          poisonDuration
        },
        public: true,
        isPublic: true,
        priority: 'high'
      });

      // Apply threat for both damage and poison
      applyThreatForAbility(actor, target, ability, Number(finalDamage) + Number(poisonDamage), 0, systems);
      
      return true;
    }
  }

  // Just log the damage if poison failed to apply
  const targetName = (target as Player).name || (target as Monster).name;
  log.push({
    id: `poison-strike-partial-${Date.now()}`,
    timestamp: Date.now(),
    type: 'damage',
    source: actor.id,
    target: target.id,
    message: `${actor.name} attacks ${targetName} with ${ability['name']} for ${damageResult.finalDamage} damage!`,
    details: { damage: damageResult.finalDamage },
    public: true,
    isPublic: true,
    priority: 'high'
  });

  applyThreatForAbility(actor, target, ability, Number(finalDamage), 0, systems);
  return true;
};

/**
 * Handle death mark - applies a powerful poison that grows stronger
 */
export const handleDeathMark: AbilityHandler = (
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

  // Death mark doesn't do initial damage, just applies the growing poison
  const params = (ability as any).params || {};
  const initialDamage = Number(params.initialDamage) || 3;
  const growthRate = Number(params.growthRate) || 2;
  const duration = Number(params.duration) || 5;

  const statusResult = systems.statusEffectManager?.applyStatusEffect?.(target, {
    id: `death-mark-${Date.now()}`,
    name: 'death_mark',
    type: 'debuff',
    duration,
    params: {
      currentDamage: initialDamage,
      growthRate,
      sourceId: actor.id,
      sourceName: actor.name
    }
  }) || { success: false };

  if (statusResult.success) {
    const targetName = (target as Player).name || (target as Monster).name;
    
    log.push({
      id: `death-mark-applied-${Date.now()}`,
      timestamp: Date.now(),
      type: 'status',
      source: actor.id,
      target: target.id,
      message: `${actor.name} applies Death Mark to ${targetName} (starts at ${initialDamage} damage/turn, grows by ${growthRate} each turn for ${duration} turns)!`,
      details: {
        initialDamage,
        growthRate,
        duration
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
 * Handle poison trap - area effect poison ability
 */
export const handlePoisonTrap: AbilityHandler = (
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

  // Get all valid targets for poison trap (usually all enemies)
  const game = systems.game;
  if (!game) return false;

  const targets = [];
  
  // Add all living players except the actor
  for (const player of game.players.values()) {
    if (player.id !== actor.id && (player as any).isAlive !== false && (player as any).hp > 0) {
      targets.push(player);
    }
  }

  // Add monster if alive
  if (game.monster && (game.monster as any).isAlive && (game.monster as any).hp > 0) {
    targets.push(game.monster);
  }

  if (targets.length === 0) {
    return false;
  }

  const params = (ability as any).params || {};
  const poisonDamage = Number(params.poisonDamage) || 4;
  const duration = Number(params.duration) || 4;
  let affectedTargets = 0;

  // Apply poison to all targets
  for (const trapTarget of targets) {
    const statusResult = systems.statusEffectManager?.applyStatusEffect?.(trapTarget, {
      id: `poison-trap-${Date.now()}-${trapTarget.id}`,
      name: 'poison',
      type: 'debuff',
      duration,
      params: {
        damagePerTurn: poisonDamage,
        sourceId: actor.id,
        sourceName: actor.name
      }
    }) || { success: false };

    if (statusResult.success) {
      affectedTargets++;
    }
  }

  if (affectedTargets > 0) {
    log.push({
      id: `poison-trap-success-${Date.now()}`,
      timestamp: Date.now(),
      type: 'action',
      source: actor.id,
      message: `${actor.name} sets a poison trap, affecting ${affectedTargets} targets with poison (${poisonDamage} damage/turn for ${duration} turns)!`,
      details: {
        affectedTargets: affectedTargets,
        poisonDamage,
        duration
      },
      public: true,
      isPublic: true,
      priority: 'high'
    });

    return true;
  }

  return false;
};