/**
 * @fileoverview Control and buff ability handlers
 * Handles abilities that control monsters, apply buffs, or manipulate game state
 */

import { createActionLog } from '../../../../../utils/logEntry.js';
import { secureId } from '../../../../../utils/secureRandom.js';
import type { Player as BasePlayer, Monster, Ability as BaseAbility } from '../../../../../types/generated.js';
import type {
  AbilityHandler,
  CoordinationInfo,
  LogEntry
} from '../../abilityRegistryUtils.js';
import type { GameSystems } from '../../../SystemsFactory.js';

// Note: config and messages can be used for future enhancements
// import config from '../../../../../config/index.js';
// import messages from '../../../../../config/messages/index.js';

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
 * Handle Control Monster - take control of the monster
 */
export const handleControlMonster: AbilityHandler = (
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
  if (!game || !game.monster) {
    log.push(createActionLog(
      actor['id'],
      '',
      `${actor['name']} cannot control monster - no monster available`,
      {
        details: { reason: 'no_monster_available' },
        priority: 'medium'
      }
    ));
    return false;
  }

  const monster = game.monster;

  // Check if monster is already controlled
  if ((monster as any).controllerId) {
    log.push(createActionLog(
      actor['id'],
      '',
      `${actor['name']} cannot control monster - already controlled by ${(monster as any).controllerName}`,
      {
        details: {
          reason: 'already_controlled',
          currentController: (monster as any).controllerId
        },
        priority: 'medium'
      }
    ));
    return false;
  }

  // Check if monster is alive
  if (!(monster as any).isAlive || (monster as any).hp <= 0) {
    log.push(createActionLog(
      actor['id'],
      '',
      `${actor['name']} cannot control monster - monster is dead`,
      {
        details: { reason: 'monster_dead' },
        priority: 'medium'
      }
    ));
    return false;
  }

  // Apply monster control
  const params = ability.params || {};
  const controlDuration = params['controlDuration'] || 3;

  // Set control parameters
  (monster as any).controllerId = actor['id'];
  (monster as any).controllerName = actor['name'];
  (monster as any).controlDuration = controlDuration;
  // eslint-disable-next-line no-restricted-syntax
  (monster as any).controlStartTime = Date.now();

  log.push(createActionLog(
    actor['id'],
    monster['id'],
    `${actor['name']} takes control of ${monster['name']} for ${controlDuration} turns`,
    {
      details: {
        controllerId: actor['id'],
        controlDuration,
        monsterLevel: monster['level']
      },
      priority: 'high'
    }
  ));

  // Private instructions to the controller
  log.push(createActionLog(
    actor['id'],
    '',
    `You now control ${monster['name']} for ${controlDuration} turns. Use it wisely!`,
    {
      details: {
        isPrivate: true,
        recipientId: actor['id'],
        controlDuration
      },
      public: false,
      isPublic: false,
      priority: 'high'
    }
  ));

  return true;
};

/**
 * Handle Spirit Guard - protective buff ability
 */
export const handleSpiritGuard: AbilityHandler = (
  actor: Player,
  target: Player | Monster,
  ability: Ability,
  log: LogEntry[],
  systems: GameSystems,
  _coordinationInfo?: CoordinationInfo
): boolean => {
  if (!actor || !target || !ability) {
    return false;
  }

  // Can only target players
  if (!Object.prototype.hasOwnProperty.call(target, 'isAlive')) {
    return false;
  }

  const targetPlayer = target as Player;

  // Check if target is alive
  if ((targetPlayer as any).isAlive === false || (targetPlayer as any).hp <= 0) {
    return false;
  }

  const params = ability.params || {};
  const protectionAmount = params['protectionAmount'] || 20;
  const duration = params['duration'] || 4;

  // Apply spirit guard protection
  const statusResult = systems.statusEffectManager.applyStatusEffect(target, {
    id: secureId('spirit-guard'),
    name: 'spirit_guard',
    type: 'buff',
    duration,
    params: {
      protectionAmount,
      sourceId: actor['id'],
      sourceName: actor['name']
    }
  });

  if (statusResult.success) {
    log.push(createActionLog(
      actor['id'],
      target['id'],
      `${actor['name']} casts spirit guard on ${targetPlayer['name']}, providing ${protectionAmount} protection for ${duration} turns`,
      {
        details: {
          protectionAmount,
          duration
        },
        priority: 'high'
      }
    ));

    return true;
  }

  return false;
};

/**
 * Handle Stun Ability (Entangle) - immobilize target
 */
export const handleStunAbility: AbilityHandler = (
  actor: Player,
  target: Player | Monster,
  ability: Ability,
  log: LogEntry[],
  systems: GameSystems,
  _coordinationInfo?: CoordinationInfo
): boolean => {
  if (!actor || !target || !ability) {
    return false;
  }

  // Check if target can be stunned
  if ((target as any).hp <= 0) {
    return false;
  }

  const params = ability.params || {};
  const stunDuration = params['stunDuration'] || 2;

  // Apply stun effect
  const statusResult = systems.statusEffectManager.applyStatusEffect(target, {
    id: secureId('stunned'),
    name: 'stunned',
    type: 'debuff',
    duration: stunDuration,
    params: {
      sourceId: actor['id'],
      sourceName: actor['name']
    }
  });

  if (statusResult.success) {
    const targetName = (target as Player)['name'] || (target as Monster)['name'];

    log.push(createActionLog(
      actor['id'],
      target['id'],
      `${actor['name']} stuns ${targetName} with ${ability['name']} for ${stunDuration} turns`,
      {
        type: 'status',
        details: {
          stunDuration,
          effectName: 'stunned'
        },
        priority: 'high'
      }
    ));

    return true;
  }

  return false;
};
