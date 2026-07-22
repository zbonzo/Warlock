/**
 * @fileoverview Detection ability handlers
 * Handles abilities that detect warlocks or reveal hidden information
 */

import { createActionLog } from '../../../../../utils/logEntry.js';
import type { Player as BasePlayer, Monster, Ability as BaseAbility } from '../../../../../types/generated.js';
import type {
  AbilityHandler,
  CoordinationInfo,
  LogEntry
} from '../../abilityRegistryUtils.js';
import type { GameSystems } from '../../../SystemsFactory.js';

import messages from '../../../../../config/messages/index.js';

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
 * Handle Eye of Fate - detect warlock ability
 */
export const handleEyeOfFate: AbilityHandler = (
  actor: Player,
  target: Player | Monster,
  ability: Ability,
  log: LogEntry[],
  _systems: GameSystems,
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

  // Check if target is a warlock
  const isTargetWarlock = targetPlayer.isWarlock || false;

  // Generic public message — doesn't reveal the result to other players
  log.push(createActionLog(
    actor['id'],
    target['id'],
    `${actor.name} uses Eye of Fate on ${targetPlayer.name}!`,
    {
      details: {
        targetId: target['id']
      },
      priority: 'medium',
      public: true
    }
  ));

  if (isTargetWarlock) {
    // Private warlock-detected message to actor only
    log.push(createActionLog(
      actor['id'],
      target['id'],
      messages.formatMessage(messages.abilities.special.eyeOfFateWarlockFound, { targetName: targetPlayer.name }),
      {
        details: {
          isPrivate: true,
          recipientId: actor['id'],
          detectedWarlock: true,
          detectedRole: 'Warlock'
        },
        public: false,
        isPublic: false,
        priority: 'high'
      }
    ));
  } else {
    // Private not-warlock message to actor only
    log.push(createActionLog(
      actor['id'],
      target['id'],
      messages.formatMessage(messages.abilities.special.eyeOfFateWarlockNotFound, { targetName: targetPlayer.name }),
      {
        details: {
          isPrivate: true,
          recipientId: actor['id'],
          detectedWarlock: false,
          detectedRole: 'Good'
        },
        public: false,
        isPublic: false,
        priority: 'high'
      }
    ));
  }

  // Track detection for game statistics
  // Note: gameStateManager not available in current systems interface

  return true;
};

/**
 * Handle Primal Roar - area detection ability
 */
export const handlePrimalRoar: AbilityHandler = (
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

  // Primal roar affects all players
  const targets = Array.from(game.players.values()).filter(
    (p: any) => p['id'] !== actor['id'] && p.isAlive !== false
  );

  if (targets.length === 0) {
    return false;
  }

  let warlocksDetected = 0;
  const detectedWarlocks: string[] = [];

  // Check each player
  for (const targetPlayer of targets) {
    if ((targetPlayer as any).isWarlock) {
      warlocksDetected++;
      detectedWarlocks.push((targetPlayer as any)['name']);
    }
  }

  log.push(createActionLog(
    actor['id'],
    '',
    messages.getAbilityMessage('primal_roar', 'executed') || 'Primal roar executed!',
    {
      details: {
        warlocksDetected,
        totalPlayersScanned: targets.length
      },
      priority: 'high'
    }
  ));

  // Private message to actor with specific details
  if (warlocksDetected > 0) {
    log.push(createActionLog(
      actor['id'],
      '',
      'Detected warlocks privately',
      {
        details: {
          isPrivate: true,
          recipientId: actor['id'],
          detectedWarlocks
        },
        public: false,
        isPublic: false,
        priority: 'high'
      }
    ));
  } else {
    log.push(createActionLog(
      actor['id'],
      '',
      'No warlocks detected',
      {
        details: {
          isPrivate: true,
          recipientId: actor['id']
        },
        public: false,
        isPublic: false,
        priority: 'high'
      }
    ));
  }

  return true;
};

/**
 * Handle Sanctuary of Truth - reveals all player roles
 */
export const handleSanctuaryOfTruth: AbilityHandler = (
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

  const playerRoles: Array<{name: string, role: string}> = [];

  // Gather all player roles
  for (const player of game.players.values()) {
    if ((player as any).isAlive !== false) {
      const role = (player as any).isWarlock ? 'Warlock' : 'Good';
      playerRoles.push({
        name: (player as any)['name'],
        role
      });
    }
  }

  log.push(createActionLog(
    actor['id'],
    '',
    messages.getAbilityMessage('sanctuary_of_truth', 'executed') || 'Sanctuary of Truth activated!',
    {
      details: { playerRoles },
      priority: 'high'
    }
  ));

  // Send detailed role information privately to all players
  for (const player of game.players.values()) {
    if ((player as any).isAlive !== false) {
      log.push(createActionLog(
        actor['id'],
        '',
        'All roles revealed to you privately',
        {
          details: {
            isPrivate: true,
            recipientId: (player as any)['id'],
            revealedRoles: playerRoles
          },
          public: false,
          isPublic: false,
          priority: 'high'
        }
      ));
    }
  }

  return true;
};
