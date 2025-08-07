/**
 * @fileoverview Area of Effect (AOE) attack ability handlers
 * Handles abilities that target multiple enemies with damage
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
 * Handle AOE damage abilities - hits multiple targets
 */
export const handleAoeDamage: AbilityHandler = (
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

  const game = systems.game;
  if (!game) {
    return false;
  }

  // Get base damage and apply coordination bonus
  const baseDamage = Number(ability['damage']) || 0;
  let finalDamage = Number(baseDamage);

  // Apply coordination bonus to base damage
  let coordinationBonus = 0;
  if (coordinationInfo && coordinationInfo.isActive) {
    coordinationBonus = Math.floor(Number(baseDamage) * Number(coordinationInfo.bonusMultiplier));
    finalDamage += Number(coordinationBonus);
  }

  // Apply comeback mechanics if active
  const comebackSystem = systems.comebackMechanics;
  if (comebackSystem && comebackSystem.getBonus) {
    const comebackBonus = Number(comebackSystem.getBonus(actor.id)) || 0;
    if (comebackBonus > 0) {
      finalDamage += Number(comebackBonus);
    }
  }

  // Get potential targets based on ability configuration
  const targets = [];

  // For AOE damage, typically hit all players except self, and potentially the monster
  for (const player of game.players.values()) {
    if (player.id !== actor.id && 
        (player as any).isAlive !== false && 
        (player as any).hp > 0) {
      // Skip invisible players
      if (!(player.statusEffects && (player.statusEffects as any).invisible)) {
        targets.push(player);
      }
    }
  }

  // Add monster if it's alive and ability can target monsters
  if (game.monster && 
      (game.monster as any).isAlive && 
      (game.monster as any).hp > 0) {
    // Most AOE abilities can target the monster unless specifically excluded
    targets.push(game.monster);
  }

  if (targets.length === 0) {
    log.push({
      id: `aoe-no-targets-${Date.now()}`,
      timestamp: Date.now(),
      type: 'action',
      source: actor.id,
      message: `${actor.name} finds no valid targets for ${ability['name']}!`,
      details: { reason: 'no_valid_targets' },
      public: true,
      isPublic: true,
      priority: 'medium'
    });
    return false;
  }

  let totalDamageDealt = 0;
  let hitTargets = 0;

  // Apply damage to multiple targets
  for (const aoeTarget of targets) {
    // Calculate individual damage (may have per-target modifiers)
    const damageModifiers = systems.calculateDamageModifiers?.(actor, aoeTarget, ability) || 1;
    const modifiedDamage = Math.floor(Number(finalDamage) * Number(damageModifiers));

    const damageResult = systems.combatSystem?.applyDamage?.(aoeTarget, modifiedDamage, {
      source: actor.id,
      type: 'magical', // Most AOE abilities are magical
      ability: ability['id'],
      coordinationBonus: Math.floor(Number(coordinationBonus) / Number(targets.length)) // Distribute coordination bonus
    }) || { success: false, finalDamage: 0 };

    if (damageResult.success) {
      totalDamageDealt += Number(damageResult.finalDamage);
      hitTargets++;

      const targetName = (aoeTarget as Player).name || (aoeTarget as Monster).name;
      
      log.push({
        id: `aoe-hit-${Date.now()}-${aoeTarget.id}`,
        timestamp: Date.now(),
        type: 'damage',
        source: actor.id,
        target: aoeTarget.id,
        message: `${actor.name} hits ${targetName} with ${ability['name']} for ${damageResult.finalDamage} damage!`,
        details: {
          damage: damageResult.finalDamage
        },
        public: true,
        isPublic: true,
        priority: 'high'
      });
    }
  }

  if (hitTargets > 0) {
    // Log overall AOE success
    log.push({
      id: `aoe-summary-${Date.now()}`,
      timestamp: Date.now(),
      type: 'action',
      source: actor.id,
      message: `${actor.name} completes ${ability['name']}: ${hitTargets}/${targets.length} targets hit for ${totalDamageDealt} total damage!`,
      details: {
        hitTargets,
        totalTargets: targets.length,
        totalDamageDealt,
        coordinationBonus
      },
      public: true,
      isPublic: true,
      priority: 'high'
    });

    // Apply threat for total AoE damage
    // Use the first target for threat calculation, but account for total damage
    if (targets.length > 0) {
      applyThreatForAbility(actor, targets[0], ability, Number(totalDamageDealt), 0, systems);
    }

    return true;
  }

  return false;
};

/**
 * Handle Inferno Blast - special AOE with potential burn effect
 */
export const handleInfernoBlast: AbilityHandler = (
  actor: Player,
  target: Player | Monster,
  ability: Ability,
  log: LogEntry[],
  systems: GameSystems,
  coordinationInfo?: CoordinationInfo
): boolean => {
  // First deal normal damage with coordination bonuses
  const aoeSuccess = handleAoeDamage(actor, target, ability, log, systems, coordinationInfo);
  
  if (!aoeSuccess) {
    return false;
  }

  // Then apply burn effect to all targets that were hit
  const game = systems.game;
  if (!game) {
    return aoeSuccess; // Return the AOE success even if burn fails
  }

  const burnParams = (ability as any).params || {};
  const burnDamage = Number(burnParams.burnDamage) || 3;
  const burnDuration = Number(burnParams.burnDuration) || 3;

  let burnTargets = 0;

  // Apply burn to all living enemies
  for (const player of game.players.values()) {
    if (player.id !== actor.id && 
        (player as any).isAlive !== false && 
        (player as any).hp > 0) {
      
      const statusResult = systems.statusEffectManager?.applyStatusEffect?.(player, {
        id: `burn-${Date.now()}-${player.id}`,
        name: 'burn',
        type: 'debuff',
        duration: burnDuration,
        params: {
          damagePerTurn: burnDamage,
          sourceId: actor.id,
          sourceName: actor.name
        }
      }) || { success: false };

      if (statusResult.success) {
        burnTargets++;
      }
    }
  }

  if (burnTargets > 0) {
    log.push({
      id: `inferno-burn-${Date.now()}`,
      timestamp: Date.now(),
      type: 'status',
      source: actor.id,
      message: `${actor.name}'s Inferno Blast applies burning to ${burnTargets} targets (${burnDamage} damage/turn for ${burnDuration} turns)!`,
      details: {
        burnTargets,
        burnDamage,
        burnDuration
      },
      public: true,
      isPublic: true,
      priority: 'medium'
    });
  }

  return true;
};