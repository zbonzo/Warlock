/**
 * @fileoverview Multi-hit attack ability handlers
 * Handles abilities that strike the same target multiple times
 */

import { createActionLog, createDamageLog } from '../../../../../utils/logEntry.js';
import { secureRandomChoice } from '../../../../../utils/secureRandom.js';
import type { Player, Monster, Ability } from '../../../../../types/generated.js';
import type {
  AbilityHandler,
  CoordinationInfo,
  LogEntry
} from '../../abilityRegistryUtils.js';
import type { GameSystems } from '../../../SystemsFactory.js';
import { applyThreatForAbility } from '../../abilityRegistryUtils.js';


/**
 * Handle multi-hit attacks - strike the same target multiple times
 */
export const handleMultiHitAttack: AbilityHandler = (
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

  // If target is invisible, attack fails
  if ((target as any).statusEffects && (target as any).statusEffects.invisible) {
    log.push(createActionLog(
      actor.id,
      target.id,
      `${actor.name} attacks ${(target as Player).name} but misses due to invisibility!`,
      { details: { reason: 'target_invisible' }, priority: 'medium', public: true }
    ));
    return false;
  }

  // Get hit parameters
  const abilityParams = (ability as any).params || {};
  const hitCount = Number(abilityParams.hits) || Number(abilityParams.hitCount) || 2;

  const damagePerHit = Number(abilityParams.damage) || Number(abilityParams.damagePerHit) || 10;

  if (hitCount <= 0) {
    return false;
  }

  // Apply actor's damage modifier
  const damageModifiers = systems.calculateDamageModifiers?.(actor, target, ability) || 1;

  // Apply coordination bonus
  let coordinationBonus = 0;
  let coordinationBonusPerHit = 0;

  if (coordinationInfo && coordinationInfo.isActive) {
    coordinationBonus = Math.floor(Number(damagePerHit) * Number(hitCount) * Number(coordinationInfo.bonusMultiplier));
    coordinationBonusPerHit = Math.floor(Number(coordinationBonus) / Number(hitCount));
  }

  // Apply comeback mechanics if active
  let comebackBonus = 0;
  const comebackSystem = systems.comebackMechanics;
  if (comebackSystem && comebackSystem.getBonus) {
    // const totalBaseDamage = Number(damagePerHit) * Number(hitCount); // Unused for now
    comebackBonus = Number(comebackSystem.getBonus(actor.id)) || 0;
  }

  // Announce the multi-hit attack
  const targetName = (target as Player).name || (target as Monster).name;
  log.push(createActionLog(
    actor.id,
    target.id,
    `${actor.name} begins a ${hitCount}-hit attack against ${targetName} with ${ability['name']}!`,
    {
      details: {
        hitCount,
        damagePerHit,
        coordinationBonus
      },
      priority: 'high',
      public: true
    }
  ));

  let totalDamage = 0;
  let successfulHits = 0;
  const hitResults = [];

  // Process each hit
  for (let i = 0; i < hitCount; i++) {
    // Check if target is still alive
    if ((target as any).hp <= 0) {
      log.push(createActionLog(
        actor.id,
        target.id,
        `${targetName} dies after hit ${i + 1}, stopping multi-hit attack with ${hitCount - i - 1} hits remaining!`,
        {
          details: {
            hitNumber: i + 1,
            remainingHits: hitCount - i - 1
          },
          priority: 'medium',
          public: true
        }
      ));
      break;
    }

    // Calculate damage for this hit
    let hitDamage = Number(damagePerHit) + Number(coordinationBonusPerHit);

    // Add comeback bonus (distributed across hits)
    if (comebackBonus > 0) {
      hitDamage += Math.floor(Number(comebackBonus) / Number(hitCount));
    }

    // Apply damage modifiers
    hitDamage = Math.floor(Number(hitDamage) * Number(damageModifiers));

    // Apply the damage
    const damageResult = systems.combatSystem?.applyDamage?.(target, hitDamage, {
      source: actor.id,
      type: 'physical',
      ability: ability['id'],
      coordinationBonus: coordinationBonusPerHit
    }) || { success: false, finalDamage: 0 };

    if (damageResult.success) {
      totalDamage += Number(damageResult.finalDamage);
      successfulHits++;

      hitResults.push({
        hitNumber: i + 1,
        damage: damageResult.finalDamage,
        wasCritical: damageResult.wasCritical || false
      });

      log.push(createDamageLog(
        actor.id,
        target.id,
        damageResult.finalDamage,
        `Hit ${i + 1}: ${actor.name} hits ${targetName} for ${damageResult.finalDamage} damage!`,
        {
          details: {
            hitNumber: i + 1,
            damage: damageResult.finalDamage,
            wasCritical: damageResult.wasCritical || false
          },
          priority: 'medium',
          public: true
        }
      ));
    } else {
      log.push(createActionLog(
        actor.id,
        target.id,
        `Hit ${i + 1}: ${actor.name} misses ${targetName}!`,
        {
          details: { hitNumber: i + 1 },
          priority: 'medium',
          public: true
        }
      ));
    }
  }

  if (successfulHits > 0) {
    // Log the total damage summary
    log.push(createActionLog(
      actor.id,
      target.id,
      `${actor.name} completes ${ability['name']}: ${successfulHits}/${hitCount} hits for ${totalDamage} total damage!`,
      {
        details: {
          totalHits: successfulHits,
          totalPossibleHits: hitCount,
          totalDamage,
          hitResults,
          coordinationBonus
        },
        priority: 'high',
        public: true
      }
    ));

    // Apply threat based on total damage dealt
    applyThreatForAbility(actor, target, ability, Number(totalDamage), 0, systems);

    // Check for warlock conversion on player targets
    if (Object.prototype.hasOwnProperty.call(target, 'isAlive') && Number(totalDamage) >= 20) {
      // Multi-hit attacks with high total damage can trigger warlock conversion
      systems.warlockSystem?.checkWarlockConversion?.(actor, target as Player, {
        trigger: 'high_damage_multi_hit',
        totalDamage: Number(totalDamage)
      });
    }

    return true;
  }

  return false;
};

/**
 * Handle Ricochet Round - bullet bounces from primary target to additional targets
 */
export const handleRicochetRound: AbilityHandler = (
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

  const abilityParams = (ability as any).params || {};
  const baseDamage = Number(abilityParams.damage) || 25;
  const bounceDamageMultiplier = Number(abilityParams.bounceDamageMultiplier) || 0.6;
  const bounceCount = Number(abilityParams.bounceCount) || 1;

  let finalDamage = baseDamage;
  if (coordinationInfo?.isActive) {
    finalDamage += Math.floor(baseDamage * Number(coordinationInfo.bonusMultiplier));
  }

  // Hit primary target
  const primaryResult = systems.combatSystem?.applyDamage?.(target, finalDamage, {
    source: actor.id,
    type: 'physical',
    ability: ability['id']
  }) || { success: false, finalDamage: 0 };

  if (!primaryResult.success) {
    return false;
  }

  const targetName = (target as Player).name || (target as Monster).name;
  log.push(createDamageLog(
    actor.id,
    target.id,
    primaryResult.finalDamage,
    `${actor.name} fires a ricochet shot, hitting ${targetName} for ${primaryResult.finalDamage} damage!`,
    { priority: 'high', public: true }
  ));

  let totalDamage = primaryResult.finalDamage;

  // Bounce to additional random targets
  const game = systems.game;
  if (game && bounceCount > 0) {
    const bounceDamage = Math.floor(finalDamage * bounceDamageMultiplier);
    const potentialBounceTargets = (Array.from(game.players.values()) as Player[]).filter(
      (p: Player) => p.id !== actor.id && p.id !== target.id &&
           (p as any).isAlive !== false && (p as any).hp > 0 &&
           !systems.statusEffectManager?.hasEffect?.(p.id, 'invisible')
    );

    const actualBounces = Math.min(bounceCount, potentialBounceTargets.length);
    const usedTargets = new Set<string>([target.id]);

    for (let i = 0; i < actualBounces; i++) {
      const available = potentialBounceTargets.filter((p: Player) => !usedTargets.has(p.id));
      if (available.length === 0) break;

      const bounceTarget = secureRandomChoice(available) as Player;
      usedTargets.add(bounceTarget.id);

      const bounceResult = systems.combatSystem?.applyDamage?.(bounceTarget, bounceDamage, {
        source: actor.id,
        type: 'physical',
        ability: ability['id']
      }) || { success: false, finalDamage: 0 };

      if (bounceResult.success) {
        totalDamage += bounceResult.finalDamage;
        log.push(createDamageLog(
          actor.id,
          bounceTarget.id,
          bounceResult.finalDamage,
          `The bullet ricochets to ${(bounceTarget as any).name} for ${bounceResult.finalDamage} damage!`,
          { priority: 'medium', public: true }
        ));
      }
    }
  }

  if (totalDamage > 0) {
    log.push(createActionLog(
      actor.id,
      'multiple',
      `${actor.name} completes Ricochet Round for ${totalDamage} total damage!`,
      { details: { totalDamage }, priority: 'high', public: true }
    ));
    applyThreatForAbility(actor, target, ability, totalDamage, 0, systems);
    return true;
  }

  return false;
};
