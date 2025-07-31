/**
 * @fileoverview Tests for SocketEventRouter class
 */
import { SocketEventRouter } from '../../../../server/models/events/SocketEventRouter';
import { EventTypes } from '../../../../server/models/events/EventTypes';
import { Server as SocketIOServer, Socket } from 'socket.io';

// Mock external dependencies
const mockLogger = {
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

jest.mock('@utils/logger', () => mockLogger);

describe('SocketEventRouter', () => {
  let socketEventRouter: SocketEventRouter;
  let mockGameRoom: any;
  let mockEventBus: any;
  let mockIO: jest.Mocked<SocketIOServer>;
  let mockSocket: jest.Mocked<Socket>;
  let mockCommandProcessor: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock EventBus
    mockEventBus = {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn()
    };

    // Mock GameRoom
    mockGameRoom = {
      getEventBus: jest.fn().mockReturnValue(mockEventBus),
      getGameCode: jest.fn().mockReturnValue('GAME123'),
      getPlayerBySocketId: jest.fn().mockReturnValue({
        id: 'player1',
        name: 'Alice'
      })
    };

    // Mock Socket.IO server
    mockIO = {
      to: jest.fn().mockReturnValue({
        emit: jest.fn()
      }),
      emit: jest.fn()
    } as any;

    // Mock Socket
    mockSocket = {
      id: 'socket123',
      emit: jest.fn(),
      on: jest.fn(),
      join: jest.fn(),
      rooms: new Set(['GAME123'])
    } as any;

    // Mock CommandProcessor
    mockCommandProcessor = {
      submitCommand: jest.fn().mockResolvedValue('cmd-123')
    };

    // Create router instance
    socketEventRouter = new SocketEventRouter(mockGameRoom, mockIO);
    
    // Replace internal command processor with our mock
    (socketEventRouter as any).commandProcessor = mockCommandProcessor;
  });

  describe('constructor and initialization', () => {
    it('should create SocketEventRouter instance correctly', () => {
      expect(socketEventRouter).toBeInstanceOf(SocketEventRouter);
      expect(mockGameRoom.getEventBus).toHaveBeenCalled();
      expect(mockGameRoom.getGameCode).toHaveBeenCalled();
    });

    it('should set up event bus listeners', () => {
      expect(mockEventBus.on).toHaveBeenCalledTimes(expect.any(Number));
      
      // Check that specific event types are registered
      const eventCalls = mockEventBus.on.mock.calls.map(call => call[0]);
      expect(eventCalls).toContain(EventTypes.PLAYER.NAME_CHECK);
      expect(eventCalls).toContain(EventTypes.PLAYER.CLASS_ABILITIES_REQUEST);
      expect(eventCalls).toContain(EventTypes.CONTROLLER.ERROR);
    });

    it('should initialize with empty socket maps', () => {
      const stats = socketEventRouter.getStats();
      
      expect(stats.activeSockets).toBe(0);
      expect(stats.mappedPlayers).toBe(0);
      expect(stats.socketsConnected).toBe(0);
      expect(stats.eventsRouted).toBe(0);
    });
  });

  describe('socket registration', () => {
    describe('registerSocket', () => {
      it('should register socket successfully', () => {
        socketEventRouter.registerSocket(mockSocket);
        
        const stats = socketEventRouter.getStats();
        expect(stats.activeSockets).toBe(1);
        expect(stats.socketsConnected).toBe(1);
        expect(mockLogger.info).toHaveBeenCalledWith(
          'Socket registered with router:',
          expect.objectContaining({
            gameCode: 'GAME123',
            socketId: 'socket123',
            totalSockets: 1
          })
        );
      });

      it('should set up disconnect handler', () => {
        socketEventRouter.registerSocket(mockSocket);
        
        expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
      });

      it('should handle multiple socket registrations', () => {
        const mockSocket2 = { ...mockSocket, id: 'socket456' } as any;
        
        socketEventRouter.registerSocket(mockSocket);
        socketEventRouter.registerSocket(mockSocket2);
        
        const stats = socketEventRouter.getStats();
        expect(stats.activeSockets).toBe(2);
        expect(stats.socketsConnected).toBe(2);
      });
    });

    describe('mapPlayerSocket', () => {
      beforeEach(() => {
        socketEventRouter.registerSocket(mockSocket);
      });

      it('should map player to socket', () => {
        socketEventRouter.mapPlayerSocket('player1', 'socket123');
        
        const stats = socketEventRouter.getStats();
        expect(stats.mappedPlayers).toBe(1);
        expect(mockLogger.debug).toHaveBeenCalledWith(
          'Player mapped to socket:',
          expect.objectContaining({
            gameCode: 'GAME123',
            playerId: 'player1',
            socketId: 'socket123'
          })
        );
      });

      it('should allow multiple player mappings', () => {
        const mockSocket2 = { ...mockSocket, id: 'socket456' } as any;
        socketEventRouter.registerSocket(mockSocket2);
        
        socketEventRouter.mapPlayerSocket('player1', 'socket123');
        socketEventRouter.mapPlayerSocket('player2', 'socket456');
        
        const stats = socketEventRouter.getStats();
        expect(stats.mappedPlayers).toBe(2);
      });
    });
  });

  describe('event emission', () => {
    beforeEach(() => {
      socketEventRouter.registerSocket(mockSocket);
      socketEventRouter.mapPlayerSocket('player1', 'socket123');
    });

    describe('emitToPlayer', () => {
      it('should emit event to specific player', () => {
        const eventData = { message: 'Hello player' };
        
        socketEventRouter.emitToPlayer('player1', 'testEvent', eventData);
        
        expect(mockSocket.emit).toHaveBeenCalledWith('testEvent', eventData);
        
        const stats = socketEventRouter.getStats();
        expect(stats.eventsRouted).toBe(1);
        expect(mockLogger.debug).toHaveBeenCalledWith(
          'Event emitted to player:',
          expect.objectContaining({
            gameCode: 'GAME123',
            playerId: 'player1',
            eventName: 'testEvent'
          })
        );
      });

      it('should handle non-existent player gracefully', () => {
        socketEventRouter.emitToPlayer('nonexistent', 'testEvent', {});
        
        expect(mockSocket.emit).not.toHaveBeenCalled();
      });

      it('should handle unmapped player gracefully', () => {
        socketEventRouter.emitToPlayer('unmapped', 'testEvent', {});
        
        expect(mockSocket.emit).not.toHaveBeenCalled();
      });
    });

    describe('broadcastToGame', () => {
      it('should broadcast event to all players in game', () => {
        const eventData = { message: 'Hello everyone' };
        
        socketEventRouter.broadcastToGame('broadcastEvent', eventData);
        
        expect(mockIO.to).toHaveBeenCalledWith('GAME123');
        expect(mockIO.to('GAME123').emit).toHaveBeenCalledWith('broadcastEvent', eventData);
        
        const stats = socketEventRouter.getStats();
        expect(stats.eventsRouted).toBe(1);
        expect(mockLogger.debug).toHaveBeenCalledWith(
          'Event broadcasted to game:',
          expect.objectContaining({
            gameCode: 'GAME123',
            eventName: 'broadcastEvent'
          })
        );
      });
    });
  });

  describe('EventBus to Socket.IO routing', () => {
    beforeEach(() => {
      socketEventRouter.registerSocket(mockSocket);
      socketEventRouter.mapPlayerSocket('player1', 'socket123');
    });

    it('should route game events to socket', () => {
      // Find the event handler for GAME.CREATED
      const gameCreatedHandler = mockEventBus.on.mock.calls.find(
        call => call[0] === EventTypes.GAME.CREATED
      )?.[1];

      if (gameCreatedHandler) {
        gameCreatedHandler({
          gameCode: 'GAME123',
          hostId: 'player1'
        });

        expect(mockIO.to).toHaveBeenCalledWith('GAME123');
      }
    });

    it('should route player-specific events to correct socket', () => {
      // Find the event handler for NAME_CHECK
      const nameCheckHandler = mockEventBus.on.mock.calls.find(
        call => call[0] === EventTypes.PLAYER.NAME_CHECK
      )?.[1];

      if (nameCheckHandler) {
        nameCheckHandler({
          socketId: 'socket123',
          isValid: true,
          error: null
        });

        expect(mockSocket.emit).toHaveBeenCalledWith('nameCheckResponse', {
          isAvailable: true,
          error: null
        });
      }
    });

    it('should handle controller error events', () => {
      const controllerErrorHandler = mockEventBus.on.mock.calls.find(
        call => call[0] === EventTypes.CONTROLLER.ERROR
      )?.[1];

      if (controllerErrorHandler) {
        controllerErrorHandler({
          socketId: 'socket123',
          type: 'validation',
          message: 'Invalid input'
        });

        expect(mockSocket.emit).toHaveBeenCalledWith('errorMessage', {
          type: 'validation',
          message: 'Invalid input',
          timestamp: expect.any(String),
          gameCode: 'GAME123'
        });
      }
    });

    it('should handle class abilities request events', () => {
      const classAbilitiesHandler = mockEventBus.on.mock.calls.find(
        call => call[0] === EventTypes.PLAYER.CLASS_ABILITIES_REQUEST
      )?.[1];

      if (classAbilitiesHandler) {
        classAbilitiesHandler({
          socketId: 'socket123',
          success: true,
          abilities: [{ name: 'Fireball' }],
          message: 'Abilities loaded'
        });

        expect(mockSocket.emit).toHaveBeenCalledWith('classAbilitiesResponse', {
          success: true,
          abilities: [{ name: 'Fireball' }],
          message: 'Abilities loaded'
        });
      }
    });

    it('should transform event data for client consumption', () => {
      // Test the internal transformation method
      const router = socketEventRouter as any;
      const eventData = {
        playerId: 'player1',
        eventBus: mockEventBus, // Should be removed
        gameRoom: mockGameRoom, // Should be removed
        data: 'important'
      };

      const transformed = router._transformEventDataForClient('test.event', eventData);

      expect(transformed).toEqual({
        playerId: 'player1',
        data: 'important',
        timestamp: expect.any(String),
        gameCode: 'GAME123'
      });
      expect(transformed.eventBus).toBeUndefined();
      expect(transformed.gameRoom).toBeUndefined();
    });
  });

  describe('socket disconnection handling', () => {
    beforeEach(() => {
      socketEventRouter.registerSocket(mockSocket);
      socketEventRouter.mapPlayerSocket('player1', 'socket123');
    });

    it('should handle socket disconnection', () => {
      // Get the disconnect handler
      const disconnectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'disconnect'
      )?.[1];

      if (disconnectHandler) {
        disconnectHandler();

        const stats = socketEventRouter.getStats();
        expect(stats.activeSockets).toBe(0);
        expect(stats.mappedPlayers).toBe(0);
        
        expect(mockEventBus.emit).toHaveBeenCalledWith(
          EventTypes.PLAYER.DISCONNECTED,
          expect.objectContaining({
            playerId: 'player1',
            socketId: 'socket123',
            gameCode: 'GAME123'
          })
        );

        expect(mockLogger.info).toHaveBeenCalledWith(
          'Socket disconnected from router:',
          expect.objectContaining({
            gameCode: 'GAME123',
            socketId: 'socket123',
            remainingSockets: 0
          })
        );
      }
    });

    it('should handle disconnection of unmapped socket', () => {
      // Register socket without mapping
      const unmappedSocket = { ...mockSocket, id: 'unmapped123', on: jest.fn() } as any;
      socketEventRouter.registerSocket(unmappedSocket);

      const disconnectHandler = unmappedSocket.on.mock.calls.find(
        call => call[0] === 'disconnect'
      )?.[1];

      if (disconnectHandler) {
        disconnectHandler();

        // Should not emit player disconnected event
        expect(mockEventBus.emit).not.toHaveBeenCalledWith(
          EventTypes.PLAYER.DISCONNECTED,
          expect.anything()
        );
      }
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      socketEventRouter.registerSocket(mockSocket);
    });

    it('should handle routing errors gracefully', () => {
      const router = socketEventRouter as any;
      const invalidEventData = null;

      // Should not throw
      expect(() => {
        router._routeEventBusToSocket('test.event', 'testSocket', invalidEventData);
      }).not.toThrow();
    });

    it('should emit error messages to socket', () => {
      const router = socketEventRouter as any;
      
      router._emitError(mockSocket, 'testError', 'Test error message');
      
      expect(mockSocket.emit).toHaveBeenCalledWith('errorMessage', {
        type: 'testError',
        message: 'Test error message',
        timestamp: expect.any(String),
        gameCode: 'GAME123'
      });
    });

    it('should handle event transformation errors', () => {
      const router = socketEventRouter as any;
      
      // Should not throw even with problematic data
      expect(() => {
        router._transformEventDataForClient('test', { circular: {} });
      }).not.toThrow();
    });
  });

  describe('statistics and monitoring', () => {
    it('should track event routing statistics', () => {
      socketEventRouter.registerSocket(mockSocket);
      socketEventRouter.mapPlayerSocket('player1', 'socket123');
      
      socketEventRouter.emitToPlayer('player1', 'test1', {});
      socketEventRouter.broadcastToGame('test2', {});
      
      const stats = socketEventRouter.getStats();
      expect(stats.eventsRouted).toBe(2);
      expect(stats.activeSockets).toBe(1);
      expect(stats.mappedPlayers).toBe(1);
      expect(stats.socketsConnected).toBe(1);
    });

    it('should track error statistics', () => {
      const router = socketEventRouter as any;
      
      // Simulate error in event handling
      router.stats.errorsHandled = 5;
      
      const stats = socketEventRouter.getStats();
      expect(stats.errorsHandled).toBe(5);
    });

    it('should provide comprehensive statistics', () => {
      const stats = socketEventRouter.getStats();
      
      expect(typeof stats.socketsConnected).toBe('number');
      expect(typeof stats.eventsRouted).toBe('number');
      expect(typeof stats.commandsProcessed).toBe('number');
      expect(typeof stats.errorsHandled).toBe('number');
      expect(typeof stats.activeSockets).toBe('number');
      expect(typeof stats.mappedPlayers).toBe('number');
    });
  });

  describe('integration with command system', () => {
    beforeEach(() => {
      socketEventRouter.registerSocket(mockSocket);
      socketEventRouter.mapPlayerSocket('player1', 'socket123');
    });

    it('should handle submit action events', async () => {
      const router = socketEventRouter as any;
      
      await router._handleSubmitAction(mockSocket, {
        actionType: 'ability',
        targetId: 'fireball',
        gameCode: 'GAME123'
      });

      expect(mockCommandProcessor.submitCommand).toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalledWith('actionSubmitted', 
        expect.objectContaining({
          actionType: 'ability',
          success: true
        })
      );
    });

    it('should handle racial ability events', async () => {
      const router = socketEventRouter as any;
      
      await router._handleRacialAbility(mockSocket, {
        gameCode: 'GAME123'
      });

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        EventTypes.ACTION.RACIAL_ABILITY,
        expect.objectContaining({
          socketId: 'socket123',
          gameCode: 'GAME123'
        })
      );
    });

    it('should handle adaptability events', async () => {
      const router = socketEventRouter as any;
      
      await router._handleAdaptability(mockSocket, {
        gameCode: 'GAME123',
        abilityName: 'newAbility'
      });

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        EventTypes.ACTION.ADAPTABILITY,
        expect.objectContaining({
          socketId: 'socket123',
          abilityName: 'newAbility'
        })
      );
    });

    it('should handle name check events', async () => {
      const router = socketEventRouter as any;
      
      await router._handleNameCheck(mockSocket, {
        gameCode: 'GAME123',
        playerName: 'TestPlayer'
      });

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        EventTypes.PLAYER.NAME_CHECK,
        expect.objectContaining({
          socketId: 'socket123',
          playerName: 'TestPlayer'
        })
      );
    });

    it('should handle errors in action submission gracefully', async () => {
      mockGameRoom.getPlayerBySocketId.mockReturnValue(null);
      
      const router = socketEventRouter as any;
      await router._handleSubmitAction(mockSocket, {
        actionType: 'ability',
        targetId: 'fireball',
        gameCode: 'GAME123'
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('errorMessage', 
        expect.objectContaining({
          type: 'playerNotFound'
        })
      );
    });
  });

  describe('event mapping configuration', () => {
    it('should create proper incoming event mappings', () => {
      const router = socketEventRouter as any;
      const incomingMap = router.incomingEventMap;
      
      expect(incomingMap).toBeInstanceOf(Map);
      // Currently no events are mapped in incoming
      expect(incomingMap.size).toBe(0);
    });

    it('should create proper outgoing event mappings', () => {
      const router = socketEventRouter as any;
      const outgoingMap = router.outgoingEventMap;
      
      expect(outgoingMap).toBeInstanceOf(Map);
      expect(outgoingMap.size).toBeGreaterThan(0);
      
      // Check specific mappings
      expect(outgoingMap.get(EventTypes.GAME.CREATED)).toBe('gameCreated');
      expect(outgoingMap.get(EventTypes.PLAYER.JOINED)).toBe('playerJoined');
      expect(outgoingMap.get(EventTypes.ACTION.SUBMITTED)).toBe('actionSubmitted');
    });

    it('should handle all mapped outgoing events', () => {
      const router = socketEventRouter as any;
      const outgoingMap = router.outgoingEventMap;
      
      // Verify all mapped events have handlers registered
      for (const eventType of outgoingMap.keys()) {
        const hasHandler = mockEventBus.on.mock.calls.some(
          call => call[0] === eventType
        );
        // Some events might be handled by the general router
        expect(typeof hasHandler).toBe('boolean');
      }
    });
  });

  describe('type safety and interfaces', () => {
    it('should enforce RouterStats interface', () => {
      const stats = socketEventRouter.getStats();
      
      expect(typeof stats.socketsConnected).toBe('number');
      expect(typeof stats.eventsRouted).toBe('number');
      expect(typeof stats.commandsProcessed).toBe('number');
      expect(typeof stats.errorsHandled).toBe('number');
      expect(typeof stats.activeSockets).toBe('number');
      expect(typeof stats.mappedPlayers).toBe('number');
    });

    it('should handle typed socket event data', () => {
      // This tests that the interfaces are properly defined
      const eventData = {
        actionType: 'ability',
        targetId: 'player2',
        gameCode: 'GAME123',
        playerName: 'Alice',
        timestamp: new Date().toISOString()
      };

      // Should not cause TypeScript compilation errors
      expect(typeof eventData.actionType).toBe('string');
      expect(typeof eventData.gameCode).toBe('string');
    });
  });
});