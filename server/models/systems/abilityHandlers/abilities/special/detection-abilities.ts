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
      source: actor['id'],
      target: target['id'],
      message: messages.getAbilityMessage('eye_of_fate', 'warlock_detected') || 'Warlock detected!',
      details: { 
        detectedWarlock: true,
        targetId: target['id'] 
      },
      public: true,
      priority: 'critical'
    });

    // Add private message to actor with more details
    log.push({
      id: `eye-of-fate-private-${Date.now()}`,
      timestamp: Date.now(),
      type: 'action',
      source: actor['id'],
      target: target['id'],
      message: 'Target is a Warlock!',
      details: { 
        isPrivate: true,
        recipientId: actor['id'],
        detectedRole: 'Warlock'
      },
      public: false,
      priority: 'critical'
    });
  } else {
    // Not a warlock
    log.push({
      id: `eye-of-fate-not-warlock-${Date.now()}`,
      timestamp: Date.now(),
      type: 'action',
      source: actor['id'],
      target: target['id'],
      message: messages.getAbilityMessage('eye_of_fate', 'not_warlock') || 'No warlock detected.',
      details: { 
        detectedWarlock: false,
        targetId: target['id'] 
      },
      public: true,
      priority: 'high'
    });

    // Private confirmation to actor
    log.push({
      id: `eye-of-fate-private-clear-${Date.now()}`,
      timestamp: Date.now(),
      type: 'action',
      source: actor['id'],
      target: target['id'],
      message: 'Target is not a Warlock.',
      details: { 
        isPrivate: true,
        recipientId: actor['id'],
        detectedRole: 'Good'
      },
      public: false,
      priority: 'high'
    });
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

  log.push({
    id: `primal-roar-${Date.now()}`,
    timestamp: Date.now(),
    type: 'action',
    source: actor['id'],
    message: messages.getAbilityMessage('primal_roar', 'executed') || 'Primal roar executed!',
    details: { 
      warlocksDetected,
      totalPlayersScanned: targets.length
    },
    public: true,
    priority: 'critical'
  });

  // Private message to actor with specific details
  if (warlocksDetected > 0) {
    log.push({
      id: `primal-roar-private-${Date.now()}`,
      timestamp: Date.now(),
      type: 'action',
      source: actor['id'],
      message: 'Detected warlocks privately',
      details: { 
        isPrivate: true,
        recipientId: actor['id'],
        detectedWarlocks
      },
      public: false,
      priority: 'critical'
    });
  } else {
    log.push({
      id: `primal-roar-private-clear-${Date.now()}`,
      timestamp: Date.now(),
      type: 'action',
      source: actor['id'],
      message: 'No warlocks detected',
      details: { 
        isPrivate: true,
        recipientId: actor['id']
      },
      public: false,
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
        name: (player as any)['name'],
        role
      });
    }
  }

  log.push({
    id: `sanctuary-of-truth-${Date.now()}`,
    timestamp: Date.now(),
    type: 'action',
    source: actor['id'],
    message: messages.getAbilityMessage('sanctuary_of_truth', 'executed') || 'Sanctuary of Truth activated!',
    details: { playerRoles },
    public: true,
    priority: 'critical'
  });

  // Send detailed role information privately to all players
  for (const player of game.players.values()) {
    if ((player as any).isAlive !== false) {
      log.push({
        id: `sanctuary-truth-reveal-${Date.now()}-${(player as any)['id']}`,
        timestamp: Date.now(),
        type: 'action',
        source: actor['id'],
        message: 'All roles revealed to you privately',
        details: { 
          isPrivate: true,
          recipientId: (player as any)['id'],
          revealedRoles: playerRoles
        },
        public: false,
        priority: 'critical'
      });
    }
  }

  return true;
};