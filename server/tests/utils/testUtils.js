/**
 * @fileoverview Test utilities and helpers
 */

/**
 * Create a mock Socket.IO socket
 */
function createMockSocket(id = 'socket123') {
  return {
    id,
    emit: jest.fn(),
    join: jest.fn(),
    leave: jest.fn(),
    to: jest.fn().mockReturnValue({ emit: jest.fn() }),
  };
}

/**
 * Create a mock Socket.IO server
 */
function createMockIO() {
  return {
    to: jest.fn().mockReturnValue({ emit: jest.fn() }),
    emit: jest.fn(),
    sockets: {
      sockets: new Map(),
    },
  };
}

/**
 * Create a basic game setup for testing
 */
function createTestGame(playerCount = 3) {
  const { GameRoom } = require('@models/GameRoom');
  const game = new GameRoom('TEST');

  const players = [];
  for (let i = 1; i <= playerCount; i++) {
    const playerId = `player${i}`;
    const playerName = `Player${i}`;
    game.addPlayer(playerId, playerName);
    players.push({ id: playerId, name: playerName });
  }

  return { game, players };
}

/**
 * Set up a game with characters selected
 */
function createReadyGame(playerCount = 3) {
  const { game, players } = createTestGame(playerCount);

  const raceClassCombos = [
    ['Human', 'Warrior'],
    ['Elf', 'Wizard'],
    ['Orc', 'Barbarian'],
    ['Dwarf', 'Priest'],
  ];

  players.forEach((player, index) => {
    const [race, cls] = raceClassCombos[index % raceClassCombos.length];
    game.setPlayerClass(player.id, race, cls);
  });

  game.started = true;
  return { game, players };
}

/**
 * Wait for async operations to complete
 */
function waitForTick() {
  return new Promise((resolve) => setImmediate(resolve));
}

module.exports = {
  createMockSocket,
  createMockIO,
  createTestGame,
  createReadyGame,
  waitForTick,
};
