/**
 * @fileoverview Detection ability handlers
 * Handles abilities that detect warlocks or reveal hidden information
 */

import type { Player as BasePlayer, Monster, Ability as BaseAbility } from '../../../../../types/generated.js';
import type {
  AbilityHandler,
  CoordinationInfo,
  LogEntry
} from '../../abilityRegistryUtils.js';
import type { GameSystems } from '../../../SystemsFactory.js';

import config from '../../../../../config/index.js';
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
  systems: GameSystems,
  coordinationInfo?: CoordinationInfo
): boolean => {
  if (!actor || !target || !ability) {
    return false;
  }

  // Can only target players
  if (!(target as any).hasOwnProperty('isAlive')) {
    return false;
  }

  const targetPlayer = target as Player;

  // Check if target is a warlock
  const isTargetWarlock = targetPlayer.isWarlock || false;

  if (isTargetWarlock) {
    // Warlock detected!
    log.push({
      id: `eye-of-fate-warlock-detected-${Date.now()}`,
      timestamp: Date.now(),
      type: 'action',
      source: actor.id,
      target: target.id,
      message: messages.getAbilityMessage('eye_of_fate', 'warlock_detected', {
        actor: actor.name,
        target: targetPlayer.name
      }),
      details: { 
        detectedWarlock: true,
        targetId: target.id 
      },
      isPublic: true,
      priority: 'critical'
    });

    // Add private message to actor with more details
    log.push({
      id: `eye-of-fate-private-${Date.now()}`,
      timestamp: Date.now(),
      type: 'action',
      source: actor.id,
      target: target.id,
      message: messages.getPrivateMessage('eye_of_fate_success', {
        target: targetPlayer.name,
        targetRole: 'Warlock'
      }),
      details: { 
        isPrivate: true,
        recipientId: actor.id,
        detectedRole: 'Warlock'
      },
      isPublic: false,
      priority: 'critical'
    });
  } else {
    // Not a warlock
    log.push({
      id: `eye-of-fate-not-warlock-${Date.now()}`,
      timestamp: Date.now(),
      type: 'action',
      source: actor.id,
      target: target.id,
      message: messages.getAbilityMessage('eye_of_fate', 'not_warlock', {
        actor: actor.name,
        target: targetPlayer.name
      }),
      details: { 
        detectedWarlock: false,
        targetId: target.id 
      },
      isPublic: true,
      priority: 'high'
    });

    // Private confirmation to actor
    log.push({
      id: `eye-of-fate-private-clear-${Date.now()}`,
      timestamp: Date.now(),
      type: 'action',
      source: actor.id,
      target: target.id,
      message: messages.getPrivateMessage('eye_of_fate_clear', {
        target: targetPlayer.name
      }),
      details: { 
        isPrivate: true,
        recipientId: actor.id,
        detectedRole: 'Good'
      },
      isPublic: false,
      priority: 'high'
    });
  }

  // Track detection for game statistics
  if (systems.gameStateManager) {
    systems.gameStateManager.recordDetectionAttempt(actor.id, target.id, isTargetWarlock);
  }

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
  coordinationInfo?: CoordinationInfo
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
    p => p.id !== actor.id && (p as any).isAlive !== false
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
      detectedWarlocks.push(targetPlayer.name);
    }
  }

  log.push({
    id: `primal-roar-${Date.now()}`,
    timestamp: Date.now(),
    type: 'action',
    source: actor.id,
    message: messages.getAbilityMessage('primal_roar', 'executed', {
      actor: actor.name,
      warlocksDetected
    }),
    details: { 
      warlocksDetected,
      totalPlayersScanned: targets.length
    },
    isPublic: true,
    priority: 'critical'
  });

  // Private message to actor with specific details
  if (warlocksDetected > 0) {
    log.push({
      id: `primal-roar-private-${Date.now()}`,
      timestamp: Date.now(),
      type: 'action',
      source: actor.id,
      message: messages.getPrivateMessage('primal_roar_results', {
        warlocksDetected,
        warlockNames: detectedWarlocks.join(', ')
      }),
      details: { 
        isPrivate: true,
        recipientId: actor.id,
        detectedWarlocks
      },
      isPublic: false,
      priority: 'critical'
    });
  } else {
    log.push({
      id: `primal-roar-private-clear-${Date.now()}`,
      timestamp: Date.now(),
      type: 'action',
      source: actor.id,
      message: messages.getPrivateMessage('primal_roar_clear'),
      details: { 
        isPrivate: true,
        recipientId: actor.id
      },
      isPublic: false,
      priority: 'high'
    });
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
  coordinationInfo?: CoordinationInfo
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
        name: player.name,
        role
      });
    }
  }

  log.push({
    id: `sanctuary-of-truth-${Date.now()}`,
    timestamp: Date.now(),
    type: 'action',
    source: actor.id,
    message: messages.getAbilityMessage('sanctuary_of_truth', 'executed', {
      actor: actor.name
    }),
    details: { playerRoles },
    isPublic: true,
    priority: 'critical'
  });

  // Send detailed role information privately to all players
  for (const player of game.players.values()) {
    if ((player as any).isAlive !== false) {
      log.push({
        id: `sanctuary-truth-reveal-${Date.now()}-${player.id}`,
        timestamp: Date.now(),
        type: 'action',
        source: actor.id,
        message: messages.getPrivateMessage('sanctuary_truth_revealed', {
          roleList: playerRoles.map(p => `${p.name}: ${p.role}`).join(', ')
        }),
        details: { 
          isPrivate: true,
          recipientId: player.id,
          revealedRoles: playerRoles
        },
        isPublic: false,
        priority: 'critical'
      });
    }
  }

  return true;
};