/**
 * @fileoverview Integration tests for GameController EventBus emissions
 * Tests the controller integration with EventBus for Phase 2 Step 4
 */
const GameRoom = require('@server/models/GameRoom');
const { EventTypes } = require('@server/models/events/EventTypes');
const gameController = require('@server/controllers/GameController');
const gameService = require('@server/services/gameService');

// Mock gameService
jest.mock('@server/services/gameService', () => ({
  games: new Map(),
  generateGameCode: jest.fn(() => 'MOCK123'),
  createGame: jest.fn(),
  createGameTimeout: jest.fn(),
  broadcastPlayerList: jest.fn(),
  refreshGameTimeout: jest.fn()
}));

describe('GameController EventBus Integration', () => {
  let gameRoom;
  let mockSocket;
  let mockIo;
  let eventBusSpy;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create test game room
    gameRoom = new GameRoom('MOCK123');
    
    // Mock Socket.IO instances
    mockSocket = {
      id: 'test_socket_123',
      emit: jest.fn(),
      join: jest.fn()
    };
    
    mockIo = {
      to: jest.fn().mockReturnValue({
        emit: jest.fn()
      })
    };

    // Set up gameService mock
    gameService.games.set('MOCK123', gameRoom);
    gameService.createGame.mockReturnValue(gameRoom);

    // Initialize EventBus integration
    gameRoom.setSocketServer(mockIo);
    
    // Spy on EventBus emissions
    eventBusSpy = jest.spyOn(gameRoom.getEventBus(), 'emit');
  });

  afterEach(() => {
    gameService.games.clear();
    jest.restoreAllMocks();
  });

  describe('Game Creation Events', () => {
    it('should emit CONTROLLER.GAME_CREATED event when game is created', () => {
      // Mock validation
      jest.doMock('@server/middleware/validation', () => ({
        validatePlayerNameSocket: jest.fn(() => true)
      }));

      const result = gameController.handleGameCreate(mockIo, mockSocket, 'TestPlayer');
      
      expect(result).toBe(true);
      expect(eventBusSpy).toHaveBeenCalledWith(
        EventTypes.CONTROLLER.GAME_CREATED,
        expect.objectContaining({
          socketId: mockSocket.id,
          gameCode: 'MOCK123'
        })
      );
    });
  });

  describe('Error Event Emissions', () => {
    it('should emit CONTROLLER.ERROR events for validation failures', () => {
      // Create a game action that will fail validation
      const mockGame = {
        getEventBus: jest.fn(() => gameRoom.getEventBus()),
        getPlayerBySocketId: jest.fn(() => null) // No player found
      };
      
      gameService.games.set('MOCK123', mockGame);

      // Mock validation that will pass initially but fail on player lookup
      jest.doMock('@server/shared/gameChecks', () => ({
        validateGameAction: jest.fn(() => mockGame)
      }));

      // Call handleGameAction which should emit error event
      const gameController = require('@server/controllers/GameController');
      gameController.handleGameAction(mockIo, mockSocket, 'MOCK123', 'attack', 'target123');

      expect(eventBusSpy).toHaveBeenCalledWith(
        EventTypes.CONTROLLER.ERROR,
        expect.objectContaining({
          socketId: mockSocket.id,
          type: 'player_error'
        })
      );
    });
  });

  describe('EventBus Fallback Behavior', () => {
    it('should fallback to direct socket emission when EventBus is not available', () => {
      // Create a game without EventBus
      const gameWithoutEventBus = {
        addPlayer: jest.fn(),
        registerSocket: jest.fn(),
        mapPlayerSocket: jest.fn(),
        getEventBus: jest.fn(() => null)
      };
      
      gameService.createGame.mockReturnValue(gameWithoutEventBus);
      gameService.games.set('MOCK123', gameWithoutEventBus);

      // Mock validation
      jest.doMock('@server/middleware/validation', () => ({
        validatePlayerNameSocket: jest.fn(() => true)
      }));

      const result = gameController.handleGameCreate(mockIo, mockSocket, 'TestPlayer');
      
      expect(result).toBe(true);
      expect(mockSocket.emit).toHaveBeenCalledWith('gameCreated', { gameCode: 'MOCK123' });
    });
  });

  describe('Action Submission Events', () => {
    it('should emit ACTION.SUBMITTED events through EventBus', async () => {
      // Set up a complete game with player
      gameRoom.addPlayer(mockSocket.id, 'TestPlayer');
      
      // Mock the command system
      const mockSubmitPlayerAction = jest.fn().mockResolvedValue('cmd123');
      gameRoom.submitPlayerAction = mockSubmitPlayerAction;
      
      // Mock validation that passes
      jest.doMock('@server/shared/gameChecks', () => ({
        validateGameAction: jest.fn(() => gameRoom)
      }));

      const result = await gameController.handleGameAction(
        mockIo, 
        mockSocket, 
        'MOCK123', 
        'attack', 
        'target123'
      );

      expect(result).toBe(true);
      expect(eventBusSpy).toHaveBeenCalledWith(
        EventTypes.ACTION.SUBMITTED,
        expect.objectContaining({
          socketId: mockSocket.id,
          actionType: 'attack',
          targetId: 'target123',
          commandId: 'cmd123',
          success: true
        })
      );
    });
  });
});

describe('GameController EventBus Helper Function', () => {
  let gameRoom;
  let mockSocket;

  beforeEach(() => {
    gameRoom = new GameRoom('HELPER_TEST');
    mockSocket = {
      id: 'helper_socket',
      emit: jest.fn()
    };
    
    // Clear games map
    gameService.games.clear();
  });

  it('should use EventBus when available', () => {
    // Set up game with EventBus
    const mockIo = { to: jest.fn().mockReturnValue({ emit: jest.fn() }) };
    gameRoom.setSocketServer(mockIo);
    gameService.games.set('HELPER_TEST', gameRoom);
    
    const eventBusSpy = jest.spyOn(gameRoom.getEventBus(), 'emit');

    // Import and access the helper function through the controller module
    const gameController = require('@server/controllers/GameController');
    
    // Test the helper function behavior by calling a controller method that uses it
    // We can't directly test the helper function since it's not exported,
    // but we can verify the behavior through controller methods that use it
    
    // Create a mock validation failure scenario to trigger the helper
    jest.doMock('@server/shared/gameChecks', () => ({
      validateGameAction: jest.fn(() => null) // Return null to trigger error
    }));

    // This should trigger the helper function with EventBus emission
    const result = gameController.handleGameAction(mockIo, mockSocket, 'HELPER_TEST', 'attack', 'target');
    
    // Verify EventBus was used for error emission
    expect(eventBusSpy).toHaveBeenCalled();
  });

  it('should fallback to direct socket emission when EventBus not available', () => {
    // Set up game without EventBus  
    gameService.games.set('HELPER_TEST', null);

    // Import controller and trigger helper function
    const gameController = require('@server/controllers/GameController');
    
    // Mock validation failure to trigger fallback
    jest.doMock('@server/shared/gameChecks', () => ({
      validateGameAction: jest.fn(() => null)
    }));

    const mockIo = { to: jest.fn().mockReturnValue({ emit: jest.fn() }) };
    const result = gameController.handleGameAction(mockIo, mockSocket, 'HELPER_TEST', 'attack', 'target');
    
    // Should fallback to direct socket emission
    expect(mockSocket.emit).toHaveBeenCalledWith('errorMessage', expect.any(Object));
  });
});