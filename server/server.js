const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const logger = require('./utils/logger');
const gameController = require('./controllers/gameController');
const playerController = require('./controllers/playerController');
const { withSocketErrorHandling } = require('./utils/errorHandler');

const app = express();
const PORT = process.env.PORT || 3001;
const server = http.createServer(app);

// Initialize Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: "*", // for local development - should be restricted in production
  }
});

// Rate Limiter to verify too many attempts in a small window
const socketRateLimiter = {
  // Store socketId -> {action -> {count, lastReset}}
  limits: new Map(),
  
  // Check if an action should be rate limited
  check(socketId, action, limit = 5, timeWindow = 60000) {
    const now = Date.now();
    
    if (!this.limits.has(socketId)) {
      this.limits.set(socketId, new Map());
    }
    
    const socketLimits = this.limits.get(socketId);
    
    if (!socketLimits.has(action)) {
      socketLimits.set(action, { count: 1, lastReset: now });
      return true;
    }
    
    const record = socketLimits.get(action);
    
    // Reset counter if time window has passed
    if (now - record.lastReset > timeWindow) {
      record.count = 1;
      record.lastReset = now;
      return true;
    }
    
    // Increment counter and check
    record.count++;
    if (record.count > limit) {
      return false;
    }
    
    return true;
  },
  
  // Clean up disconnected sockets
  cleanupSocket(socketId) {
    this.limits.delete(socketId);
  },
  
  // Reset specific action for a socket
  reset(socketId, action) {
    if (this.limits.has(socketId)) {
      const socketLimits = this.limits.get(socketId);
      if (socketLimits.has(action)) {
        socketLimits.delete(action);
      }
    }
  }
};

// Start the server
server.listen(PORT, () => {
  logger.info(`Game server running on port ${PORT}`);
});

// Socket.IO Event Handlers
io.on('connection', (socket) => {
  logger.info(`Player connected: ${socket.id}`);

  // Host creates a new game
  socket.on('createGame', withSocketErrorHandling(socket, 
    ({ playerName }) => gameController.handleCreateGame(io, socket, playerName),
    'creating game'
  ));

  // Player joins an existing game by code
  socket.on('joinGame', withSocketErrorHandling(socket,
    ({ gameCode, playerName }) => playerController.handlePlayerJoin(io, socket, gameCode, playerName),
    'joining game'
  ));

  // Player selects their race and class
  socket.on('selectCharacter', withSocketErrorHandling(socket,
    ({ gameCode, race, className }) => playerController.handleSelectCharacter(io, socket, gameCode, race, className),
    'selecting character'
  ));

  // Host starts the game when ready
  socket.on('startGame', withSocketErrorHandling(socket,
    ({ gameCode }) => gameController.handleStartGame(io, socket, gameCode),
    'starting game'
  ));

  // Player performs an action during a turn
  socket.on('performAction', withSocketErrorHandling(socket,
    ({ gameCode, actionType, targetId, bloodRageActive, keenSensesActive }) => {
      gameController.handlePerformAction(io, socket, gameCode, actionType, targetId, { 
        bloodRageActive, 
        keenSensesActive 
      });
    },
    'performing action'
  ));
  
  socket.on('useRacialAbility', withSocketErrorHandling(socket,
    ({ gameCode, targetId, abilityType }) => gameController.handleRacialAbility(io, socket, gameCode, targetId, abilityType),
    'using racial ability'
  ));

  // Socket handler for Adaptability ability
socket.on('adaptabilityReplaceAbility', withSocketErrorHandling(socket, ({ gameCode, oldAbilityType, newAbilityType, level }) => {
  const game = gameService.games.get(gameCode);
  if (!game) {
    socket.emit('errorMessage', { message: 'Game not found.' });
    return false;
  }
  
  const player = game.players.get(socket.id);
  if (!player || player.race !== 'Human') {
    socket.emit('errorMessage', { message: 'Only Humans can use Adaptability.' });
    return false;
  }
  
  // Find the ability to replace
  const oldAbilityIndex = player.abilities.findIndex(a => a.type === oldAbilityType);
  if (oldAbilityIndex === -1) {
    socket.emit('errorMessage', { message: 'Ability not found.' });
    return false;
  }
  
  // Get the new ability from the class ability definitions
  const allClassAbilities = require('./config/classAbilities');
  const allClasses = Object.keys(allClassAbilities);
  
  // Find the class that has this ability
  let newAbility = null;
  for (const cls of allClasses) {
    const foundAbility = allClassAbilities[cls].find(a => a.type === newAbilityType && a.unlockAt === parseInt(level));
    if (foundAbility) {
      newAbility = { ...foundAbility };
      break;
    }
  }
  
  if (!newAbility) {
    socket.emit('errorMessage', { message: 'New ability not found.' });
    return false;
  }
  
  // Remember old ability name for log
  const oldAbilityName = player.abilities[oldAbilityIndex].name;
  
  // Replace the ability
  player.abilities[oldAbilityIndex] = newAbility;
  
  // Update unlocked abilities
  player.unlocked = player.abilities.filter(a => a.unlockAt <= game.level);
  
  // Create log entry (will be shown next round)
  const logEntry = `${player.name} used Adaptability to replace ${oldAbilityName} with ${newAbility.name}!`;
  logger.info(logEntry);
  
  // Clear racial ability usage (Human Adaptability is once per game)
  if (player.racialAbility && player.racialAbility.type === 'adaptability') {
    player.racialUsesLeft = 0;
  }
  
  // Notify all players of the updated player list
  io.to(gameCode).emit('playerList', { players: game.getPlayersInfo() });
  
  // Emit an event to the player to confirm the ability change
  socket.emit('adaptabilityComplete', {
    oldAbility: { type: oldAbilityType, name: oldAbilityName },
    newAbility: { type: newAbility.type, name: newAbility.name }
  });
  
  return true;
}, 'adaptability replacement'));

  // Handle player disconnection
  socket.on('disconnect', () => {
    try {
      playerController.handlePlayerDisconnect(io, socket);
    } catch (error) {
      logger.error(`Error handling disconnect: ${error.message}`, error);
    }
  });

  socket.on('playerNextReady', (data) => {
    console.log(`Raw playerNextReady event received from ${socket.id} with data:`, data);
    
    try {
      const result = gameController.handlePlayerNextReady(io, socket, data.gameCode);
      console.log(`handlePlayerNextReady result:`, result);
    } catch (error) {
      console.error(`Direct error in playerNextReady:`, error);
      socket.emit('errorMessage', { message: 'Error preparing for next round. Please try again.' });
    }
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', error);
  // In a production environment, you might want to restart the server
  // or perform other recovery actions
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection', reason);
});