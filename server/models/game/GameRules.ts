/**
 * @fileoverview GameRules domain model - TypeScript migration
 * Manages game rules, validation, and coordination calculations
 * Part of Phase 3: Core Domain Models Migration
 */

import { z } from 'zod';
import config from '../../config/index.js';
import logger from '../../utils/logger.js';
import type { GameCode, Player } from '../../types/generated.js';

// Validation result schema
const ValidationResultSchema = z.object({
  valid: z.boolean(),
  reason: z.string().optional(),
  data: z.any().optional(),
});

// Type definitions
export type ValidationResult = z.infer<typeof ValidationResultSchema>;

export interface GameSystems {
  statusEffectManager: {
    isPlayerStunned(playerId: string): boolean;
  };
}

export interface GameRuleConfig {
  maxPlayers: number;
  minPlayers: number;
  [key: string]: any;
}

/**
 * GameRules class manages game rules and validation logic
 * Extracted from GameRoom to improve separation of concerns
 */
export class GameRules {
  private gameCode: GameCode;

  /**
   * Create a new game rules manager
   * @param gameCode - Game code for logging
   */
  constructor(gameCode: GameCode) {
    this.gameCode = gameCode;
  }

  /**
   * Check if a player can be added to the game
   * @param gameStarted - Whether game has started
   * @param currentPlayerCount - Current number of players
   * @returns Whether player can be added
   */
  canAddPlayer(gameStarted: boolean, currentPlayerCount: number): boolean {
    return !gameStarted && currentPlayerCount < config.maxPlayers;
  }

  /**
   * Validate action submission
   * @param actor - Player performing action
   * @param actionType - Type of action
   * @param targetId - Target of action
   * @param systems - Game systems for validation
   * @returns Validation result
   */
  validateActionSubmission(
    actor: Player,
    actionType: string,
    targetId: string,
    systems: GameSystems
  ): ValidationResult {
    // Basic validation
    if (!actor || actor.status !== 'alive') {
      return ValidationResultSchema.parse({
        valid: false,
        reason: 'Actor not alive'
      });
    }

    if (systems.statusEffectManager.isPlayerStunned(actor.id)) {
      return ValidationResultSchema.parse({
        valid: false,
        reason: 'Actor is stunned'
      });
    }

    // Check if already submitted (this would need to be tracked separately)
    // if (actor.hasSubmittedAction) {
    //   return ValidationResultSchema.parse({
    //     valid: false,
    //     reason: 'Action already submitted'
    //   });
    // }

    return ValidationResultSchema.parse({
      valid: true
    });
  }

  /**
   * Check if game can start
   * @param playerCount - Number of players
   * @param readyCount - Number of ready players
   * @returns Whether game can start
   */
  canStartGame(playerCount: number, readyCount: number): boolean {
    return playerCount >= config.minPlayers && readyCount === playerCount;
  }

  /**
   * Calculate coordination bonus
   * @param actions - Array of coordinated actions
   * @returns Coordination bonus multiplier
   */
  calculateCoordinationBonus(actions: any[]): number {
    if (actions.length < 2) return 1.0;

    // Simple coordination bonus based on number of coordinated actions
    return 1.0 + (actions.length - 1) * 0.1;
  }

  /**
   * Validate target selection
   * @param targetId - Target ID
   * @param availableTargets - Array of available target IDs
   * @returns Whether target is valid
   */
  isValidTarget(targetId: string, availableTargets: string[]): boolean {
    return availableTargets.includes(targetId);
  }

  /**
   * Check if round should end
   * @param alivePlayerCount - Number of alive players
   * @param submittedActionCount - Number of submitted actions
   * @returns Whether round should end
   */
  shouldEndRound(alivePlayerCount: number, submittedActionCount: number): boolean {
    return submittedActionCount >= alivePlayerCount;
  }

  /**
   * Calculate win condition
   * @param alivePlayers - Array of alive players
   * @param monsterHp - Monster HP
   * @returns Win condition result
   */
  checkWinCondition(alivePlayers: Player[], monsterHp: number): {
    gameEnded: boolean;
    winner?: 'Good' | 'Evil' | 'warlocks' | 'innocents';
    reason?: string;
  } {
    // Monster defeated
    if (monsterHp <= 0) {
      return {
        gameEnded: true,
        winner: 'Good',
        reason: 'Monster defeated'
      };
    }

    // No players alive
    if (alivePlayers.length === 0) {
      return {
        gameEnded: true,
        winner: 'Evil',
        reason: 'All players died'
      };
    }

    // Check for warlock victory
    const aliveWarlocks = alivePlayers.filter(p => p.role === 'Warlock');
    const aliveNonWarlocks = alivePlayers.filter(p => p.role !== 'Warlock');

    if (aliveWarlocks.length >= aliveNonWarlocks.length && aliveWarlocks.length > 0) {
      return {
        gameEnded: true,
        winner: 'warlocks',
        reason: 'Warlocks equal or outnumber innocents'
      };
    }

    // Game continues
    return { gameEnded: false };
  }

  /**
   * Type-safe serialization
   * @returns Serializable rules data
   */
  toJSON(): Record<string, any> {
    return {
      gameCode: this.gameCode,
    };
  }

  /**
   * Create GameRules from serialized data
   * @param data - Serialized rules data
   * @returns New GameRules instance
   */
  static fromJSON(data: any): GameRules {
    return new GameRules(data.gameCode);
  }
}

export default GameRules;
