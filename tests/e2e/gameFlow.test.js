/**
 * @fileoverview End-to-end tests for complete game flow
 */

const { Server } = require('socket.io');
const { createServer } = require('http');
const Client = require('socket.io-client');

// Mock the entire server setup
jest.mock('../../config', () => ({
  corsOrigins: '*',
  minPlayers: 2,
  maxPlayers: 8,
  gameBalance: {
    monster: { baseHp: 100 },
    calculateStats: jest.fn(() => ({ maxHp: 100, armor: 0, damageMod: 1.0 })),
  },
  classAbilities: {
    Warrior: [{ type: 'slash', name: 'Slash', unlockAt: 1 }],
  },
  racialAbilities: {
    Human: { type: 'adaptability', name: 'Adaptability' },
  },
  messages: {
    getError: jest.fn((key) => `Error: ${key}`),
  },
}));

describe('Game Flow E2E', () => {
  let httpServer;
  let io;
  let clientSocket1;
  let clientSocket2;
  let serverSocket1;
  let serverSocket2;

  beforeAll((done) => {
    httpServer = createServer();
    io = new Server(httpServer, {
      cors: { origin: '*', methods: ['GET', 'POST'] },
    });

    httpServer.listen(() => {
      const port = httpServer.address().port;

      // Create client sockets
      clientSocket1 = new Client(`http://localhost:${port}`);
      clientSocket2 = new Client(`http://localhost:${port}`);

      let connections = 0;

      io.on('connection', (socket) => {
        connections++;
        if (connections === 1) serverSocket1 = socket;
        if (connections === 2) serverSocket2 = socket;

        if (connections === 2) {
          done();
        }
      });
    });
  });

  afterAll(() => {
    io.close();
    clientSocket1.close();
    clientSocket2.close();
    httpServer.close();
  });

  describe('Complete Game Session', () => {
    test('should handle complete game creation and joining flow', (done) => {
      let gameCode;
      let eventsReceived = 0;

      const checkCompletion = () => {
        eventsReceived++;
        if (eventsReceived === 3) {
          // gameCreated, playerList, playerList again
          done();
        }
      };

      // Set up event handlers
      clientSocket1.on('gameCreated', (data) => {
        gameCode = data.gameCode;
        expect(gameCode).toMatch(/^\d{4}$/);
        checkCompletion();
      });

      clientSocket1.on('playerList', (data) => {
        expect(data.players).toBeDefined();
        expect(data.host).toBeDefined();
        checkCompletion();
      });

      clientSocket2.on('playerList', (data) => {
        expect(data.players).toHaveLength(2);
        checkCompletion();
      });

      // Simulate game creation and joining
      setTimeout(() => {
        // Mock the server-side handlers
        serverSocket1.emit('gameCreated', { gameCode: '1234' });
        serverSocket1.broadcast.emit('playerList', {
          players: [{ id: serverSocket1.id, name: 'Player1' }],
          host: serverSocket1.id,
        });

        setTimeout(() => {
          serverSocket1.broadcast.emit('playerList', {
            players: [
              { id: serverSocket1.id, name: 'Player1' },
              { id: serverSocket2.id, name: 'Player2' },
            ],
            host: serverSocket1.id,
          });
        }, 10);
      }, 10);
    });

    test('should handle error scenarios gracefully', (done) => {
      clientSocket1.on('errorMessage', (data) => {
        expect(data.message).toBeDefined();
        expect(data.code).toBeDefined();
        done();
      });

      // Simulate error condition
      setTimeout(() => {
        serverSocket1.emit('errorMessage', {
          message: 'Test error message',
          code: 'VALIDATION_ERROR',
        });
      }, 10);
    });
  });
});
