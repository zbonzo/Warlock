/**
 * @fileoverview Basic attack ability handler
 * Handles standard single-target damage abilities
 */

import { createErrorLog, createActionLog, createDamageLog } from '../../../../../utils/logEntry.js';
import type { Player, Monster, Ability } from '../../../../../types/generated.js';
import type {
  AbilityHandler,
  CoordinationInfo,
  LogEntry
} from '../../abilityRegistryUtils.js';
import type { GameSystems } from '../../../SystemsFactory.js';
import { applyThreatForAbility } from '../../abilityRegistryUtils.js';
import messages from '../../../../../config/messages/index.js';


/**
 * Handle basic attack abilities - single target damage
 * @param actor - Player using the ability
 * @param target - Target of the ability (Player or Monster)
 * @param ability - The ability being used
 * @param log - Game log array
 * @param systems - Game systems instance
 * @param coordinationInfo - Coordination bonus information
 * @returns Success/failure of the ability
 */
export const handleAttack: AbilityHandler = (
  actor: Player,
  target: Player | Monster,
  ability: Ability,
  log: LogEntry[],
  systems: GameSystems,
  coordinationInfo?: CoordinationInfo
): boolean => {
  if (!actor || !target || !ability) {
    log.push(createErrorLog(
      'Invalid attack parameters',
      { actor: actor?.id, target: target?.id, ability: ability?.id }
    ));
    return false;
  }

  const game = systems.game;
  if (!game) {
    return false;
  }

  // If target is a player (not monster) and is invisible, attack should fail
  if (Object.prototype.hasOwnProperty.call(target, 'isAlive')) {
    if (systems.statusEffectManager?.hasEffect?.(target.id, 'invisible')) {
      log.push(createActionLog(
        actor.id,
        target.id,
        `${actor.name} attacks ${(target as Player).name} but misses due to invisibility!`,
        { details: { reason: 'target_invisible' }, priority: 'medium' }
      ));
      return false;
    }
  }

  // Calculate base damage — config stores damage in ability.params.damage
  const baseDamage = Number((ability as any).params?.damage || ability['damage']) || 0;

  // Use actor's damageMod for scaling
  const damageMod = (actor as any).damageMod || 1.0;

  // Apply coordination bonus BEFORE applying damage
  let finalDamage: number = baseDamage;
  let coordinationBonus: number = 0;

  if (coordinationInfo?.isActive) {
    coordinationBonus = Math.floor(Number(baseDamage) * Number(coordinationInfo.bonusMultiplier || 1));
    finalDamage += Number(coordinationBonus);

    log.push(createActionLog(
      actor.id,
      actor.id,
      `${actor.name} receives coordination bonus: +${coordinationBonus} damage`,
      {
        details: {
          coordinationBonus,
          baseBonus: coordinationInfo.bonusMultiplier,
          participants: coordinationInfo.participantNames
        },
        priority: 'medium'
      }
    ));
  }

  // Apply comeback mechanics if active
  const comebackSystem = systems.comebackMechanics;
  if (comebackSystem?.getBonus) {
    const comebackBonus = Number(comebackSystem.getBonus(actor.id)) || 0;
    if (comebackBonus > 0) {
      finalDamage += Number(comebackBonus);

      log.push(createActionLog(
        actor.id,
        actor.id,
        `${actor.name} gets comeback bonus: +${comebackBonus} damage`,
        { details: { comebackBonus }, priority: 'medium' }
      ));
    }
  }

  // Apply actor's damage modifier
  finalDamage = Math.floor(Number(finalDamage) * damageMod);

  // Apply bloodRage damage bonus if active
  if (systems.statusEffectManager?.hasEffect?.(actor.id, 'bloodRage')) {
    const bloodRageEffects = systems.statusEffectManager?.getEffectsByType?.(actor.id, 'bloodRage') || [];
    const damageBonus = (bloodRageEffects[0]?.params?.['damageBonus'] as number) || 0.4;
    const bonusDamage = Math.floor(finalDamage * damageBonus);
    finalDamage += bonusDamage;
    log.push(createActionLog(
      actor.id,
      actor.id,
      `${actor.name}'s Blood Rage grants +${bonusDamage} bonus damage!`,
      { details: { bonusDamage, damageBonus }, priority: 'medium' }
    ));
  }

  // Apply the damage directly to the target
  let actualDamage = 0;
  if (target && typeof (target as any).takeDamage === 'function') {
    actualDamage = (target as any).takeDamage(finalDamage);
  } else if (target) {
    const currentHp = (target as any).hp || 0;
    const armor = (target as any).armor || 0;
    actualDamage = Math.max(1, finalDamage - armor);
    (target as any).hp = Math.max(0, currentHp - actualDamage);
    if ((target as any).hp <= 0) {
      (target as any).isAlive = false;
    }
  }
  const damageResult = { success: true, finalDamage: actualDamage, error: null };

  if (!damageResult.success) {
    log.push(createErrorLog(
      'Attack failed to apply damage',
      damageResult.error,
      { source: actor.id, target: target.id }
    ));
    return false;
  }

  // Log the successful attack
  const targetName = (target as Player).name || (target as Monster).name;
  log.push(createDamageLog(
    actor.id,
    target.id,
    damageResult.finalDamage,
    `${actor.name} attacks ${targetName} with ${ability['name']} for ${damageResult.finalDamage} damage!`,
    {
      details: {
        baseDamage,
        finalDamage: damageResult.finalDamage,
        coordinationBonus,
        modifiers: damageMod
      },
      priority: 'high'
    }
  ));

  // Apply threat for this action
  applyThreatForAbility(actor, target, ability, Number(finalDamage), 0, systems);

  // Moonbeam (Crestfallen racial passive): when wounded, being attacked reveals the attacker's corruption
  if (
    Object.prototype.hasOwnProperty.call(target, 'isAlive') &&
    (target as Player).race === 'Crestfallen' &&
    typeof (target as any).isMoonbeamActive === 'function' &&
    (target as any).isMoonbeamActive() &&
    actor.id !== target.id
  ) {
    const isAttackerCorrupted = !!(actor as any).isWarlock;
    const template = isAttackerCorrupted
      ? messages.combat.moonbeam.warlockDetected
      : messages.combat.moonbeam.notWarlockDetected;

    log.push(createActionLog(
      target.id,
      actor.id,
      messages.formatMessage(template, { targetName: target.name, attackerName: actor.name }),
      {
        details: { isAttackerCorrupted, attackerId: actor.id },
        priority: 'high',
        public: true,
      }
    ));
  }

  return true;
};
