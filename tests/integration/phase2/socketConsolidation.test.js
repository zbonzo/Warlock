/**
 * @fileoverview Basic integration test for Socket.IO Event Consolidation
 * Tests core functionality of SocketEventRouter and EventBus integration
 * Part of Phase 2 Step 4 testing - Socket.IO Event Consolidation
 */
const { GameRoom } = require('../../../models/GameRoom');
const { EventTypes } = require('../../../models/events/EventTypes');

describe('Socket.IO Event Consolidation', () => {
  let gameRoom;
  let mockIo;
  
  beforeEach(() => {
    // Create test game room
    gameRoom = new GameRoom('TEST123');
    
    // Mock Socket.IO server
    mockIo = {
      to: jest.fn().mockReturnValue({
        emit: jest.fn()
      })
    };
  });

  describe('SocketEventRouter Initialization', () => {
    it('should initialize SocketEventRouter when setSocketServer is called', () => {
      expect(gameRoom.getSocketEventRouter()).toBeNull();
      
      gameRoom.setSocketServer(mockIo);
      
      expect(gameRoom.getSocketEventRouter()).not.toBeNull();
      expect(gameRoom.getSocketEventRouter().constructor.name).toBe('SocketEventRouter');
    });

    it('should provide access to event router through GameRoom', () => {
      gameRoom.setSocketServer(mockIo);
      
      const router = gameRoom.getSocketEventRouter();
      expect(router.gameRoom).toBe(gameRoom);
      expect(router.eventBus).toBe(gameRoom.getEventBus());
      expect(router.io).toBe(mockIo);
    });
  });

  describe('Socket Registration', () => {
    beforeEach(() => {
      gameRoom.setSocketServer(mockIo);
    });

    it('should register socket through GameRoom methods', () => {
      const mockSocket = {
        id: 'test_socket',
        emit: jest.fn(),
        on: jest.fn(),
        join: jest.fn()
      };
      
      gameRoom.registerSocket(mockSocket);
      
      const router = gameRoom.getSocketEventRouter();
      expect(router.sockets.has('test_socket')).toBe(true);
      expect(mockSocket.on).toHaveBeenCalled();
      expect(mockSocket.join).toHaveBeenCalledWith('TEST123');
    });

    it('should map player to socket through GameRoom methods', () => {
      gameRoom.mapPlayerSocket('player_123', 'socket_123');
      
      const router = gameRoom.getSocketEventRouter();
      expect(router.playerSockets.get('player_123')).toBe('socket_123');
    });
  });

  describe('EventBus Integration', () => {
    beforeEach(() => {
      gameRoom.setSocketServer(mockIo);
    });

    it('should have EventBus connected to SocketEventRouter', () => {
      const router = gameRoom.getSocketEventRouter();
      const eventBus = gameRoom.getEventBus();
      
      expect(router.eventBus).toBe(eventBus);
    });

    it('should emit events through EventBus and route to sockets', (done) => {
      const mockSocket = {
        id: 'test_socket',
        emit: jest.fn(),
        on: jest.fn(),
        join: jest.fn()
      };
      
      gameRoom.registerSocket(mockSocket);
      gameRoom.mapPlayerSocket('player_123', 'test_socket');
      
      // Emit a controller error event
      gameRoom.getEventBus().emit('controller.error', {
        socketId: 'test_socket',
        message: 'Test error',
        type: 'test_error'
      });
      
      // Give EventBus time to process
      setTimeout(() => {
        expect(mockSocket.emit).toHaveBeenCalledWith('errorMessage', 
          expect.objectContaining({
            message: 'Test error',
            type: 'test_error'
          })
        );
        done();
      }, 10);
    });
  });

  describe('Statistics and Monitoring', () => {
    beforeEach(() => {
      gameRoom.setSocketServer(mockIo);
    });

    it('should track socket statistics', () => {
      const router = gameRoom.getSocketEventRouter();
      const initialStats = router.getStats();
      
      expect(initialStats).toHaveProperty('activeSockets');
      expect(initialStats).toHaveProperty('eventsRouted');
      expect(initialStats).toHaveProperty('commandsProcessed');
      expect(initialStats).toHaveProperty('errorsHandled');
      
      expect(initialStats.activeSockets).toBe(0);
      expect(initialStats.eventsRouted).toBe(0);
    });

    it('should update statistics when sockets are registered', () => {
      const router = gameRoom.getSocketEventRouter();
      
      const mockSocket = {
        id: 'test_socket',
        emit: jest.fn(),
        on: jest.fn(),
        join: jest.fn()
      };
      
      gameRoom.registerSocket(mockSocket);
      
      const stats = router.getStats();
      expect(stats.activeSockets).toBe(1);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      gameRoom.setSocketServer(mockIo);
    });

    it('should handle registration when router is not initialized', () => {
      const uninitializedRoom = new GameRoom('UNINIT');
      const mockSocket = {
        id: 'test_socket',
        emit: jest.fn(),
        on: jest.fn(),
        join: jest.fn()
      };
      
      // Should not throw error
      expect(() => {
        uninitializedRoom.registerSocket(mockSocket);
      }).not.toThrow();
      
      expect(uninitializedRoom.getSocketEventRouter()).toBeNull();
    });
  });

  describe('Controller Integration', () => {
    beforeEach(() => {
      gameRoom.setSocketServer(mockIo);
    });

    it('should provide helper methods for controller events', (done) => {
      const mockSocket = {
        id: 'test_socket',
        emit: jest.fn(),
        on: jest.fn(),
        join: jest.fn()
      };
      
      gameRoom.registerSocket(mockSocket);
      
      // Test game creation event
      gameRoom.getEventBus().emit('controller.gameCreated', {
        socketId: 'test_socket',
        gameCode: 'TEST123'
      });
      
      setTimeout(() => {
        expect(mockSocket.emit).toHaveBeenCalledWith('gameCreated', 
          expect.objectContaining({
            gameCode: 'TEST123'
          })
        );
        done();
      }, 10);
    });
  });
});

describe('Socket Event Mapping', () => {
  let gameRoom;
  let router;
  
  beforeEach(() => {
    gameRoom = new GameRoom('MAPPING_TEST');
    const mockIo = {
      to: jest.fn().mockReturnValue({
        emit: jest.fn()
      })
    };
    gameRoom.setSocketServer(mockIo);
    router = gameRoom.getSocketEventRouter();
  });

  it('should have correct incoming event mappings', () => {
    const incomingMap = router.incomingEventMap;
    
    expect(incomingMap.has('joinGame')).toBe(true);
    expect(incomingMap.has('submitAction')).toBe(true);
    expect(incomingMap.has('useRacialAbility')).toBe(true);
    expect(incomingMap.has('selectAdaptability')).toBe(true);
    expect(incomingMap.has('checkPlayerName')).toBe(true);
    expect(incomingMap.has('getClassAbilities')).toBe(true);
  });

  it('should have correct outgoing event mappings', () => {
    const outgoingMap = router.outgoingEventMap;
    
    expect(outgoingMap.get(EventTypes.GAME.CREATED)).toBe('gameCreated');
    expect(outgoingMap.get(EventTypes.GAME.STARTED)).toBe('gameStarted');
    expect(outgoingMap.get(EventTypes.PLAYER.JOINED)).toBe('playerJoined');
    expect(outgoingMap.get(EventTypes.ACTION.SUBMITTED)).toBe('actionSubmitted');
  });

  it('should validate EventTypes consistency', () => {
    // Verify that all mapped EventTypes actually exist
    const outgoingMap = router.outgoingEventMap;
    
    for (const [eventType, socketEvent] of outgoingMap) {
      if (eventType.includes('.')) {
        const [category, action] = eventType.split('.');
        const categoryObj = EventTypes[category.toUpperCase()];
        
        if (categoryObj) {
          const actionExists = Object.values(categoryObj).includes(eventType);
          expect(actionExists).toBe(true);
        }
      }
    }
  });
});