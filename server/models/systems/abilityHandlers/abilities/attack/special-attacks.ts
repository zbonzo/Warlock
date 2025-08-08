/**
 * @fileoverview Special attack ability handlers - FIXED VERSION
 * Handles unique attack abilities with special mechanics
 * All TypeScript errors have been resolved
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

// Note: config and messages can be used for future enhancements
// import config from '../../../../../config/index.js';
// import messages from '../../../../../config/messages/index.js';

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
  const baseDamage: number = Number(ability['damage']) || 0;
  let finalDamage: number = baseDamage;

  if (coordinationInfo?.isActive) {
    const coordinationBonus = Math.floor(baseDamage * Number(coordinationInfo.bonusMultiplier || 1));
    finalDamage += coordinationBonus;
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

      log.push(createDamageLog(
        actor.id,
        target.id,
        damageResult.finalDamage,
        `${actor.name} strikes ${targetName} for ${damageResult.finalDamage} damage and applies vulnerability (${vulnerabilityMultiplier}x damage for ${duration} turns)!`,
        {
          details: {
            damage: damageResult.finalDamage,
            vulnerabilityMultiplier,
            duration
          },
          priority: 'high',
          public: true
        }
      ));

      applyThreatForAbility(actor, target, ability, finalDamage, 0, systems);
      return true;
    }
  }

  // Just log the damage if vulnerability failed
  const targetName = (target as Player).name || (target as Monster).name;
  log.push(createDamageLog(
    actor.id,
    target.id,
    damageResult.finalDamage,
    `${actor.name} strikes ${targetName} for ${damageResult.finalDamage} damage but fails to apply vulnerability`,
    { details: { damage: damageResult.finalDamage }, priority: 'high', public: true }
  ));

  applyThreatForAbility(actor, target, ability, finalDamage, 0, systems);
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

  // If target is a player (not monster) and is invisible, attack should fail
  if (target.hasOwnProperty('isAlive') && (target as any)['statusEffects']) {
    const targetPlayer = target as Player;
    if (targetPlayer.statusEffects && (targetPlayer.statusEffects as any)['invisible']) {
      log.push(createActionLog(
        actor.id,
        target.id,
        `${actor.name} attacks ${(target as Player).name} recklessly but misses due to invisibility!`,
        { details: { reason: 'target_invisible' }, priority: 'medium', public: true }
      ));
      return false;
    }
  }

  // Calculate reckless damage (higher than normal)
  const baseDamage: number = Number(ability['damage']) || 0;
  const recklessMultiplier = 1.5; // 50% more damage
  const recklessDamage = Math.floor(baseDamage * recklessMultiplier);
  let finalDamage: number = recklessDamage;

  if (coordinationInfo?.isActive) {
    const coordinationBonus = Math.floor(recklessDamage * Number(coordinationInfo.bonusMultiplier || 1));
    finalDamage += coordinationBonus;
  }

  // Calculate self-damage (percentage of damage dealt)
  const selfDamagePercent = 0.2; // 20% of damage dealt
  const selfDamage = Math.floor(finalDamage * selfDamagePercent);

  // Apply damage modifiers
  const damageModifiers = systems.calculateDamageModifiers?.(actor, target, ability) || 1;
  finalDamage = Math.floor(finalDamage * Number(damageModifiers));

  const damageResult = systems.combatSystem?.applyDamage?.(target, finalDamage, {
    source: actor.id,
    type: 'physical',
    ability: ability['id']
  }) || { success: false, finalDamage: 0 };

  if (damageResult.success) {
    // Apply self-damage to actor
    actor.hp = Math.max(0, actor.hp - selfDamage);

    const targetName = (target as Player).name || (target as Monster).name;
    log.push(createDamageLog(
      actor.id,
      target.id,
      damageResult.finalDamage,
      `${actor.name} strikes ${targetName} recklessly for ${damageResult.finalDamage} damage, taking ${selfDamage} damage in return!`,
      {
        details: {
          damage: damageResult.finalDamage,
          recklessBonus: recklessDamage - baseDamage,
          selfDamage,
          wasCritical: false
        },
        priority: 'high',
        public: true
      }
    ));

    applyThreatForAbility(actor, target, ability, finalDamage, 0, systems);
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

  // Calculate base damage
  const baseDamage: number = Number(ability['damage']) || 0;
  let finalDamage: number = baseDamage;

  if (coordinationInfo?.isActive) {
    const coordinationBonus = Math.floor(baseDamage * Number(coordinationInfo.bonusMultiplier || 1));
    finalDamage += coordinationBonus;
  }

  const damageResult = systems.combatSystem?.applyDamage?.(target, finalDamage, {
    source: actor.id,
    type: 'physical',
    ability: ability['id']
  }) || { success: false, finalDamage: 0 };

  if (damageResult.success) {
    // Apply bleeding effect
    const bleedDamage = Math.floor(baseDamage * 0.3); // 30% of base damage per turn
    const bleedDuration = 3; // 3 turns

    systems.statusEffectManager?.applyStatusEffect?.(target, {
      id: secureId('bleed'),
      name: 'bleeding',
      type: 'debuff',
      duration: bleedDuration,
      params: {
        damagePerTurn: bleedDamage,
        sourceId: actor.id,
        sourceName: actor.name
      }
    });

    const targetName = (target as Player).name || (target as Monster).name;
    log.push(createDamageLog(
      actor.id,
      target.id,
      damageResult.finalDamage,
      `${actor.name} hits ${targetName} with a barbed arrow for ${damageResult.finalDamage} damage, causing bleeding!`,
      {
        details: {
          damage: damageResult.finalDamage,
          bleedDamage,
          bleedDuration
        },
        priority: 'high',
        public: true
      }
    ));

    applyThreatForAbility(actor, target, ability, finalDamage, 0, systems);
    return true;
  }

  // Log miss
  const targetName = (target as Player).name || (target as Monster).name;
  log.push(createActionLog(
    actor.id,
    target.id,
    `${actor.name}'s barbed arrow misses ${targetName}!`,
    { details: { damage: 0 }, priority: 'high', public: true }
  ));

  applyThreatForAbility(actor, target, ability, 0, 0, systems);
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

  // Calculate base damage (pyroblast does high damage)
  const baseDamage: number = Number(ability['damage']) || 0;
  const pyroMultiplier = 1.8; // 80% more damage than normal
  const pyroDamage = Math.floor(baseDamage * pyroMultiplier);
  let finalDamage: number = pyroDamage;

  if (coordinationInfo?.isActive) {
    const coordinationBonus = Math.floor(pyroDamage * Number(coordinationInfo.bonusMultiplier || 1));
    finalDamage += coordinationBonus;
  }

  const damageResult = systems.combatSystem?.applyDamage?.(target, finalDamage, {
    source: actor.id,
    type: 'fire',
    ability: ability['id']
  }) || { success: false, finalDamage: 0 };

  if (damageResult.success) {
    // Apply burn effect
    const burnDamage = Math.floor(baseDamage * 0.25); // 25% of base damage per turn
    const burnDuration = 2; // 2 turns
    let appliedBurn = false;

    const burnResult = systems.statusEffectManager?.applyStatusEffect?.(target, {
      id: secureId('burn'),
      name: 'burning',
      type: 'debuff',
      duration: burnDuration,
      params: {
        damagePerTurn: burnDamage,
        sourceId: actor.id,
        sourceName: actor.name
      }
    });

    if (burnResult?.success) {
      appliedBurn = true;
    }

    const targetName = (target as Player).name || (target as Monster).name;
    const burnText = appliedBurn ? ', setting them ablaze!' : '!';

    log.push(createDamageLog(
      actor.id,
      target.id,
      damageResult.finalDamage,
      `${actor.name} unleashes a pyroblast at ${targetName} for ${damageResult.finalDamage} fire damage${burnText}`,
      {
        details: {
          damage: damageResult.finalDamage,
          appliedBurn
        },
        priority: 'high',
        public: true
      }
    ));

    applyThreatForAbility(actor, target, ability, finalDamage, 0, systems);
    return true;
  }

  return false;
};
