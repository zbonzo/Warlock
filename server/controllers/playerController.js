// controllers/playerController.js
const gameService = require('../services/gameService');
const { validatePlayerName } = require('../middleware/validation');
const { validateGameAction } = require('../shared/gameChecks');
const logger = require('../utils/logger');
const { throwGameStateError, throwValidationError } = require('../utils/errorHandler');

// Handle player joining a game
function handlePlayerJoin(io, socket, gameCode, playerName) {
    const game = validateGameAction(socket, gameCode, false, false, false);
    
    // Validate player name
    if (!validatePlayerName(socket, playerName)) return false;
    
    // Validate game capacity and player eligibility
    if (!gameService.canPlayerJoinGame(game, socket.id)) return false;
    
    // Add player and update game state
    const sanitizedName = playerName || 'Player';
    const success = game.addPlayer(socket.id, sanitizedName);
    if (!success) {
      throwGameStateError('Could not join game.');
      return false;
    }
    
    // Join socket to game room and update clients
    socket.join(gameCode);
    logger.info(`Player ${sanitizedName} joined game ${gameCode}`);
    gameService.refreshGameTimeout(io, gameCode);
    gameService.broadcastPlayerList(io, gameCode);
    
    return true;
  }
// Handle player character selection
function handleSelectCharacter(io, socket, gameCode, race, className) {
  // Use consolidated validation
  const game = validateGameAction(socket, gameCode, false, false);
  
  // Validate race and class
  validateCharacterRaceClass(race, className, socket);
  
  // Refresh game timeout
  gameService.refreshGameTimeout(io, gameCode);
  
  // Set player class
  game.setPlayerClass(socket.id, race, className);
  logger.info(`Player ${socket.id} selected ${race} ${className} in game ${gameCode}`);
  
  // Broadcast updated player list
  gameService.broadcastPlayerList(io, gameCode);
  
  return true;
}

// Helper function for character selection validation
function validateCharacterRaceClass(race, className, socket) {
  const validRaces = ['Human', 'Dwarf', 'Elf', 'Orc', 'Satyr', 'Skeleton'];
  const validClasses = [
    'Warrior', 'Pyromancer', 'Wizard', 'Assassin', 'Rogue', 'Priest',
    'Oracle', 'Seer', 'Shaman', 'Gunslinger', 'Tracker', 'Druid'
  ];
  
  if (!validRaces.includes(race)) {
    throwValidationError('Invalid race selection.');
  }
  
  if (!validClasses.includes(className)) {
    throwValidationError('Invalid class selection.');
  }
  
  // Check if race and class combination is valid
  const classToRaces = {
    Warrior: ['Human', 'Dwarf', 'Skeleton'],
    Pyromancer: ['Dwarf', 'Skeleton', 'Orc'],
    Wizard: ['Human', 'Elf', 'Skeleton'],
    Assassin: ['Human', 'Elf', 'Skeleton'],
    Rogue: ['Human', 'Elf', 'Satyr'],
    Priest: ['Human', 'Dwarf', 'Skeleton'],
    Oracle: ['Dwarf', 'Satyr', 'Orc'],
    Seer: ['Elf', 'Satyr', 'Orc'],
    Shaman: ['Dwarf', 'Satyr', 'Orc'],
    Gunslinger: ['Human', 'Dwarf', 'Skeleton'],
    Tracker: ['Elf', 'Satyr', 'Orc'],
    Druid: ['Elf', 'Satyr', 'Orc']
  };
  
  if (!classToRaces[className] || !classToRaces[className].includes(race)) {
    throwValidationError('Invalid race and class combination.');
  }
  
  return true;
}

// Handle player disconnect
function handlePlayerDisconnect(io, socket) {
  logger.info(`Player disconnected: ${socket.id}`);
  
  // Find any game this player was in
  for (const [gameCode, game] of gameService.games.entries()) {
    if (game.players.has(socket.id)) {
      const wasHost = (socket.id === game.hostId);
      const player = game.players.get(socket.id);
      const playerName = player.name;
      
      // Remove player from game
      game.removePlayer(socket.id);
      
      // If game is in progress, check win conditions
      if (game.started) {
        if (gameService.checkGameWinConditions(io, gameCode, playerName)) {
          // Game ended, already handled in the helper
          continue;
        }
      }
      
      // Broadcast updated player list
      gameService.broadcastPlayerList(io, gameCode);
      
      // Reassign host if needed
      if (wasHost && game.players.size > 0) {
        const newHostId = Array.from(game.players.keys())[0]; // Fixed this line
        game.hostId = newHostId;
        logger.info(`New host assigned in game ${gameCode}: ${newHostId}`);
      }
      
      break;
    }
  }
}

module.exports = {
  handlePlayerJoin,
  handleSelectCharacter,
  handlePlayerDisconnect
};