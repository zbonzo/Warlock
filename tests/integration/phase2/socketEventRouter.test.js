/**
 * @fileoverview Integration tests for SocketEventRouter
 * Tests the Socket.IO event consolidation and EventBus integration
 * Part of Phase 2 Step 4 testing - Socket.IO Event Consolidation
 */
const GameRoom = require('@server/models/GameRoom');
const SocketEventRouter = require('@server/models/events/SocketEventRouter');
const { EventTypes } = require('@server/models/events/EventTypes');

describe('Socket Event Router Integration Tests', () => {
  let gameRoom;
  let socketEventRouter;
  let mockSocket;
  let mockIo;
  
  beforeEach(() => {
    // Create test game room
    gameRoom = new GameRoom('TEST123');
    
    // Mock Socket.IO instances
    mockSocket = {
      id: 'socket_123',
      emit: jest.fn(),
      on: jest.fn(),
      join: jest.fn(),
      disconnect: jest.fn()
    };
    
    mockIo = {
      to: jest.fn().mockReturnValue({
        emit: jest.fn()
      })
    };
    
    // Initialize socket event router
    gameRoom.setSocketServer(mockIo);
    socketEventRouter = gameRoom.getSocketEventRouter();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Socket Registration and Management', () => {
    it('should register socket connections correctly', () => {
      socketEventRouter.registerSocket(mockSocket);
      
      expect(socketEventRouter.sockets.has(mockSocket.id)).toBe(true);
      expect(socketEventRouter.getStats().activeSockets).toBe(1);
      expect(mockSocket.on).toHaveBeenCalled();
    });

    it('should map players to sockets correctly', () => {
      socketEventRouter.registerSocket(mockSocket);
      socketEventRouter.mapPlayerSocket('player_123', mockSocket.id);
      
      expect(socketEventRouter.playerSockets.get('player_123')).toBe(mockSocket.id);
      expect(socketEventRouter.getStats().mappedPlayers).toBe(1);
    });

    it('should handle socket disconnection properly', () => {
      socketEventRouter.registerSocket(mockSocket);
      socketEventRouter.mapPlayerSocket('player_123', mockSocket.id);
      
      // Simulate disconnect by calling the internal method
      socketEventRouter._handleSocketDisconnect(mockSocket);
      
      expect(socketEventRouter.sockets.has(mockSocket.id)).toBe(false);
      expect(socketEventRouter.playerSockets.has('player_123')).toBe(false);
    });
  });

  describe('Event Routing - EventBus to Socket.IO', () => {
    beforeEach(() => {
      socketEventRouter.registerSocket(mockSocket);
      socketEventRouter.mapPlayerSocket('player_123', mockSocket.id);
    });

    it('should route game events to socket clients', () => {
      gameRoom.getEventBus().emit(EventTypes.GAME.STARTED, {
        gameCode: 'TEST123',
        timestamp: new Date().toISOString()
      });
      
      expect(mockIo.to).toHaveBeenCalledWith('TEST123');
      const ioEmit = mockIo.to().emit;
      expect(ioEmit).toHaveBeenCalledWith('gameStarted', expect.any(Object));
    });

    it('should route controller error events', () => {
      gameRoom.getEventBus().emit(EventTypes.CONTROLLER.ERROR, {
        socketId: mockSocket.id,
        message: 'Test error message',
        type: 'validation_error'
      });
      
      expect(mockSocket.emit).toHaveBeenCalledWith('errorMessage', expect.objectContaining({
        type: 'validation_error',
        message: 'Test error message'
      }));
    });

    it('should handle controller game creation events', () => {
      gameRoom.getEventBus().emit(EventTypes.CONTROLLER.GAME_CREATED, {
        socketId: mockSocket.id,
        gameCode: 'TEST123'
      });
      
      expect(mockSocket.emit).toHaveBeenCalledWith('gameCreated', expect.objectContaining({
        gameCode: 'TEST123'
      }));
    });
  });

  describe('Data Transformation', () => {
    beforeEach(() => {
      socketEventRouter.registerSocket(mockSocket);
    });

    it('should transform EventBus data for client consumption', () => {
      const internalData = {
        playerId: 'player_123',
        gameRoom: gameRoom,
        eventBus: gameRoom.getEventBus(),
        sensitiveData: 'secret',
        timestamp: undefined
      };
      
      const transformed = socketEventRouter._transformEventDataForClient(
        EventTypes.PLAYER.JOINED, 
        internalData
      );
      
      expect(transformed).not.toHaveProperty('gameRoom');
      expect(transformed).not.toHaveProperty('eventBus');
      expect(transformed).not.toHaveProperty('sensitiveData');
      expect(transformed).toHaveProperty('timestamp');
      expect(transformed).toHaveProperty('gameCode', 'TEST123');
      expect(transformed.playerId).toBe('player_123');
    });
  });

  describe('Performance and Statistics', () => {
    beforeEach(() => {
      socketEventRouter.registerSocket(mockSocket);
      gameRoom.addPlayer(mockSocket.id, 'TestPlayer');
    });

    it('should track router statistics correctly', () => {
      const initialStats = socketEventRouter.getStats();
      
      // Emit some events
      socketEventRouter.emitToPlayer('player_123', 'testEvent', { test: true });
      socketEventRouter.broadcastToGame('testBroadcast', { test: true });
      
      const finalStats = socketEventRouter.getStats();
      expect(finalStats.eventsRouted).toBeGreaterThan(initialStats.eventsRouted);
    });
  });
});

describe('SocketEventRouter GameRoom Integration', () => {
  let gameRoom;
  let mockIo;
  
  beforeEach(() => {
    gameRoom = new GameRoom('INTEGRATION_TEST');
    mockIo = {
      to: jest.fn().mockReturnValue({
        emit: jest.fn()
      })
    };
  });

  it('should initialize socket event router when setSocketServer is called', () => {
    expect(gameRoom.getSocketEventRouter()).toBeNull();
    
    gameRoom.setSocketServer(mockIo);
    
    expect(gameRoom.getSocketEventRouter()).toBeInstanceOf(SocketEventRouter);
  });

  it('should register sockets through GameRoom methods', () => {
    gameRoom.setSocketServer(mockIo);
    
    const mockSocket = {
      id: 'test_socket',
      emit: jest.fn(),
      on: jest.fn(),
      join: jest.fn()
    };
    
    gameRoom.registerSocket(mockSocket);
    
    const router = gameRoom.getSocketEventRouter();
    expect(router.sockets.has('test_socket')).toBe(true);
  });

  it('should map player sockets through GameRoom methods', () => {
    gameRoom.setSocketServer(mockIo);
    
    gameRoom.mapPlayerSocket('player_123', 'socket_123');
    
    const router = gameRoom.getSocketEventRouter();
    expect(router.playerSockets.get('player_123')).toBe('socket_123');
  });
});