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
  if (Object.prototype.hasOwnProperty.call(target, 'isAlive') && (target as any)['statusEffects']) {
    const targetPlayer = target as Player;
    if (targetPlayer.statusEffects && (targetPlayer.statusEffects as any)['invisible']) {
      log.push(createActionLog(
        actor.id,
        target.id,
        `${actor.name} attacks ${(target as Player).name} but misses due to invisibility!`,
        { details: { reason: 'target_invisible' }, priority: 'medium' }
      ));
      return false;
    }
  }

  // Calculate base damage
  const baseDamage = Number(ability['damage']) || 0;

  // Apply actor's damage modifiers (race, class, level, etc.)
  const damageModifiers = systems.calculateDamageModifiers?.(actor, target, ability) || 0;

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

  // Apply damage modifiers
  finalDamage = Math.floor(Number(finalDamage) * Number(damageModifiers || 1));

  // Apply the damage
  const damageResult = systems.combatSystem?.applyDamage?.(target, finalDamage, {
    source: actor.id,
    type: 'physical',
    ability: ability['id'],
    coordinationBonus
  }) || { success: true, finalDamage, error: null };

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
        modifiers: damageModifiers
      },
      priority: 'high'
    }
  ));

  // Apply threat for this action
  applyThreatForAbility(actor, target, ability, Number(finalDamage), 0, systems);

  return true;
};
