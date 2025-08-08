/**
 * @fileoverview Special attack ability handlers
 * Handles unique attack abilities with special mechanics
 */

import { secureId } from '../../../../../utils/secureRandom.js';
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
 * Handle vulnerability strike - attack that applies vulnerability status
 */
export const handleVulnerabilityStrike: AbilityHandler = (
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

  // First deal normal damage with coordination bonuses
  const baseDamage = Number(ability['damage']) || 0;
  let finalDamage: number = Number(baseDamage);

  if (coordinationInfo?.isActive) {
    const coordinationBonus = Math.floor(Number(baseDamage) * Number(coordinationInfo.bonusMultiplier || 1));
    finalDamage += Number(coordinationBonus);
  }

  const damageResult = systems.combatSystem?.applyDamage?.(target, finalDamage, {
    source: actor.id,
    type: 'physical',
    ability: ability['id']
  }) || { success: false, finalDamage: 0 };

  if (!damageResult.success) {
    return false;
  }

  // If attack successful and target is a player, apply vulnerability
  if ((target as any).hasOwnProperty('isAlive') && (target as any).hp > 0) {
    const vulnParams = (ability as any).params || {};
    const vulnerabilityMultiplier = Number(vulnParams.vulnerabilityMultiplier) || 1.5;
    const duration = Number(vulnParams.duration) || 2;

    const statusResult = systems.statusEffectManager?.applyStatusEffect?.(target, {
      id: secureId('vulnerability'),
      name: 'vulnerable',
      type: 'debuff',
      duration,
      params: {
        damageMultiplier: vulnerabilityMultiplier,
        sourceId: actor.id,
        sourceName: actor.name
      }
    }) || { success: false };

    if (statusResult.success) {
      const targetName = (target as Player).name || (target as Monster).name;

      log.push({
        id: secureId('vulnerability-strike-success'),
        timestamp: Date.now(),
        type: 'damage',
        source: actor.id,
        target: target.id,
        message: `${actor.name} strikes ${targetName} for ${damageResult.finalDamage} damage and applies vulnerability (${vulnerabilityMultiplier}x damage for ${duration} turns)!`,
        details: {
          damage: damageResult.finalDamage,
          vulnerabilityMultiplier,
          duration
        },
        public: true,
        isPublic: true,
        priority: 'high'
      });

      applyThreatForAbility(actor, target, ability, Number(finalDamage), 0, systems);
      return true;
    }
  }

  // Just log the damage if vulnerability failed
  const targetName = (target as Player).name || (target as Monster).name;
  log.push({
    id: secureId('vulnerability-strike-partial'),
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
 * Handle reckless strike - high damage attack that damages the user
 */
export const handleRecklessStrike: AbilityHandler = (
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

  // Check if target is invisible first
  if ((target as any).statusEffects && (target as any).statusEffects.invisible) {
    log.push({
      id: secureId('reckless-strike-invisible'),
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

  const params = (ability as any).params || {};
  const selfDamage = Number(params.selfDamage) || Math.floor(Number(ability['damage']) * 0.3);

  // Apply self-damage BEFORE the attack (to show the commitment)
  const selfDamageResult = systems.combatSystem?.applyDamage?.(actor, selfDamage, {
    source: actor.id,
    type: 'true', // True damage bypasses armor
    ability: ability['id'],
    isSelfDamage: true
  }) || { success: false, finalDamage: 0 };

  if (selfDamageResult.success) {
    log.push({
      id: secureId('reckless-strike-self-damage'),
      timestamp: Date.now(),
      type: 'damage',
      source: actor.id,
      target: actor.id,
      message: `${actor.name} takes ${selfDamageResult.finalDamage} self-damage for Reckless Strike!`,
      details: { selfDamage: selfDamageResult.finalDamage },
      public: true,
      isPublic: true,
      priority: 'medium'
    });
  }

  // Now perform the attack with coordination bonuses
  const baseDamage = Number(ability['damage']) || 0;
  let finalDamage: number = Number(baseDamage);

  // Apply coordination bonus
  if (coordinationInfo?.isActive) {
    const coordinationBonus = Math.floor(Number(baseDamage) * Number(coordinationInfo.bonusMultiplier || 1));
    finalDamage += Number(coordinationBonus);
  }

  // Reckless strike gets extra damage bonus
  const recklessBonus = Number(params.damageBonus) || Math.floor(Number(baseDamage) * 0.5);
  finalDamage += Number(recklessBonus);

  // Apply damage modifiers
  const damageModifiers = systems.calculateDamageModifiers?.(actor, target, ability) || 1;
  finalDamage = Math.floor(Number(finalDamage) * Number(damageModifiers));

  const damageResult = systems.combatSystem?.applyDamage?.(target, finalDamage, {
    source: actor.id,
    type: 'physical',
    ability: ability['id']
  }) || { success: false, finalDamage: 0 };

  if (damageResult.success) {
    const targetName = (target as Player).name || (target as Monster).name;

    log.push({
      id: secureId('reckless-strike-success'),
      timestamp: Date.now(),
      type: 'damage',
      source: actor.id,
      target: target.id,
      message: `${actor.name} recklessly strikes ${targetName} for ${damageResult.finalDamage} damage (bonus: +${recklessBonus})!`,
      details: {
        damage: damageResult.finalDamage,
        recklessBonus,
        selfDamage: selfDamageResult.finalDamage
      },
      public: true,
      isPublic: true,
      priority: 'high'
    });

    applyThreatForAbility(actor, target, ability, Number(finalDamage), 0, systems);
    return true;
  }

  return false;
};

/**
 * Handle barbed arrow - attack with bleeding effect
 */
export const handleBarbedArrow: AbilityHandler = (
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

  // Standard attack with coordination bonus
  const baseDamage = Number(ability['damage']) || 0;
  let finalDamage: number = Number(baseDamage);

  if (coordinationInfo?.isActive) {
    finalDamage += Math.floor(Number(baseDamage) * Number(coordinationInfo.bonusMultiplier || 1));
  }

  const damageResult = systems.combatSystem?.applyDamage?.(target, finalDamage, {
    source: actor.id,
    type: 'physical',
    ability: ability['id']
  }) || { success: false, finalDamage: 0 };

  if (!damageResult.success) {
    return false;
  }

  // Apply bleeding effect
  const params = (ability as any).params || {};
  const bleedDamage = Number(params.bleedDamage) || 3;
  const bleedDuration = Number(params.bleedDuration) || 4;

  if ((target as any).hp > 0) {
    const statusResult = systems.statusEffectManager?.applyStatusEffect?.(target, {
      id: secureId('bleeding'),
      name: 'bleeding',
      type: 'debuff',
      duration: bleedDuration,
      params: {
        damagePerTurn: bleedDamage,
        sourceId: actor.id,
        sourceName: actor.name
      }
    }) || { success: false };

    if (statusResult.success) {
      const targetName = (target as Player).name || (target as Monster).name;

      log.push({
        id: secureId('barbed-arrow-success'),
        timestamp: Date.now(),
        type: 'damage',
        source: actor.id,
        target: target.id,
        message: `${actor.name} hits ${targetName} with Barbed Arrow for ${damageResult.finalDamage} damage and applies bleeding (${bleedDamage}/turn for ${bleedDuration} turns)!`,
        details: {
          damage: damageResult.finalDamage,
          bleedDamage,
          bleedDuration
        },
        public: true,
        isPublic: true,
        priority: 'high'
      });

      applyThreatForAbility(actor, target, ability, Number(finalDamage) + Number(bleedDamage), 0, systems);
      return true;
    }
  }

  // Just log the damage if bleeding failed
  const targetName = (target as Player).name || (target as Monster).name;
  log.push({
    id: secureId('barbed-arrow-partial'),
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
 * Handle pyroblast - high damage fire attack with burn
 */
export const handlePyroblast: AbilityHandler = (
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

  // High damage fire attack
  const baseDamage = Number(ability['damage']) || 0;
  let finalDamage: number = Number(baseDamage);

  if (coordinationInfo?.isActive) {
    finalDamage += Math.floor(Number(baseDamage) * Number(coordinationInfo.bonusMultiplier || 1));
  }

  const damageResult = systems.combatSystem?.applyDamage?.(target, finalDamage, {
    source: actor.id,
    type: 'magical',
    ability: ability['id']
  }) || { success: false, finalDamage: 0 };

  if (!damageResult.success) {
    return false;
  }

  let appliedBurn = false;

  // Apply burn effect if target survives
  if ((target as any).hp > 0) {
    const params = (ability as any).params || {};
    const burnDamage = Number(params.burnDamage) || 4;
    const burnDuration = Number(params.burnDuration) || 3;

    const statusResult = systems.statusEffectManager?.applyStatusEffect?.(target, {
      id: secureId('burn'),
      name: 'burn',
      type: 'debuff',
      duration: burnDuration,
      params: {
        damagePerTurn: burnDamage,
        sourceId: actor.id,
        sourceName: actor.name
      }
    }) || { success: false };

    appliedBurn = statusResult.success;
  }

  const targetName = (target as Player).name || (target as Monster).name;

  log.push({
    id: secureId('pyroblast-success'),
    timestamp: Date.now(),
    type: 'damage',
    source: actor.id,
    target: target.id,
    message: appliedBurn
      ? `${actor.name} blasts ${targetName} with Pyroblast for ${damageResult.finalDamage} damage and sets them on fire!`
      : `${actor.name} blasts ${targetName} with Pyroblast for ${damageResult.finalDamage} damage!`,
    details: {
      damage: damageResult.finalDamage,
      appliedBurn
    },
    public: true,
    isPublic: true,
    priority: 'high'
  });

  applyThreatForAbility(actor, target, ability, Number(finalDamage), 0, systems);
  return true;
};
