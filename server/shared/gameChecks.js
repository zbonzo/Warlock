/**
 * @fileoverview Shared game check utilities
 * Centralizes common game state validation logic
 */
const { validateGame, validatePlayer, validateGameState, validateHost } = require('../middleware/validation');
const gameService = require('../services/gameService');

/**
 * Standard validation for most game actions
 * @param {Object} socket - Socket.IO socket
 * @param {string} gameCode - Game code to validate
 * @param {boolean} shouldBeStarted - Expected game state
 * @param {boolean} requireHost - Whether the action requires host privileges
 * @param {boolean} requirePlayer - Whether to validate the player is in the game
 * @returns {Object} - The game object if validation passes
 */
function validateGameAction(socket, gameCode, shouldBeStarted, requireHost = false, requirePlayer = true) {
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

module.exports = {
  validateGameAction
};
