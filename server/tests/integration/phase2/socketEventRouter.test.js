/**
 * @fileoverview Integration tests for SocketEventRouter
 * Tests the Socket.IO event consolidation and EventBus integration
 * Part of Phase 2 Step 4 testing - Socket.IO Event Consolidation
 */
const GameRoom = require('../../../models/GameRoom');
const SocketEventRouter = require('../../../models/events/SocketEventRouter');
const { EventTypes } = require('../../../models/events/EventTypes');
const PlayerActionCommand = require('../../../models/commands/PlayerActionCommand');
const AbilityCommand = require('../../../models/commands/AbilityCommand');

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
      expect(mockSocket.join).toHaveBeenCalledWith('TEST123');
    });

    it('should map players to sockets correctly', () => {
      socketEventRouter.registerSocket(mockSocket);
      socketEventRouter.mapPlayerSocket('player_123', mockSocket.id);
      
      expect(socketEventRouter.playerSockets.get('player_123')).to.equal(mockSocket.id);
      expect(socketEventRouter.getStats().mappedPlayers).to.equal(1);
    });

    it('should handle socket disconnection properly', () => {
      socketEventRouter.registerSocket(mockSocket);
      socketEventRouter.mapPlayerSocket('player_123', mockSocket.id);
      
      // Simulate disconnect
      const disconnectHandler = mockSocket.on.getCalls()
        .find(call => call.args[0] === 'disconnect')?.args[1];
      
      expect(disconnectHandler).to.exist;
      disconnectHandler();
      
      expect(socketEventRouter.sockets.has(mockSocket.id)).to.be.false;
      expect(socketEventRouter.playerSockets.has('player_123')).to.be.false;
    });
  });

  describe('Event Routing - Socket.IO to EventBus', () => {
    beforeEach(() => {
      socketEventRouter.registerSocket(mockSocket);
      gameRoom.addPlayer(mockSocket.id, 'TestPlayer');
    });

    it('should route join game events to EventBus', async () => {
      const eventSpy = sinon.spy();
      gameRoom.getEventBus().on(EventTypes.PLAYER.JOINED, eventSpy);
      
      const joinHandler = mockSocket.on.getCalls()
        .find(call => call.args[0] === 'joinGame')?.args[1];
      
      expect(joinHandler).to.exist;
      await joinHandler({
        gameCode: 'TEST123',
        playerName: 'NewPlayer'
      });
      
      expect(eventSpy.calledOnce).to.be.true;
      expect(eventSpy.firstCall.args[0]).to.include({
        socketId: mockSocket.id,
        playerName: 'NewPlayer',
        gameCode: 'TEST123'
      });
    });

    it('should route submit action events through command processor', async () => {
      const commandSpy = sinon.spy(socketEventRouter.commandProcessor, 'submitCommand');
      
      const actionHandler = mockSocket.on.getCalls()
        .find(call => call.args[0] === 'submitAction')?.args[1];
      
      expect(actionHandler).to.exist;
      await actionHandler({
        actionType: 'attack',
        targetId: 'target_123',
        gameCode: 'TEST123'
      });
      
      expect(commandSpy.calledOnce).to.be.true;
      const command = commandSpy.firstCall.args[0];
      expect(command).to.be.instanceOf(PlayerActionCommand);
      expect(command.actionType).to.equal('attack');
      expect(command.targetId).to.equal('target_123');
    });

    it('should handle ability actions through AbilityCommand', async () => {
      const commandSpy = sinon.spy(socketEventRouter.commandProcessor, 'submitCommand');
      
      const actionHandler = mockSocket.on.getCalls()
        .find(call => call.args[0] === 'submitAction')?.args[1];
      
      await actionHandler({
        actionType: 'ability',
        targetId: 'fireball',
        gameCode: 'TEST123'
      });
      
      expect(commandSpy.calledOnce).to.be.true;
      const command = commandSpy.firstCall.args[0];
      expect(command).to.be.instanceOf(AbilityCommand);
      expect(command.abilityName).to.equal('fireball');
    });

    it('should emit action submission success response', async () => {
      const actionHandler = mockSocket.on.getCalls()
        .find(call => call.args[0] === 'submitAction')?.args[1];
      
      await actionHandler({
        actionType: 'attack',
        targetId: 'target_123',
        gameCode: 'TEST123'
      });
      
      expect(mockSocket.emit.calledWith('actionSubmitted')).to.be.true;
      const emitCall = mockSocket.emit.getCalls()
        .find(call => call.args[0] === 'actionSubmitted');
      
      expect(emitCall.args[1]).to.include({
        actionType: 'attack',
        targetId: 'target_123',
        success: true
      });
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
      
      expect(mockIo.to.calledWith('TEST123')).to.be.true;
      const ioEmit = mockIo.to().emit;
      expect(ioEmit.calledWith('gameStarted')).to.be.true;
    });

    it('should route player-specific events to individual sockets', () => {
      gameRoom.getEventBus().emit(EventTypes.PLAYER.NAME_CHECK, {
        socketId: mockSocket.id,
        isValid: true,
        error: null
      });
      
      expect(mockSocket.emit.calledWith('nameCheckResponse')).to.be.true;
      const responseData = mockSocket.emit.getCall(0).args[1];
      expect(responseData).to.include({
        isAvailable: true,
        error: null
      });
    });

    it('should handle controller error events', () => {
      gameRoom.getEventBus().emit('controller.error', {
        socketId: mockSocket.id,
        message: 'Test error message',
        type: 'validation_error'
      });
      
      expect(mockSocket.emit.calledWith('errorMessage')).to.be.true;
      const errorData = mockSocket.emit.getCall(0).args[1];
      expect(errorData).to.include({
        type: 'validation_error',
        message: 'Test error message'
      });
    });

    it('should handle controller game creation events', () => {
      gameRoom.getEventBus().emit('controller.gameCreated', {
        socketId: mockSocket.id,
        gameCode: 'TEST123'
      });
      
      expect(mockSocket.emit.calledWith('gameCreated')).to.be.true;
      const gameData = mockSocket.emit.getCall(0).args[1];
      expect(gameData).to.include({
        gameCode: 'TEST123'
      });
    });
  });

  describe('Validation Integration', () => {
    beforeEach(() => {
      socketEventRouter.registerSocket(mockSocket);
    });

    it('should apply validation middleware to socket events', async () => {
      // Mock validation failure
      const validationSpy = sinon.stub(socketEventRouter.validator, 'validate')
        .returns(() => () => false);
      
      const joinHandler = mockSocket.on.getCalls()
        .find(call => call.args[0] === 'joinGame')?.args[1];
      
      await joinHandler({
        gameCode: 'INVALID',
        playerName: ''
      });
      
      // Should not proceed to handler due to validation failure
      expect(mockSocket.emit.calledWith('validationError')).to.be.true;
    });

    it('should process valid events after successful validation', async () => {
      const eventSpy = sinon.spy();
      gameRoom.getEventBus().on(EventTypes.PLAYER.JOINED, eventSpy);
      
      const joinHandler = mockSocket.on.getCalls()
        .find(call => call.args[0] === 'joinGame')?.args[1];
      
      await joinHandler({
        gameCode: 'TEST123',
        playerName: 'ValidPlayer'
      });
      
      expect(eventSpy.calledOnce).to.be.true;
    });
  });

  describe('Error Handling and Recovery', () => {
    beforeEach(() => {
      socketEventRouter.registerSocket(mockSocket);
    });

    it('should handle missing players gracefully', async () => {
      const actionHandler = mockSocket.on.getCalls()
        .find(call => call.args[0] === 'submitAction')?.args[1];
      
      // Remove player before action submission
      gameRoom.removePlayer(mockSocket.id);
      
      await actionHandler({
        actionType: 'attack',
        targetId: 'target_123',
        gameCode: 'TEST123'
      });
      
      expect(mockSocket.emit.calledWith('errorMessage')).to.be.true;
      const errorData = mockSocket.emit.getCalls()
        .find(call => call.args[0] === 'errorMessage')?.args[1];
      expect(errorData.message).to.include('Player not found');
    });

    it('should handle command processing errors', async () => {
      // Mock command processor to throw error
      sinon.stub(socketEventRouter.commandProcessor, 'submitCommand')
        .throws(new Error('Command processing failed'));
      
      const actionHandler = mockSocket.on.getCalls()
        .find(call => call.args[0] === 'submitAction')?.args[1];
      
      gameRoom.addPlayer(mockSocket.id, 'TestPlayer');
      
      await actionHandler({
        actionType: 'attack',
        targetId: 'target_123',
        gameCode: 'TEST123'
      });
      
      expect(mockSocket.emit.calledWith('errorMessage')).to.be.true;
      expect(socketEventRouter.getStats().errorsHandled).to.be.greaterThan(0);
    });
  });

  describe('Performance and Statistics', () => {
    beforeEach(() => {
      socketEventRouter.registerSocket(mockSocket);
      gameRoom.addPlayer(mockSocket.id, 'TestPlayer');
    });

    it('should track router statistics correctly', async () => {
      const initialStats = socketEventRouter.getStats();
      
      // Emit some events
      socketEventRouter.emitToPlayer('player_123', 'testEvent', { test: true });
      socketEventRouter.broadcastToGame('testBroadcast', { test: true });
      
      const finalStats = socketEventRouter.getStats();
      expect(finalStats.eventsRouted).to.be.greaterThan(initialStats.eventsRouted);
    });

    it('should update command processing statistics', async () => {
      const actionHandler = mockSocket.on.getCalls()
        .find(call => call.args[0] === 'submitAction')?.args[1];
      
      const initialStats = socketEventRouter.getStats();
      
      await actionHandler({
        actionType: 'attack',
        targetId: 'target_123',
        gameCode: 'TEST123'
      });
      
      const finalStats = socketEventRouter.getStats();
      expect(finalStats.commandsProcessed).to.be.greaterThan(initialStats.commandsProcessed);
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
      
      expect(transformed).to.not.have.property('gameRoom');
      expect(transformed).to.not.have.property('eventBus');
      expect(transformed).to.not.have.property('sensitiveData');
      expect(transformed).to.have.property('timestamp');
      expect(transformed).to.have.property('gameCode', 'TEST123');
      expect(transformed.playerId).to.equal('player_123');
    });
  });
});

describe('SocketEventRouter GameRoom Integration', () => {
  let gameRoom;
  let mockIo;
  
  beforeEach(() => {
    gameRoom = new GameRoom('INTEGRATION_TEST');
    mockIo = {
      to: sinon.stub().returns({
        emit: sinon.spy()
      })
    };
  });

  it('should initialize socket event router when setSocketServer is called', () => {
    expect(gameRoom.getSocketEventRouter()).to.be.null;
    
    gameRoom.setSocketServer(mockIo);
    
    expect(gameRoom.getSocketEventRouter()).to.be.instanceOf(SocketEventRouter);
  });

  it('should register sockets through GameRoom methods', () => {
    gameRoom.setSocketServer(mockIo);
    
    const mockSocket = {
      id: 'test_socket',
      emit: sinon.spy(),
      on: sinon.spy(),
      join: sinon.spy()
    };
    
    gameRoom.registerSocket(mockSocket);
    
    const router = gameRoom.getSocketEventRouter();
    expect(router.sockets.has('test_socket')).to.be.true;
  });

  it('should map player sockets through GameRoom methods', () => {
    gameRoom.setSocketServer(mockIo);
    
    gameRoom.mapPlayerSocket('player_123', 'socket_123');
    
    const router = gameRoom.getSocketEventRouter();
    expect(router.playerSockets.get('player_123')).to.equal('socket_123');
  });
});