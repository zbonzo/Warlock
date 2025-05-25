/**
 * Shared test utilities and helpers
 */

/**
 * Create a mock player object
 */
function createMockPlayer(overrides = {}) {
  return {
    id: 'test-player-id',
    name: 'Test Player',
    race: 'Human',
    class: 'Warrior',
    hp: 100,
    maxHp: 100,
    armor: 0,
    damageMod: 1.0,
    isAlive: true,
    isWarlock: false,
    isReady: false,
    statusEffects: {},
    abilityCooldowns: {},
    abilities: [],
    unlocked: [],
    ...overrides,
  };
}

/**
 * Create a mock game room
 */
function createMockGameRoom(overrides = {}) {
  return {
    code: 'TEST',
    players: new Map(),
    hostId: null,
    started: false,
    round: 0,
    level: 1,
    monster: {
      hp: 100,
      maxHp: 100,
      age: 0,
    },
    pendingActions: [],
    pendingRacialActions: [],
    nextReady: new Set(),
    ...overrides,
  };
}

/**
 * Create a mock Socket.IO server
 */
function createMockIOServer() {
  const rooms = new Map();

  return {
    to: jest.fn().mockReturnValue({
      emit: jest.fn(),
    }),
    emit: jest.fn(),
    sockets: {
      adapter: {
        rooms,
      },
    },
    // Helper to simulate room membership
    _addSocketToRoom: (socketId, room) => {
      if (!rooms.has(room)) {
        rooms.set(room, new Set());
      }
      rooms.get(room).add(socketId);
    },
    _removeSocketFromRoom: (socketId, room) => {
      if (rooms.has(room)) {
        rooms.get(room).delete(socketId);
        if (rooms.get(room).size === 0) {
          rooms.delete(room);
        }
      }
    },
  };
}

/**
 * Wait for a specific condition to be true
 */
async function waitFor(condition, timeout = 5000, interval = 100) {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    if (condition()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Create a delayed promise for testing async behavior
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mock console methods and capture output
 */
function mockConsole() {
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
  };

  const mockedConsole = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  };

  // Replace console methods
  Object.assign(console, mockedConsole);

  return {
    restore: () => Object.assign(console, originalConsole),
    mocks: mockedConsole,
  };
}

/**
 * Test environment detector
 */
function getTestEnvironment() {
  return {
    isClient: typeof window !== 'undefined',
    isServer: typeof window === 'undefined',
    isCI: process.env.CI === 'true',
    isDebug: process.env.LOG_LEVEL === 'debug',
  };
}

module.exports = {
  createMockPlayer,
  createMockGameRoom,
  createMockIOServer,
  waitFor,
  delay,
  mockConsole,
  getTestEnvironment,
};
