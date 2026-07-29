/**
 * @fileoverview Poison-based attack ability handlers
 * Handles abilities that deal damage and apply poison effects
 */

import { createActionLog, createDamageLog } from '../../../../../utils/logEntry.js';
import { secureId } from '../../../../../utils/secureRandom.js';
import type { Player, Monster, Ability } from '../../../../../types/generated.js';
import type {
  AbilityHandler,
  CoordinationInfo,
  LogEntry
} from '../../abilityRegistryUtils.js';
import type { GameSystems } from '../../../SystemsFactory.js';
import { applyThreatForAbility } from '../../abilityRegistryUtils.js';


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
  if (systems.statusEffectManager?.hasEffect?.(target.id, 'invisible')) {
    log.push(createActionLog(
      actor.id,
      target.id,
      `${actor.name} attacks ${(target as Player).name} but misses due to invisibility!`,
      { details: { reason: 'target_invisible' }, priority: 'medium', public: true }
    ));
    return false;
  }

  // First apply regular attack damage with coordination bonuses
  const abilityParams = (ability as any).params || {};
  const baseDamage = Number(ability['damage']) || Number(abilityParams.damage) || 0;
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
    const poisonDamage = Number(abilityParams.poisonDamage) || Number(abilityParams.poison?.damage) || 5;
    const poisonDuration = Number(abilityParams.poisonDuration) || Number(abilityParams.poison?.turns) || 3;

    // Apply poison status effect
    const statusResult = systems.statusEffectManager?.applyStatusEffect?.(target, {
      id: secureId('poison'),
      name: 'poison',
      type: 'debuff',
      duration: poisonDuration,
      params: {
        damage: poisonDamage,
        sourceId: actor.id,
        sourceName: actor.name
      }
    }) || { success: false };

    if (statusResult.success) {
      const targetName = (target as Player).name || (target as Monster).name;

      log.push(createDamageLog(
        actor.id,
        target.id,
        damageResult.finalDamage,
        `${actor.name} strikes ${targetName} for ${damageResult.finalDamage} damage and applies poison (${poisonDamage}/turn for ${poisonDuration} turns)!`,
        {
          details: {
            damage: damageResult.finalDamage,
            poisonDamage,
            poisonDuration
          },
          priority: 'high',
          public: true
        }
      ));

      // Apply threat for both damage and poison
      applyThreatForAbility(actor, target, ability, Number(finalDamage) + Number(poisonDamage), 0, systems);

      return true;
    }
  }

  // Just log the damage if poison failed to apply
  const targetName = (target as Player).name || (target as Monster).name;
  log.push(createDamageLog(
    actor.id,
    target.id,
    damageResult.finalDamage,
    `${actor.name} attacks ${targetName} with ${ability['name']} for ${damageResult.finalDamage} damage!`,
    { details: { damage: damageResult.finalDamage }, priority: 'high', public: true }
  ));

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
  _coordinationInfo?: CoordinationInfo
): boolean => {
  if (!actor || !target || !ability) {
    return false;
  }

  // Death mark doesn't do initial damage, just applies the growing poison
  const params = (ability as any).params || {};
  const initialDamage = Number(params.damage) || Number(params.initialDamage) || 30;
  const growthRate = Number(params.growthRate) || 20;
  const duration = Number(params.duration) || 5;

  const statusResult = systems.statusEffectManager?.applyStatusEffect?.(target, {
    id: secureId('death-mark'),
    name: 'deathMark',
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

    log.push(createActionLog(
      actor.id,
      target.id,
      `${actor.name} applies Death Mark to ${targetName} (starts at ${initialDamage} damage/turn, grows by ${growthRate} each turn for ${duration} turns)!`,
      {
        type: 'status',
        details: {
          initialDamage,
          growthRate,
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
 * Handle poison trap - sets a reactive trap that poisons anyone who attacks the caster
 */
export const handlePoisonTrap: AbilityHandler = (
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
  const poisonDamage = Number(params.damage) || Number(params.poisonDamage) || 20;
  const duration = Number(params.duration) || 2;

  // Apply poisonTrap reactive marker on self
  const statusResult = systems.statusEffectManager?.applyStatusEffect?.(actor, {
    id: secureId('poison-trap'),
    name: 'poisonTrap',
    type: 'buff',
    duration,
    params: {
      damagePerTurn: poisonDamage,
      sourceId: actor.id,
      sourceName: actor.name
    }
  }) || { success: false };

  if (statusResult.success) {
    log.push(createActionLog(
      actor.id,
      actor.id,
      `${actor.name} sets a hidden poison trap! Anyone who attacks them will be poisoned for ${poisonDamage} damage/turn for ${duration} turns!`,
      {
        details: { poisonDamage, duration },
        priority: 'high',
        public: true
      }
    ));
    return true;
  }

  return false;
};
