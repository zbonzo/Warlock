/**
 * @fileoverview Barbarian special ability handlers
 * Handles barbarian-specific abilities like rage, fury, and bloodlust
 */

import { createActionLog, createDamageLog } from '../../../../../utils/logEntry.js';
import { secureId } from '../../../../../utils/secureRandom.js';
import type { Player as BasePlayer, Monster, Ability as BaseAbility } from '../../../../../types/generated.js';
import type {
  AbilityHandler,
  CoordinationInfo,
  LogEntry
} from '../../abilityRegistryUtils.js';
import type { GameSystems } from '../../../SystemsFactory.js';

// Note: config can be used for future enhancements
// import config from '../../../../../config/index.js';

interface Player extends BasePlayer {
  isWarlock?: boolean;
  isAlive?: boolean;
  [key: string]: any;
}

interface Ability extends BaseAbility {
  params?: Record<string, any>;
  [key: string]: any;
}

/**
 * Handle Blood Frenzy - damage boost when low on health
 */
export const handleBloodFrenzy: AbilityHandler = (
  actor: Player,
  target: Player | Monster,
  ability: Ability,
  log: LogEntry[],
  systems: GameSystems,
  _coordinationInfo?: CoordinationInfo
): boolean => {
  if (!actor || !ability) {
    return false;
  }

  // Check if actor is low on health to activate frenzy
  const currentHp = (actor as any).hp || 0;
  const maxHp = (actor as any).maxHp || 100;
  const healthRatio = currentHp / maxHp;

  const params = ability.params || {};
  const healthThreshold = params['healthThreshold'] || 0.3; // 30% health threshold
  const damageBonus = params['damageBonus'] || 1.5; // 50% damage bonus
  const duration = params['duration'] || 5;

  if (healthRatio > healthThreshold) {
    log.push(createActionLog(
      actor['id'],
      '',
      `${actor['name']} cannot enter blood frenzy (health too high: ${Math.round(healthRatio * 100)}%, required: ${Math.round(healthThreshold * 100)}%)`,
      {
        details: {
          currentHealthRatio: healthRatio,
          requiredThreshold: healthThreshold
        },
        priority: 'medium'
      }
    ));
    return false;
  }

  // Apply blood frenzy buff
  const statusResult = systems.statusEffectManager.applyStatusEffect(actor, {
    id: secureId('blood-frenzy'),
    name: 'blood_frenzy',
    type: 'buff',
    duration,
    params: {
      damageBonus,
      sourceId: actor['id'],
      sourceName: actor['name']
    }
  });

  if (statusResult.success) {
    log.push(createActionLog(
      actor['id'],
      '',
      `${actor['name']} enters blood frenzy, gaining +${Math.round((damageBonus - 1) * 100)}% damage for ${duration} turns`,
      {
        details: {
          damageBonus,
          duration,
          healthWhenActivated: healthRatio
        },
        priority: 'high'
      }
    ));

    return true;
  }

  return false;
};

/**
 * Handle Unstoppable Rage - become immune to stuns and debuffs
 */
export const handleUnstoppableRage: AbilityHandler = (
  actor: Player,
  target: Player | Monster,
  ability: Ability,
  log: LogEntry[],
  systems: GameSystems,
  _coordinationInfo?: CoordinationInfo
): boolean => {
  if (!actor || !ability) {
    return false;
  }

  const params = ability.params || {};
  const duration = params['duration'] || 4;
  const damageReduction = params['damageReduction'] || 0.2; // 20% damage reduction

  // Clear existing debuffs
  const clearedEffects = systems.statusEffectManager.clearNegativeEffects(actor);

  // Apply unstoppable rage buff
  const statusResult = systems.statusEffectManager.applyStatusEffect(actor, {
    id: secureId('unstoppable-rage'),
    name: 'unstoppable_rage',
    type: 'buff',
    duration,
    params: {
      damageReduction,
      immuneToDebuffs: true,
      sourceId: actor['id'],
      sourceName: actor['name']
    }
  });

  if (statusResult.success) {
    log.push(createActionLog(
      actor['id'],
      '',
      `${actor['name']} enters unstoppable rage for ${duration} turns, clearing ${clearedEffects.length} debuffs`,
      {
        details: {
          duration,
          damageReduction,
          clearedEffects
        },
        priority: 'high'
      }
    ));

    return true;
  }

  return false;
};

/**
 * Handle Relentless Fury - passive ability that activates on taking damage
 */
export const handleRelentlessFury: AbilityHandler = (
  actor: Player,
  target: Player | Monster,
  ability: Ability,
  log: LogEntry[],
  systems: GameSystems,
  _coordinationInfo?: CoordinationInfo
): boolean => {
  if (!actor || !ability) {
    return false;
  }

  // This is typically a passive ability that would be triggered by the damage system
  // For now, we'll implement it as an activatable buff

  const params = ability.params || {};
  const damagePercentage = params['damagePercentage'] || 0.1; // 10% of damage taken as bonus
  const duration = params['duration'] || 6;

  const statusResult = systems.statusEffectManager.applyStatusEffect(actor, {
    id: secureId('relentless-fury'),
    name: 'relentless_fury',
    type: 'buff',
    duration,
    params: {
      damagePercentage,
      sourceId: actor['id'],
      sourceName: actor['name']
    }
  });

  if (statusResult.success) {
    log.push(createActionLog(
      actor['id'],
      '',
      `${actor['name']} activates relentless fury for ${duration} turns (${Math.round(damagePercentage * 100)}% damage conversion)`,
      {
        details: {
          duration,
          damagePercentage
        },
        priority: 'high'
      }
    ));

    return true;
  }

  return false;
};

/**
 * Handle Thirsty Blade - heal when dealing damage
 */
export const handleThirstyBlade: AbilityHandler = (
  actor: Player,
  target: Player | Monster,
  ability: Ability,
  log: LogEntry[],
  systems: GameSystems,
  _coordinationInfo?: CoordinationInfo
): boolean => {
  if (!actor || !ability) {
    return false;
  }

  const params = ability.params || {};
  const healPercentage = params['healPercentage'] || 0.3; // 30% of damage dealt as healing
  const duration = params['duration'] || 5;

  const statusResult = systems.statusEffectManager.applyStatusEffect(actor, {
    id: secureId('thirsty-blade'),
    name: 'thirsty_blade',
    type: 'buff',
    duration,
    params: {
      healPercentage,
      sourceId: actor['id'],
      sourceName: actor['name']
    }
  });

  if (statusResult.success) {
    log.push(createActionLog(
      actor['id'],
      '',
      `${actor['name']} activates thirsty blade for ${duration} turns (${Math.round(healPercentage * 100)}% lifesteal)`,
      {
        details: {
          duration,
          healPercentage
        },
        priority: 'high'
      }
    ));

    return true;
  }

  return false;
};

/**
 * Handle Sweeping Strike - attack all adjacent enemies
 */
export const handleSweepingStrike: AbilityHandler = (
  actor: Player,
  target: Player | Monster,
  ability: Ability,
  log: LogEntry[],
  systems: GameSystems,
  _coordinationInfo?: CoordinationInfo
): boolean => {
  if (!actor || !ability) {
    return false;
  }

  const game = systems.game;
  if (!game) {
    return false;
  }

  // Get all valid targets (all living enemies)
  const targets = [];

  // Add all living players except the actor
  for (const player of game.players.values()) {
    if ((player as any)['id'] !== (actor as any)['id'] &&
        (player as any).isAlive !== false &&
        (player as any).hp > 0) {
      // Skip invisible players
      if (!((player as any).statusEffects && (player as any).statusEffects.invisible)) {
        targets.push(player);
      }
    }
  }

  // Add monster if alive
  if (game.monster &&
      (game.monster as any).isAlive &&
      (game.monster as any).hp > 0) {
    targets.push(game.monster);
  }

  if (targets.length === 0) {
    return false;
  }

  const baseDamage = ability['damage'] || 0;
  let coordinationBonus = 0;

  if (coordinationInfo && coordinationInfo.isActive) {
    coordinationBonus = Math.floor(baseDamage * Number(coordinationInfo.bonusMultiplier || 1));
  }

  let totalDamage = 0;
  let hitTargets = 0;

  // Attack each target
  for (const sweepTarget of targets) {
    const finalDamage = baseDamage + coordinationBonus;

    const damageResult = systems.combatSystem?.applyDamage?.(sweepTarget, finalDamage, {
      source: actor['id'],
      type: 'physical',
      ability: ability['id']
    }) || { success: false, finalDamage: 0 };

    if (damageResult.success) {
      totalDamage += damageResult.finalDamage;
      hitTargets++;

      const targetName = (sweepTarget as Player)['name'] || (sweepTarget as Monster)['name'];

      log.push(createDamageLog(
        actor['id'],
        sweepTarget['id'],
        damageResult.finalDamage,
        `${actor['name']} hits ${targetName} with sweeping strike for ${damageResult.finalDamage} damage`,
        {
          priority: 'high'
        }
      ));
    }
  }

  if (hitTargets > 0) {
    log.push(createActionLog(
      actor['id'],
      '',
      `${actor['name']} sweeping strike hits ${hitTargets} targets for ${totalDamage} total damage`,
      {
        details: {
          hitTargets,
          totalDamage,
          coordinationBonus
        },
        priority: 'high'
      }
    ));

    return true;
  }

  return false;
};
