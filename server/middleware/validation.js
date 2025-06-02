/**
 * @fileoverview Validation middleware for socket events
 * Centralizes input validation logic with consistent error handling
 */
const { games } = require('../services/gameService');
const { throwValidationError, throwPermissionError, throwNotFoundError, throwGameStateError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

/**
 * Validate and sanitize strings
 * @param {string} str - String to validate
 * @param {number} maxLength - Maximum allowed length
 * @returns {boolean} Whether the string is valid
 */
const validateString = (str, maxLength = 30) => {
  if (!str || typeof str !== 'string') return false;
  const sanitized = str.replace(/[<>{}();]/g, '').trim();
  return sanitized.length > 0 && sanitized.length <= maxLength;
};

/**
 * Validate game code format
 * @param {string} code - Game code to validate
 * @returns {boolean} Whether the code format is valid
 */
const validateGameCode = (code) => {
  if (!code || typeof code !== 'string') return false;
  return /^\d{4}$/.test(code);
};

/**
 * Validate that a game exists
 * @param {Object} socket - Client socket
 * @param {string} gameCode - Game code to validate
 * @returns {boolean} Whether the game exists
 */
const validateGame = (socket, gameCode) => {
  if (!validateGameCode(gameCode)) {
    logger.warn(`Invalid game code format: ${gameCode} from ${socket.id}`);
    throwValidationError('Invalid game code format. Please enter a 4-digit code.');
  }
  
  const game = games.get(gameCode);
  if (!game) {
    logger.info(`Game not found: ${gameCode} from ${socket.id}`);
    throwNotFoundError('Game not found. Check the code and try again.');
  }
  return true;
};

/**
 * Validate player name
 * @param {Object} socket - Client socket
 * @param {string} playerName - Name to validate
 * @returns {boolean} Whether the name is valid
 */
const validatePlayerName = (socket, playerName) => {
  if (!validateString(playerName, 20)) {
    logger.warn(`Invalid player name from ${socket.id}: ${playerName}`);
    throwValidationError('Invalid player name. Please use 1-20 alphanumeric characters.');
  }
  return true;
};

/**
 * Validate that a player exists in a game
 * @param {Object} socket - Client socket
 * @param {string} gameCode - Game code
 * @returns {boolean} Whether the player exists in the game
 */
const validatePlayer = (socket, gameCode) => {
  const game = games.get(gameCode);
  if (!game.players.has(socket.id)) {
    logger.warn(`Player not in game: ${socket.id} in game ${gameCode}`);
    throwPermissionError('You are not a player in this game.');
  }
  return true;
};

/**
 * Validate game state
 * @param {Object} socket - Client socket
 * @param {string} gameCode - Game code
 * @param {boolean} shouldBeStarted - Expected game state
 * @returns {boolean} Whether the game state is valid
 */
const validateGameState = (socket, gameCode, shouldBeStarted) => {
  const game = games.get(gameCode);
  if (shouldBeStarted && !game.started) {
    throwGameStateError('Game has not started yet.');
  }
  if (!shouldBeStarted && game.started) {
    throwGameStateError('Game has already started.');
  }
  return true;
};

/**
 * Validate host permissions
 * @param {Object} socket - Client socket
 * @param {string} gameCode - Game code
 * @returns {boolean} Whether the client is the host
 */
const validateHost = (socket, gameCode) => {
  const game = games.get(gameCode);
  if (socket.id !== game.hostId) {
    logger.warn(`Non-host action attempt: ${socket.id} in game ${gameCode}`);
    throwPermissionError('Only the host can perform this action.');
  }
  return true;
};

/**
 * Validate action type and target
 * @param {Object} socket - Client socket
 * @param {string} gameCode - Game code
 * @param {string} actionType - Action type
 * @param {string} targetId - Target ID
 * @returns {boolean} Whether the action is valid
 */
const validateAction = (socket, gameCode, actionType, targetId) => {
  const game = games.get(gameCode);
  const player = game.players.get(socket.id);

  // Check if action type is valid for this player
  const validAction = player.unlocked.some(a => a.type === actionType);
  if (!validAction) {
    socket.emit('errorMessage', { message: 'Invalid action type.' });
    return false;
  }

  // Validate target exists
  if (targetId !== '__monster__') {
    if (!game.players.has(targetId) || !game.players.get(targetId).isAlive) {
      socket.emit('errorMessage', { message: 'Invalid target.' });
      return false;
    }
  }

  return true;
};
/**
 * Validate action with cooldown checks
 * @param {Object} socket - Client socket
 * @param {string} gameCode - Game code
 * @param {string} actionType - Action type
 * @param {string} targetId - Target ID
 * @returns {boolean} Whether the action is valid
 */
const validateActionWithCooldown = (socket, gameCode, actionType, targetId) => {
  const game = games.get(gameCode);
  const player = game.players.get(socket.id);

  // Check if action type is valid for this player
  const validAction = player.unlocked.some(a => a.type === actionType);
  if (!validAction) {
    socket.emit('errorMessage', { message: 'Invalid action type.' });
    return false;
  }

  // Check if ability is on cooldown
  if (player.isAbilityOnCooldown && player.isAbilityOnCooldown(actionType)) {
    const cooldownRemaining = player.getAbilityCooldown(actionType);
    socket.emit('errorMessage', { 
      message: `${actionType} is on cooldown for ${cooldownRemaining} more turn${cooldownRemaining > 1 ? 's' : ''}.`
    });
    return false;
  }

  // Validate target exists
  if (targetId !== '__monster__') {
    if (!game.players.has(targetId) || !game.players.get(targetId).isAlive) {
      socket.emit('errorMessage', { message: 'Invalid target.' });
      return false;
    }
  }

  return true;
};

module.exports = {
  validateGame,
  validatePlayer,
  validateGameState,
  validateHost,
  validatePlayerName,
  validateAction: validateActionWithCooldown // Replace the old validateAction
};

