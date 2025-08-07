/**
 * @fileoverview Basic attack ability handler
 * Handles standard single-target damage abilities
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
import GameStateUtils from '../../../GameStateUtils.js';

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
    log.push({
      id: `attack-error-${Date.now()}`,
      timestamp: Date.now(),
      type: 'system',
      source: 'system',
      message: 'Invalid attack parameters',
      details: { actor: actor?.id, target: target?.id, ability: ability?.id },
      public: false,
      isPublic: false,
      priority: 'high'
    });
    return false;
  }

  const game = systems.game;
  if (!game) {
    return false;
  }

  // If target is a player (not monster) and is invisible, attack should fail
  if (target.hasOwnProperty('isAlive') && (target as any)['statusEffects']) {
    const targetPlayer = target as Player;
    if (targetPlayer.statusEffects && (targetPlayer.statusEffects as any)['invisible']) {
      log.push({
        id: `attack-invisible-${Date.now()}`,
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
    
    log.push({
      id: `coordination-bonus-${Date.now()}`,
      timestamp: Date.now(),
      type: 'action',
      source: actor.id,
      message: `${actor.name} receives coordination bonus: +${coordinationBonus} damage`,
      details: { 
        coordinationBonus,
        baseBonus: coordinationInfo.bonusMultiplier,
        participants: coordinationInfo.participantNames 
      },
      public: true,
      isPublic: true,
      priority: 'medium'
    });
  }

  // Apply comeback mechanics if active
  const comebackSystem = systems.comebackMechanics;
  if (comebackSystem?.getBonus) {
    const comebackBonus = Number(comebackSystem.getBonus(actor.id)) || 0;
    if (comebackBonus > 0) {
      finalDamage += Number(comebackBonus);
      
      log.push({
        id: `comeback-bonus-${Date.now()}`,
        timestamp: Date.now(),
        type: 'action',
        source: actor.id,
        message: `${actor.name} gets comeback bonus: +${comebackBonus} damage`,
        details: { comebackBonus },
        public: true,
        isPublic: true,
        priority: 'medium'
      });
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
    log.push({
      id: `attack-failed-${Date.now()}`,
      timestamp: Date.now(),
      type: 'system',
      source: actor.id,
      target: target.id,
      message: 'Attack failed to apply damage',
      details: { error: damageResult.error },
      public: false,
      isPublic: false,
      priority: 'high'
    });
    return false;
  }

  // Log the successful attack
  const targetName = (target as Player).name || (target as Monster).name;
  log.push({
    id: `attack-success-${Date.now()}`,
    timestamp: Date.now(),
    type: 'damage',
    source: actor.id,
    target: target.id,
    message: `${actor.name} attacks ${targetName} with ${ability['name']} for ${damageResult.finalDamage} damage!`,
    details: {
      baseDamage,
      finalDamage: damageResult.finalDamage,
      coordinationBonus,
      modifiers: damageModifiers
    },
    public: true,
    isPublic: true,
    priority: 'high'
  });

  // Apply threat for this action
  applyThreatForAbility(actor, target, ability, Number(finalDamage), 0, systems);

  return true;
};