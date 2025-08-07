/**
 * @fileoverview Basic healing ability handlers
 * Handles standard healing abilities and restoration effects
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
 * Handle basic healing abilities
 */
export const handleHeal: AbilityHandler = (
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

  // Can only heal players
  if (!(target as any).hasOwnProperty('isAlive')) {
    return false;
  }

  const targetPlayer = target as Player;

  // Check if target is alive
  if ((targetPlayer as any).isAlive === false || (targetPlayer as any).hp <= 0) {
    log.push({
      id: `heal-dead-target-${Date.now()}`,
      timestamp: Date.now(),
      type: 'action',
      source: actor.id,
      target: target.id,
      message: `${actor.name} cannot heal ${targetPlayer.name} - target is dead!`,
      details: { reason: 'target_dead' },
      public: true,
      isPublic: true,
      priority: 'medium'
    });
    return false;
  }

  // Calculate base healing
  const baseHealing = Number(ability['healing']) || Number((ability as any).params?.healing) || 20;
  let finalHealing = Number(baseHealing);

  // Apply coordination bonus
  let coordinationBonus = 0;
  if (coordinationInfo && coordinationInfo.isActive) {
    coordinationBonus = Math.floor(Number(baseHealing) * Number(coordinationInfo.bonusMultiplier));
    finalHealing += Number(coordinationBonus);

    log.push({
      id: `heal-coordination-bonus-${Date.now()}`,
      timestamp: Date.now(),
      type: 'action',
      source: actor.id,
      message: `${actor.name} receives coordination bonus: +${coordinationBonus} healing`,
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

  // Apply healing modifiers (class bonuses, equipment, etc.)
  const healingModifiers = systems.calculateDamageModifiers?.(actor, target, ability) || 1;
  finalHealing = Math.floor(Number(finalHealing) * Number(healingModifiers));

  // Apply the healing
  const healingResult = systems.combatSystem?.applyHealing?.(target, finalHealing, {
    source: actor.id,
    type: 'direct',
    ability: ability['id'],
    coordinationBonus
  }) || { success: true, finalHealing: Number(finalHealing), wasOverhealing: false };

  if (healingResult.success) {
    log.push({
      id: `heal-success-${Date.now()}`,
      timestamp: Date.now(),
      type: 'action',
      source: actor.id,
      target: target.id,
      message: `${actor.name} heals ${targetPlayer.name} with ${ability['name']} for ${healingResult.finalHealing} HP!`,
      details: {
        baseHealing,
        finalHealing: healingResult.finalHealing,
        coordinationBonus,
        wasOverhealing: healingResult.wasOverhealing
      },
      public: true,
      isPublic: true,
      priority: 'high'
    });

    // Apply threat for healing (generates some threat for helping)
    applyThreatForAbility(actor, target, ability, 0, Number(healingResult.finalHealing), systems);

    return true;
  }

  return false;
};

/**
 * Handle multi-target healing abilities
 */
export const handleMultiHeal: AbilityHandler = (
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

  // Get all living players
  const targets = Array.from(game.players.values()).filter(
    p => (p as any).isAlive !== false && (p as any).hp > 0
  );

  if (targets.length === 0) {
    return false;
  }

  const baseHealing = Number(ability['healing']) || Number((ability as any).params?.healing) || 15;
  let coordinationBonus = 0;
  
  if (coordinationInfo && coordinationInfo.isActive) {
    coordinationBonus = Math.floor(Number(baseHealing) * Number(coordinationInfo.bonusMultiplier));
  }

  let totalHealingApplied = 0;
  let healedTargets = 0;

  // Apply healing to all targets
  for (const healTarget of targets) {
    let finalHealing = Number(baseHealing) + Number(coordinationBonus);
    
    // Apply healing modifiers for each target
    const healingModifiers = systems.calculateDamageModifiers?.(actor, healTarget as Player, ability) || 1;
    finalHealing = Math.floor(Number(finalHealing) * Number(healingModifiers));

    const healingResult = systems.combatSystem?.applyHealing?.(healTarget as Player, finalHealing, {
      source: actor.id,
      type: 'area',
      ability: ability['id'],
      coordinationBonus: Math.floor(Number(coordinationBonus) / Number(targets.length))
    }) || { success: true, finalHealing: Number(finalHealing), wasOverhealing: false };

    if (healingResult.success) {
      totalHealingApplied += Number(healingResult.finalHealing);
      healedTargets++;

      log.push({
        id: `multi-heal-target-${Date.now()}-${(healTarget as Player).id}`,
        timestamp: Date.now(),
        type: 'action',
        source: actor.id,
        target: (healTarget as Player).id,
        message: `${actor.name} heals ${(healTarget as Player).name} for ${healingResult.finalHealing} HP!`,
        details: {
          healing: healingResult.finalHealing,
          wasOverhealing: healingResult.wasOverhealing
        },
        public: true,
        isPublic: true,
        priority: 'high'
      });
    }
  }

  if (healedTargets > 0) {
    log.push({
      id: `multi-heal-summary-${Date.now()}`,
      timestamp: Date.now(),
      type: 'action',
      source: actor.id,
      message: `${actor.name} completes ${ability['name']}: healed ${healedTargets}/${targets.length} allies for ${totalHealingApplied} total HP!`,
      details: {
        healedTargets,
        totalTargets: targets.length,
        totalHealingApplied,
        coordinationBonus
      },
      public: true,
      isPublic: true,
      priority: 'high'
    });

    return true;
  }

  return false;
};