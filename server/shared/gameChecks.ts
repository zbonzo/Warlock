/**
 * @fileoverview Shared game check utilities
 * Centralizes common game state validation logic
 */

import {
  validateGame,
  validatePlayer,
  validateGameState,
  validateHost,
} from '../middleware/validation.js';
import gameService from '../services/gameService.js';
import type { GameCode } from '../types/generated.js';

interface Socket {
  id: string;
  playerId?: string;
}

interface GameRoom {
  code: GameCode;
  started: boolean;
  players: any[];
  host?: string;
}

/**
 * Standard validation for most game actions
 */
export function validateGameAction(
  socket: Socket,
  gameCode: GameCode,
  shouldBeStarted: boolean,
  requireHost: boolean = false,
  requirePlayer: boolean = true
): GameRoom {
  // Validate game exists
  validateGame(socket, gameCode);

  // Validate game state
  validateGameState(socket, gameCode, shouldBeStarted);

  // Only validate player membership if required
  if (requirePlayer) {
    validatePlayer(socket, gameCode);
  }

  // Validate host privileges if required
  if (requireHost) {
    validateHost(socket, gameCode);
  }

  // Return the game object for convenience
  return gameService.games.get(gameCode);
}

export default {
  validateGameAction,
};