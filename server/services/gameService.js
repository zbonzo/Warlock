const { GameRoom } = require('../models/GameRoom');
const config = require('../config');
const { throwGameStateError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

// In-memory storage
const games = new Map();
const gameTimers = new Map();

// Function to create a game timeout
function createGameTimeout(io, gameCode) {
  // Clear any existing timer for this game
  if (gameTimers.has(gameCode)) {
    clearTimeout(gameTimers.get(gameCode));
  }
  
  const timerId = setTimeout(() => {
    logger.info(`Game ${gameCode} timed out after inactivity`);
    // Notify any connected players before deleting
    if (games.has(gameCode)) {
      io.to(gameCode).emit('gameTimeout', { message: 'Game ended due to inactivity' });
    }
    // Clean up the game
    games.delete(gameCode);
    gameTimers.delete(gameCode);
  }, config.gameTimeout);
  
  // Store the timer
  gameTimers.set(gameCode, timerId);
}

// Function to refresh the timeout (call this whenever there's activity in a game)
function refreshGameTimeout(io, gameCode) {
  if (games.has(gameCode)) {
    createGameTimeout(io, gameCode);
  }
}

// Create a new game
function createGame(gameCode) {
    // Check if we already have too many games
    if (games.size >= 1000) { // Prevent server overload
      throwGameStateError('Server is too busy right now. Please try again later.');
      return null;
    }
    
    const game = new GameRoom(gameCode);
    games.set(gameCode, game);
    return game;
  }

// Generate a unique game code
function generateGameCode() {
  let code;
  do {
    code = Math.floor(1000 + Math.random() * 9000).toString();
  } while (games.has(code));
  
  return code;
}

// Check if a player can join a game
function canPlayerJoinGame(game, playerId) {
    // Check if game is full based on config max players
    if (game.players.size >= config.maxPlayers) {
      throwGameStateError(`Game is full (${config.maxPlayers} players max).`);
      return false;
    }
    
    // Check if player is already in this game
    if (game.players.has(playerId)) {
      throwValidationError('You are already in this game.');
      return false;
    }
    
    return true;
  }

// Helper to broadcast updated player list to a game room
function broadcastPlayerList(io, gameCode) {
  const game = games.get(gameCode);
  if (game) {
    io.to(gameCode).emit('playerList', { players: game.getPlayersInfo() });
  }
}

// Process game round
function processGameRound(io, gameCode) {
  const game = games.get(gameCode);
  if (!game) return null;
  
  // Process the round
  const result = game.processRound();
  
  // Broadcast the results
  io.to(gameCode).emit('roundResult', { 
    eventsLog: result.eventsLog, 
    players: result.players, 
    turn: game.round, 
    winner: result.winner,
    monster: result.monster 
  });
  
  // Check if game is over
  if (result.winner) {
    logger.info(`Game ${gameCode} ended. Winner: ${result.winner}`);
    // Clean up the game
    clearTimeout(gameTimers.get(gameCode));
    gameTimers.delete(gameCode);
    games.delete(gameCode);
  }
  
  return result;
}

// Check win conditions (for disconnects)
function checkGameWinConditions(io, gameCode, disconnectedPlayerName) {
  const game = games.get(gameCode);
  if (!game) return;
  
  if (game.numWarlocks <= 0) {
    io.to(gameCode).emit('roundResult', { 
      eventsLog: [`${disconnectedPlayerName} left the game. All Warlocks are gone.`], 
      players: game.getPlayersInfo(), 
      winner: 'Good'
    });
    games.delete(gameCode);
    return true;
  } else if (game.numWarlocks === game.getAlivePlayers().length) {
    io.to(gameCode).emit('roundResult', { 
      eventsLog: [`${disconnectedPlayerName} left the game.`], 
      players: game.getPlayersInfo(), 
      winner: 'Evil'
    });
    games.delete(gameCode);
    return true;
  }
  return false;
}


module.exports = {
    games,
    gameTimers,
    createGameTimeout,
    refreshGameTimeout,
    createGame,
    generateGameCode,
    broadcastPlayerList,
    processGameRound,
    checkGameWinConditions,
    canPlayerJoinGame
  };