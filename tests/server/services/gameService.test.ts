/**
 * @fileoverview Tests for gameService TypeScript module
 */
import * as gameService from '../../../server/services/gameService';
import { GameRoom } from '../../../server/models/GameRoom';
import { Server as SocketIOServer } from 'socket.io';

// Mock external dependencies
const mockConfig = {
  maxGames: 100,
  maxPlayers: 8,
  gameTimeout: 300000
};

const mockMessages = {
  getError: jest.fn().mockReturnValue('Mock error message')
};

const mockLogger = {
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

const mockTrophies = [
  {
    name: 'Test Trophy',
    description: 'A test trophy',
    getWinner: jest.fn().mockReturnValue(null)
  }
];

// Mock the modules
jest.mock('../../../server/config/index.js', () => mockConfig);
jest.mock('../../../server/config/messages/index.js', () => ({ default: mockMessages }));
jest.mock('../../../server/utils/logger.js', () => ({ default: mockLogger }));
jest.mock('../../../server/config/trophies.js', () => ({ default: mockTrophies }));
jest.mock('../../../server/models/GameRoom.js');

// Mock GameRoom
const MockGameRoom = GameRoom as jest.MockedClass<typeof GameRoom>;

describe('gameService', () => {
  let mockIO: jest.Mocked<SocketIOServer>;
  let mockSocket: any;
  let mockGameRoom: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Clear the games map
    gameService.games.clear();
    gameService.gameTimers.clear();

    // Mock Socket.IO server
    mockSocket = {
      emit: jest.fn(),
      rooms: new Set(['GAME123'])
    };

    mockIO = {
      to: jest.fn().mockReturnValue({
        emit: jest.fn()
      }),
      emit: jest.fn(),
      sockets: {
        adapter: {
          rooms: new Map([
            ['GAME123', new Set(['socket1', 'socket2'])]
          ])
        }
      }
    } as any;

    // Mock GameRoom instance
    mockGameRoom = {
      code: 'GAME123',
      gameState: {
        hostId: 'player1',
        started: false,
        ended: false,
        round: 1,
        level: 1,
        players: new Map([
          ['player1', { id: 'player1', name: 'Alice', hp: 100, isAlive: true }]
        ]),
        startTime: Date.now()
      },
      gamePhase: {
        phase: 'action'
      },
      systems: {
        gameStateUtils: {
          countPendingResurrections: jest.fn().mockReturnValue(0)
        },
        warlockSystem: {
          getWarlockCount: jest.fn().mockReturnValue(1)
        },
        statusEffectManager: {
          isPlayerStunned: jest.fn().mockReturnValue(false)
        }
      },
      commandProcessor: {
        processCommands: jest.fn().mockResolvedValue(undefined)
      },
      processRound: jest.fn().mockReturnValue({
        eventsLog: ['Test event'],
        players: [{ id: 'player1', name: 'Alice', stats: { totalDamageDealt: 25 } }],
        winner: null,
        turn: 1
      }),
      getPlayersInfo: jest.fn().mockReturnValue([
        { id: 'player1', name: 'Alice', stats: { totalDamageDealt: 25 } }
      ]),
      getAlivePlayers: jest.fn().mockReturnValue([
        { id: 'player1', name: 'Alice', hp: 100, isAlive: true }
      ]),
      pendingActions: [],
      cleanupDisconnectedPlayers: jest.fn().mockReturnValue(['cleanedPlayer'])
    };

    MockGameRoom.mockImplementation(() => mockGameRoom);
  });

  describe('createGame', () => {
    it('should create a new game successfully', () => {
      const game = gameService.createGame('GAME123');
      
      expect(game).toBeDefined();
      expect(MockGameRoom).toHaveBeenCalledWith('GAME123');
      expect(gameService.games.has('GAME123')).toBe(true);
    });

    it('should prevent creating too many games', () => {
      // Fill up to max games
      for (let i = 0; i < mockConfig.maxGames; i++) {
        gameService.games.set(`GAME${i}`, mockGameRoom);
      }

      expect(() => gameService.createGame('OVERFLOW')).toThrow();
    });

    it('should return null when server is busy', () => {
      // Mock throwGameStateError to not throw for this test
      jest.doMock('../../../server/utils/errorHandler.js', () => ({
        throwGameStateError: jest.fn()
      }));

      // Fill up to max games
      for (let i = 0; i < mockConfig.maxGames; i++) {
        gameService.games.set(`GAME${i}`, mockGameRoom);
      }

      const game = gameService.createGame('OVERFLOW');
      expect(game).toBeNull();
    });
  });

  describe('generateGameCode', () => {
    it('should generate unique 4-digit codes', () => {
      const code1 = gameService.generateGameCode();
      const code2 = gameService.generateGameCode();
      
      expect(code1).toMatch(/^\d{4}$/);
      expect(code2).toMatch(/^\d{4}$/);
      expect(code1).not.toBe(code2);
    });

    it('should avoid existing game codes', () => {
      gameService.games.set('1234', mockGameRoom);
      
      const newCode = gameService.generateGameCode();
      expect(newCode).not.toBe('1234');
    });
  });

  describe('canPlayerJoinGame', () => {
    beforeEach(() => {
      gameService.games.set('GAME123', mockGameRoom);
    });

    it('should allow player to join when game is not full', () => {
      const canJoin = gameService.canPlayerJoinGame(mockGameRoom, 'player2');
      expect(canJoin).toBe(true);
    });

    it('should prevent joining when game is full', () => {
      // Fill the game to max capacity
      for (let i = 0; i < mockConfig.maxPlayers; i++) {
        mockGameRoom.gameState.players.set(`player${i}`, { id: `player${i}` });
      }

      expect(() => gameService.canPlayerJoinGame(mockGameRoom, 'overflow')).toThrow();
    });

    it('should prevent duplicate players', () => {
      expect(() => gameService.canPlayerJoinGame(mockGameRoom, 'player1')).toThrow();
    });
  });

  describe('createGameTimeout and refreshGameTimeout', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      gameService.games.set('GAME123', mockGameRoom);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should create a timeout for game cleanup', () => {
      gameService.createGameTimeout(mockIO, 'GAME123');
      
      expect(gameService.gameTimers.has('GAME123')).toBe(true);
    });

    it('should clean up game when timeout expires', () => {
      gameService.createGameTimeout(mockIO, 'GAME123');
      
      // Fast-forward time
      jest.advanceTimersByTime(mockConfig.gameTimeout + 1000);
      
      expect(gameService.games.has('GAME123')).toBe(false);
      expect(gameService.gameTimers.has('GAME123')).toBe(false);
      expect(mockIO.to).toHaveBeenCalledWith('GAME123');
    });

    it('should refresh existing timeout', () => {
      gameService.createGameTimeout(mockIO, 'GAME123');
      const firstTimer = gameService.gameTimers.get('GAME123');
      
      gameService.refreshGameTimeout(mockIO, 'GAME123');
      const secondTimer = gameService.gameTimers.get('GAME123');
      
      expect(firstTimer).not.toBe(secondTimer);
    });

    it('should not refresh timeout for non-existent game', () => {
      gameService.refreshGameTimeout(mockIO, 'NONEXISTENT');
      
      expect(gameService.gameTimers.has('NONEXISTENT')).toBe(false);
    });
  });

  describe('broadcastPlayerList', () => {
    beforeEach(() => {
      gameService.games.set('GAME123', mockGameRoom);
    });

    it('should broadcast player list to game room', () => {
      mockGameRoom.getPlayersInfo.mockReturnValue([
        { id: 'player1', name: 'Alice' },
        { id: 'player2', name: 'Bob' }
      ]);

      gameService.broadcastPlayerList(mockIO, 'GAME123');
      
      expect(mockIO.to).toHaveBeenCalledWith('GAME123');
      expect(mockIO.to('GAME123').emit).toHaveBeenCalledWith('playerList', {
        players: [
          { id: 'player1', name: 'Alice' },
          { id: 'player2', name: 'Bob' }
        ],
        host: 'player1'
      });
    });

    it('should handle non-existent game gracefully', () => {
      gameService.broadcastPlayerList(mockIO, 'NONEXISTENT');
      
      expect(mockIO.to).not.toHaveBeenCalled();
    });
  });

  describe('processGameRound', () => {
    beforeEach(() => {
      gameService.games.set('GAME123', mockGameRoom);
    });

    it('should process round successfully', async () => {
      const result = await gameService.processGameRound(mockIO, 'GAME123');
      
      expect(mockGameRoom.commandProcessor.processCommands).toHaveBeenCalled();
      expect(mockGameRoom.gamePhase.phase).toBe('results');
      expect(mockGameRoom.processRound).toHaveBeenCalled();
      expect(result).toEqual({
        eventsLog: ['Test event'],
        players: [{ id: 'player1', name: 'Alice', stats: { totalDamageDealt: 25 } }],
        winner: null,
        turn: 1
      });
    });

    it('should broadcast round results', async () => {
      await gameService.processGameRound(mockIO, 'GAME123');
      
      expect(mockIO.to).toHaveBeenCalledWith('GAME123');
      expect(mockIO.to('GAME123').emit).toHaveBeenCalledWith('roundResult', 
        expect.objectContaining({
          eventsLog: ['Test event'],
          phase: 'results'
        })
      );
    });

    it('should handle level-up events', async () => {
      mockGameRoom.processRound.mockReturnValue({
        eventsLog: ['Level up!'],
        players: [],
        winner: null,
        turn: 1,
        level: 2,
        levelUp: { oldLevel: 1, newLevel: 2 }
      });

      await gameService.processGameRound(mockIO, 'GAME123');
      
      expect(mockIO.to('GAME123').emit).toHaveBeenCalledWith('levelUp', 
        expect.objectContaining({
          level: 2,
          oldLevel: 1
        })
      );
    });

    it('should clean up game when there is a winner', async () => {
      mockGameRoom.processRound.mockReturnValue({
        eventsLog: ['Game over'],
        players: [{ id: 'player1', name: 'Alice', stats: {} }],
        winner: 'Good',
        turn: 5
      });

      gameService.gameTimers.set('GAME123', setTimeout(() => {}, 1000) as any);

      await gameService.processGameRound(mockIO, 'GAME123');
      
      expect(gameService.games.has('GAME123')).toBe(false);
      expect(gameService.gameTimers.has('GAME123')).toBe(false);
      expect(mockLogger.info).toHaveBeenCalledWith('GameEnded', { gameCode: 'GAME123', winner: 'Good' });
    });

    it('should handle command processor errors gracefully', async () => {
      mockGameRoom.commandProcessor.processCommands.mockRejectedValue(new Error('Command error'));

      const result = await gameService.processGameRound(mockIO, 'GAME123');
      
      expect(mockLogger.error).toHaveBeenCalledWith('Error processing commands:', {
        gameCode: 'GAME123',
        error: 'Command error'
      });
      expect(result).toBeDefined(); // Should still continue processing
    });

    it('should return null for non-existent game', async () => {
      const result = await gameService.processGameRound(mockIO, 'NONEXISTENT');
      expect(result).toBeNull();
    });

    it('should handle missing command processor', async () => {
      mockGameRoom.commandProcessor = undefined;

      const result = await gameService.processGameRound(mockIO, 'GAME123');
      
      expect(result).toBeDefined();
      expect(mockGameRoom.processRound).toHaveBeenCalled();
    });
  });

  describe('checkGameWinConditions', () => {
    beforeEach(() => {
      gameService.games.set('GAME123', mockGameRoom);
    });

    it('should not end game when resurrections are pending', () => {
      mockGameRoom.systems.gameStateUtils.countPendingResurrections.mockReturnValue(2);

      const gameEnded = gameService.checkGameWinConditions(mockIO, 'GAME123', 'Alice');
      
      expect(gameEnded).toBe(false);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('2 pending resurrections')
      );
    });

    it('should end game when all warlocks are gone', () => {
      mockGameRoom.systems.warlockSystem.getWarlockCount.mockReturnValue(0);

      const gameEnded = gameService.checkGameWinConditions(mockIO, 'GAME123', 'Alice');
      
      expect(gameEnded).toBe(true);
      expect(mockIO.to('GAME123').emit).toHaveBeenCalledWith('roundResult', 
        expect.objectContaining({
          winner: 'Good'
        })
      );
      expect(gameService.games.has('GAME123')).toBe(false);
    });

    it('should end game when only warlocks remain', () => {
      mockGameRoom.systems.warlockSystem.getWarlockCount.mockReturnValue(1);
      mockGameRoom.getAlivePlayers.mockReturnValue([
        { id: 'warlock1', isWarlock: true }
      ]);

      const gameEnded = gameService.checkGameWinConditions(mockIO, 'GAME123', 'Alice');
      
      expect(gameEnded).toBe(true);
      expect(mockIO.to('GAME123').emit).toHaveBeenCalledWith('roundResult', 
        expect.objectContaining({
          winner: 'Evil'
        })
      );
      expect(gameService.games.has('GAME123')).toBe(false);
    });

    it('should not end game in normal conditions', () => {
      mockGameRoom.systems.warlockSystem.getWarlockCount.mockReturnValue(1);
      mockGameRoom.getAlivePlayers.mockReturnValue([
        { id: 'player1', isWarlock: false },
        { id: 'warlock1', isWarlock: true }
      ]);

      const gameEnded = gameService.checkGameWinConditions(mockIO, 'GAME123', 'Alice');
      
      expect(gameEnded).toBe(false);
    });

    it('should return false for non-existent game', () => {
      const gameEnded = gameService.checkGameWinConditions(mockIO, 'NONEXISTENT', 'Alice');
      expect(gameEnded).toBe(false);
    });
  });

  describe('utility functions', () => {
    beforeEach(() => {
      gameService.games.set('GAME123', mockGameRoom);
    });

    describe('isWaitingForActions', () => {
      it('should return false for unstarted game', () => {
        mockGameRoom.gameState.started = false;
        
        const waiting = gameService.isWaitingForActions(mockGameRoom);
        expect(waiting).toBe(false);
      });

      it('should return true when waiting for actions', () => {
        mockGameRoom.gameState.started = true;
        mockGameRoom.getAlivePlayers.mockReturnValue([
          { id: 'player1' }, { id: 'player2' }
        ]);
        mockGameRoom.pendingActions = [];

        const waiting = gameService.isWaitingForActions(mockGameRoom);
        expect(waiting).toBe(true);
      });

      it('should return false when all actions submitted', () => {
        mockGameRoom.gameState.started = true;
        mockGameRoom.getAlivePlayers.mockReturnValue([
          { id: 'player1' }, { id: 'player2' }
        ]);
        mockGameRoom.pendingActions = [{}, {}];

        const waiting = gameService.isWaitingForActions(mockGameRoom);
        expect(waiting).toBe(false);
      });

      it('should exclude stunned players', () => {
        mockGameRoom.gameState.started = true;
        mockGameRoom.getAlivePlayers.mockReturnValue([
          { id: 'player1' }, { id: 'player2' }
        ]);
        mockGameRoom.systems.statusEffectManager.isPlayerStunned
          .mockReturnValueOnce(true)  // player1 is stunned
          .mockReturnValueOnce(false); // player2 is not stunned
        mockGameRoom.pendingActions = [];

        const waiting = gameService.isWaitingForActions(mockGameRoom);
        expect(waiting).toBe(true); // Only 1 unstunned player, 0 actions
      });
    });

    describe('isInRoundResults', () => {
      it('should return false for unstarted game', () => {
        mockGameRoom.gameState.started = false;
        
        const inResults = gameService.isInRoundResults(mockGameRoom);
        expect(inResults).toBe(false);
      });

      it('should return true when all actions are submitted', () => {
        mockGameRoom.gameState.started = true;
        mockGameRoom.getAlivePlayers.mockReturnValue([
          { id: 'player1' }, { id: 'player2' }
        ]);
        mockGameRoom.pendingActions = [{}, {}];

        const inResults = gameService.isInRoundResults(mockGameRoom);
        expect(inResults).toBe(true);
      });
    });

    describe('getGameStats', () => {
      it('should return current game statistics', () => {
        gameService.games.set('GAME456', mockGameRoom);
        gameService.gameTimers.set('GAME123', setTimeout(() => {}, 1000) as any);

        const stats = gameService.getGameStats();
        
        expect(stats).toEqual({
          totalGames: 2,
          activeTimers: 1,
          gameList: ['GAME123', 'GAME456']
        });
      });
    });

    describe('forceCleanupGame', () => {
      it('should cleanup existing game and timer', () => {
        gameService.gameTimers.set('GAME123', setTimeout(() => {}, 1000) as any);

        const cleaned = gameService.forceCleanupGame('GAME123');
        
        expect(cleaned).toBe(true);
        expect(gameService.games.has('GAME123')).toBe(false);
        expect(gameService.gameTimers.has('GAME123')).toBe(false);
        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.stringContaining('Force cleaned up game GAME123')
        );
      });

      it('should return false for non-existent game', () => {
        const cleaned = gameService.forceCleanupGame('NONEXISTENT');
        expect(cleaned).toBe(false);
      });
    });

    describe('createGameWithCode', () => {
      it('should create game with specific code', () => {
        const game = gameService.createGameWithCode('CUSTOM');
        
        expect(game).toBeDefined();
        expect(gameService.games.has('CUSTOM')).toBe(true);
        expect(mockLogger.info).toHaveBeenCalledWith('Created replay game with code CUSTOM');
      });

      it('should return null for existing code', () => {
        gameService.games.set('EXISTING', mockGameRoom);
        
        const game = gameService.createGameWithCode('EXISTING');
        expect(game).toBeNull();
      });
    });

    describe('cleanupExpiredDisconnectedPlayers', () => {
      it('should cleanup disconnected players across all games', () => {
        gameService.games.set('GAME456', {
          ...mockGameRoom,
          cleanupDisconnectedPlayers: jest.fn().mockReturnValue(['expiredPlayer'])
        });

        gameService.cleanupExpiredDisconnectedPlayers(mockIO);
        
        expect(mockGameRoom.cleanupDisconnectedPlayers).toHaveBeenCalled();
        expect(mockLogger.info).toHaveBeenCalledWith('DisconnectedPlayersCleanupComplete', {
          totalCleaned: 2, // cleanedPlayer + expiredPlayer
          activeGames: 2
        });
      });

      it('should handle games with no expired players', () => {
        mockGameRoom.cleanupDisconnectedPlayers.mockReturnValue([]);

        gameService.cleanupExpiredDisconnectedPlayers();
        
        expect(mockLogger.info).not.toHaveBeenCalledWith(
          expect.stringContaining('DisconnectedPlayersCleanupComplete')
        );
      });
    });
  });

  describe('trophy system', () => {
    beforeEach(() => {
      gameService.games.set('GAME123', mockGameRoom);
    });

    it('should not award trophy when no players qualify', async () => {
      mockGameRoom.processRound.mockReturnValue({
        eventsLog: ['Game over'],
        players: [{ id: 'player1', name: 'Alice', stats: {} }],
        winner: 'Good',
        turn: 5
      });

      await gameService.processGameRound(mockIO, 'GAME123');
      
      expect(mockIO.to('GAME123').emit).not.toHaveBeenCalledWith('trophyAwarded', expect.anything());
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('No trophy to award')
      );
    });

    it('should award trophy when player qualifies', async () => {
      const mockWinner = { id: 'player1', name: 'Alice' };
      mockTrophies[0].getWinner.mockReturnValue(mockWinner);

      mockGameRoom.processRound.mockReturnValue({
        eventsLog: ['Game over'],
        players: [{ id: 'player1', name: 'Alice', stats: { totalDamageDealt: 100 } }],
        winner: 'Good',
        turn: 5
      });

      await gameService.processGameRound(mockIO, 'GAME123');
      
      expect(mockIO.to('GAME123').emit).toHaveBeenCalledWith('trophyAwarded', {
        playerName: 'Alice',
        trophyName: 'Test Trophy',
        trophyDescription: 'A test trophy'
      });
    });
  });

  describe('error handling', () => {
    it('should handle missing game room methods gracefully', async () => {
      const incompleteGameRoom = {
        ...mockGameRoom,
        getPlayersInfo: undefined
      };
      gameService.games.set('INCOMPLETE', incompleteGameRoom);

      // Should not throw error
      expect(() => gameService.broadcastPlayerList(mockIO, 'INCOMPLETE')).not.toThrow();
    });

    it('should handle trophy evaluation errors', async () => {
      mockTrophies[0].getWinner.mockImplementation(() => {
        throw new Error('Trophy evaluation error');
      });

      mockGameRoom.processRound.mockReturnValue({
        eventsLog: ['Game over'],
        players: [{ id: 'player1', name: 'Alice', stats: {} }],
        winner: 'Good',
        turn: 5
      });

      await gameService.processGameRound(mockIO, 'GAME123');
      
      expect(mockLogger.error).toHaveBeenCalledWith('Error awarding trophy:', expect.any(Object));
    });
  });

  describe('type safety and interfaces', () => {
    it('should enforce GameResult interface', async () => {
      const result = await gameService.processGameRound(mockIO, 'GAME123');
      
      expect(typeof result?.eventsLog).toBe('object');
      expect(Array.isArray(result?.eventsLog)).toBe(true);
      expect(typeof result?.players).toBe('object');
      expect(Array.isArray(result?.players)).toBe(true);
      expect(typeof result?.turn).toBe('number');
    });

    it('should enforce GameStats interface', () => {
      const stats = gameService.getGameStats();
      
      expect(typeof stats.totalGames).toBe('number');
      expect(typeof stats.activeTimers).toBe('number');
      expect(Array.isArray(stats.gameList)).toBe(true);
    });

    it('should enforce TrophyAward interface', async () => {
      const mockWinner = { id: 'player1', name: 'Alice' };
      mockTrophies[0].getWinner.mockReturnValue(mockWinner);

      mockGameRoom.processRound.mockReturnValue({
        eventsLog: ['Game over'],
        players: [{ id: 'player1', name: 'Alice', stats: {} }],
        winner: 'Good',
        turn: 5
      });

      await gameService.processGameRound(mockIO, 'GAME123');
      
      const trophyCall = mockIO.to('GAME123').emit.mock.calls.find(
        call => call[0] === 'trophyAwarded'
      );
      
      if (trophyCall) {
        const trophyData = trophyCall[1];
        expect(typeof trophyData.playerName).toBe('string');
        expect(typeof trophyData.trophyName).toBe('string');
        expect(typeof trophyData.trophyDescription).toBe('string');
      }
    });
  });
});