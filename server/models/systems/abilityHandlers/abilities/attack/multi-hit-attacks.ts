/**
 * @fileoverview Multi-hit attack ability handlers
 * Handles abilities that strike the same target multiple times
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
    log.push({
      id: `multi-hit-invisible-${Date.now()}`,
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

  // Get hit parameters
  const abilityParams = (ability as any).params || {};
  const hitCount = Number(abilityParams.hitCount) || 2;
  
  // Use damage parameter for single-target, damagePerHit for multi-target
  const damagePerHit = Number(abilityParams.damagePerHit) || Number(ability['damage']) || 10;
  
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
    const totalBaseDamage = Number(damagePerHit) * Number(hitCount);
    comebackBonus = Number(comebackSystem.getBonus(actor.id)) || 0;
  }

  // Announce the multi-hit attack
  const targetName = (target as Player).name || (target as Monster).name;
  log.push({
    id: `multi-hit-start-${Date.now()}`,
    timestamp: Date.now(),
    type: 'action',
    source: actor.id,
    target: target.id,
    message: `${actor.name} begins a ${hitCount}-hit attack against ${targetName} with ${ability['name']}!`,
    details: {
      hitCount,
      damagePerHit,
      coordinationBonus
    },
    public: true,
    isPublic: true,
    priority: 'high'
  });

  let totalDamage = 0;
  let successfulHits = 0;
  const hitResults = [];

  // Process each hit
  for (let i = 0; i < hitCount; i++) {
    // Check if target is still alive
    if ((target as any).hp <= 0) {
      log.push({
        id: `multi-hit-target-dead-${Date.now()}`,
        timestamp: Date.now(),
        type: 'action',
        source: actor.id,
        target: target.id,
        message: `${targetName} dies after hit ${i + 1}, stopping multi-hit attack with ${hitCount - i - 1} hits remaining!`,
        details: {
          hitNumber: i + 1,
          remainingHits: hitCount - i - 1
        },
        public: true,
        isPublic: true,
        priority: 'medium'
      });
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

      log.push({
        id: `multi-hit-${i + 1}-${Date.now()}`,
        timestamp: Date.now(),
        type: 'damage',
        source: actor.id,
        target: target.id,
        message: `Hit ${i + 1}: ${actor.name} hits ${targetName} for ${damageResult.finalDamage} damage!`,
        details: {
          hitNumber: i + 1,
          damage: damageResult.finalDamage,
          wasCritical: damageResult.wasCritical || false
        },
        public: true,
        isPublic: true,
        priority: 'medium'
      });
    } else {
      log.push({
        id: `multi-hit-miss-${i + 1}-${Date.now()}`,
        timestamp: Date.now(),
        type: 'action',
        source: actor.id,
        target: target.id,
        message: `Hit ${i + 1}: ${actor.name} misses ${targetName}!`,
        details: { hitNumber: i + 1 },
        public: true,
        isPublic: true,
        priority: 'medium'
      });
    }
  }

  if (successfulHits > 0) {
    // Log the total damage summary
    log.push({
      id: `multi-hit-summary-${Date.now()}`,
      timestamp: Date.now(),
      type: 'action',
      source: actor.id,
      target: target.id,
      message: `${actor.name} completes ${ability['name']}: ${successfulHits}/${hitCount} hits for ${totalDamage} total damage!`,
      details: {
        totalHits: successfulHits,
        totalPossibleHits: hitCount,
        totalDamage,
        hitResults,
        coordinationBonus
      },
      public: true,
      isPublic: true,
      priority: 'high'
    });

    // Apply threat based on total damage dealt
    applyThreatForAbility(actor, target, ability, Number(totalDamage), 0, systems);

    // Check for warlock conversion on player targets
    if ((target as any).hasOwnProperty('isAlive') && Number(totalDamage) >= 20) {
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