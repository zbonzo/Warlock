/**
 * @fileoverview Integration tests for Phase 2 Event-Driven Architecture
 * Tests complete integration between EventBus, Commands, and GameRoom systems
 * Verifies Phase 2 Steps 1 and 2 completion
 */
const { GameRoom } = require('../../../server/models/GameRoom');
const CommandProcessor = require('../../../server/models/commands/CommandProcessor');
const AbilityCommand = require('../../../server/models/commands/AbilityCommand');
const { EventTypes } = require('../../../server/models/events/EventTypes');
const EventMiddleware = require('../../../server/models/events/EventMiddleware');

// Mock external dependencies
jest.mock('../../../server/utils/logger');
jest.mock('../../../server/config');

describe('Phase 2 Event-Driven Architecture Integration', () => {
  let gameRoom;
  let eventBus;
  let commandProcessor;
  let mockPlayers;

  beforeEach(async () => {
    // Create a real game room with event bus
    gameRoom = new GameRoom('TEST_PHASE2');
    eventBus = gameRoom.getEventBus();
    commandProcessor = new CommandProcessor(gameRoom);

    // Create mock players
    mockPlayers = [
      {
        id: 'player1',
        name: 'Alice',
        race: 'human',
        class: 'warrior',
        isAlive: true,
        abilities: [
          { id: 'sword_strike', type: 'attack', target: 'Single', cooldown: 0 }
        ],
        unlocked: [
          { id: 'sword_strike', type: 'attack' }
        ],
        playerAbilities: {
          isOnCooldown: jest.fn().mockReturnValue(false),
          setCooldown: jest.fn()
        }
      },
      {
        id: 'player2',
        name: 'Bob',
        race: 'dwarf',
        class: 'cleric',
        isAlive: true,
        abilities: [
          { id: 'heal', type: 'healing', target: 'Single', cooldown: 0 }
        ],
        unlocked: [
          { id: 'heal', type: 'healing' }
        ],
        playerAbilities: {
          isOnCooldown: jest.fn().mockReturnValue(false),
          setCooldown: jest.fn()
        }
      }
    ];

    // Add players to game room
    mockPlayers.forEach(player => {
      gameRoom.players.set(player.id, player);
      gameRoom.getPlayerById = jest.fn().mockImplementation(id => {
        return mockPlayers.find(p => p.id === id) || null;
      });
    });

    // Set up game room for action phase
    gameRoom.phase = 'action';
    gameRoom.started = true;

    // Mock systems
    gameRoom.systems = {
      abilityRegistry: {
        executePlayerAbility: jest.fn().mockResolvedValue({ 
          success: true,
          damage: 15,
          message: 'Attack successful!'
        })
      }
    };
  });

  afterEach(() => {
    if (gameRoom) {
      gameRoom.destroy();
    }
    if (commandProcessor) {
      commandProcessor.destroy();
    }
  });

  describe('Step 1: Core Event Infrastructure Verification', () => {
    test('should have EventBus integrated with GameRoom', () => {
      expect(gameRoom.eventBus).toBeDefined();
      expect(gameRoom.getEventBus()).toBe(gameRoom.eventBus);
      expect(gameRoom.eventBus.gameCode).toBe('TEST_PHASE2');
    });

    test('should have EventTypes schema defined', () => {
      expect(EventTypes.GAME).toBeDefined();
      expect(EventTypes.PLAYER).toBeDefined();
      expect(EventTypes.ACTION).toBeDefined();
      expect(EventTypes.ABILITY).toBeDefined();
      expect(EventTypes.COMBAT).toBeDefined();
      expect(EventTypes.PHASE).toBeDefined();
    });

    test('should have EventMiddleware framework available', () => {
      expect(EventMiddleware.createStandardStack).toBeDefined();
      expect(EventMiddleware.validation).toBeDefined();
      expect(EventMiddleware.logging).toBeDefined();
      expect(EventMiddleware.performance).toBeDefined();
    });

    test('should emit events for game lifecycle', async () => {
      const eventEmitted = jest.fn();
      eventBus.on(EventTypes.GAME.CREATED, eventEmitted);

      await gameRoom.emitEvent(EventTypes.GAME.CREATED, {
        gameCode: 'TEST_PHASE2',
        timestamp: new Date().toISOString()
      });

      expect(eventEmitted).toHaveBeenCalledTimes(1);
      expect(eventEmitted.mock.calls[0][0].data.gameCode).toBe('TEST_PHASE2');
    });
  });

  describe('Step 2: Player Action Commands Verification', () => {
    test('should have CommandProcessor integrated with GameRoom', () => {
      expect(commandProcessor.gameRoom).toBe(gameRoom);
      expect(commandProcessor.eventBus).toBe(eventBus);
    });

    test('should process ability commands through command pattern', async () => {
      const command = new AbilityCommand('player1', 'sword_strike', {
        targetId: 'player2'
      });

      const commandId = await commandProcessor.submitCommand(command);
      expect(commandId).toBe(command.id);

      // Verify command is in pending queue
      const pendingCommands = commandProcessor.getPendingCommands('player1');
      expect(pendingCommands).toContain(command);
      expect(pendingCommands[0].actionType).toBe('ability');
    });

    test('should validate commands before execution', async () => {
      // Valid command
      const validCommand = new AbilityCommand('player1', 'sword_strike', {
        targetId: 'player2'
      });

      const gameContext = {
        game: gameRoom,
        systems: gameRoom.systems,
        eventBus: eventBus
      };

      const isValid = await validCommand.validate(gameContext);
      expect(isValid).toBe(true);
      expect(validCommand.validationErrors).toHaveLength(0);

      // Invalid command (nonexistent ability)
      const invalidCommand = new AbilityCommand('player1', 'nonexistent_ability');
      const isInvalid = await invalidCommand.validate(gameContext);
      expect(isInvalid).toBe(false);
      expect(invalidCommand.validationErrors.length).toBeGreaterThan(0);
    });

    test('should emit events during command lifecycle', async () => {
      const submittedEvents = [];
      const executedEvents = [];

      eventBus.on(EventTypes.ACTION.SUBMITTED, (event) => {
        submittedEvents.push(event);
      });

      eventBus.on(EventTypes.ACTION.EXECUTED, (event) => {
        executedEvents.push(event);
      });

      const command = new AbilityCommand('player1', 'sword_strike', {
        targetId: 'player2'
      });

      // Submit command
      await commandProcessor.submitCommand(command);
      expect(submittedEvents).toHaveLength(1);
      expect(submittedEvents[0].data.playerId).toBe('player1');
      expect(submittedEvents[0].data.abilityId).toBe('sword_strike');

      // Process commands (simulate resolution phase)
      await commandProcessor.processCommands();
      expect(executedEvents).toHaveLength(1);
      expect(executedEvents[0].data.playerId).toBe('player1');
    });
  });

  describe('End-to-End Event-Driven Flow', () => {
    test('should handle complete player action flow through events', async () => {
      const eventLog = [];
      
      // Track all relevant events
      [
        EventTypes.ACTION.SUBMITTED,
        EventTypes.ACTION.EXECUTED,
        EventTypes.ABILITY.USED,
        EventTypes.COMBAT.DAMAGE_DEALT
      ].forEach(eventType => {
        eventBus.on(eventType, (event) => {
          eventLog.push({
            type: event.type,
            playerId: event.data.playerId,
            timestamp: event.timestamp
          });
        });
      });

      // Submit player action
      const commandId = await commandProcessor.submitAbilityCommand('player1', 'sword_strike', {
        targetId: 'player2'
      });

      expect(commandId).toBeDefined();

      // Process the command
      await commandProcessor.processCommands();

      // Verify event flow
      expect(eventLog.length).toBeGreaterThanOrEqual(2);
      expect(eventLog[0].type).toBe(EventTypes.ACTION.SUBMITTED);
      expect(eventLog[0].playerId).toBe('player1');
      
      const executedEvent = eventLog.find(e => e.type === EventTypes.ACTION.EXECUTED);
      expect(executedEvent).toBeDefined();
      expect(executedEvent.playerId).toBe('player1');
    });

    test('should support multiple players submitting actions concurrently', async () => {
      const player1Command = commandProcessor.submitAbilityCommand('player1', 'sword_strike', {
        targetId: 'player2'
      });

      const player2Command = commandProcessor.submitAbilityCommand('player2', 'heal', {
        targetId: 'player1'
      });

      const [command1Id, command2Id] = await Promise.all([player1Command, player2Command]);

      expect(command1Id).toBeDefined();
      expect(command2Id).toBeDefined();

      // Both players should have pending commands
      expect(commandProcessor.hasPlayerSubmittedAction('player1')).toBe(true);
      expect(commandProcessor.hasPlayerSubmittedAction('player2')).toBe(true);

      // Process all commands
      await commandProcessor.processCommands();

      // Both commands should be processed
      const stats = commandProcessor.getStats();
      expect(stats.commandsProcessed).toBe(2);
    });
  });

  describe('Event Middleware Integration', () => {
    test('should process events through middleware stack', async () => {
      const middlewareStack = EventMiddleware.createStandardStack({
        enableLogging: false,
        enableValidation: true,
        enableRateLimit: false,
        enablePerformance: true
      });

      middlewareStack.forEach(middleware => {
        eventBus.addMiddleware(middleware);
      });

      const eventProcessed = jest.fn();
      eventBus.on(EventTypes.PLAYER.JOINED, eventProcessed);

      // Emit valid event
      const result = await eventBus.emit(EventTypes.PLAYER.JOINED, {
        playerId: 'player3',
        playerName: 'Charlie',
        gameCode: 'TEST_PHASE2',
        timestamp: new Date().toISOString()
      });

      expect(result).toBe(true);
      expect(eventProcessed).toHaveBeenCalledTimes(1);
    });

    test('should reject invalid events through validation middleware', async () => {
      const validationMiddleware = EventMiddleware.validation({
        validateSchema: true,
        strictMode: true
      });

      eventBus.addMiddleware(validationMiddleware);

      const eventProcessed = jest.fn();
      eventBus.on(EventTypes.PLAYER.JOINED, eventProcessed);

      // Emit invalid event (missing required fields)
      const result = await eventBus.emit(EventTypes.PLAYER.JOINED, {
        // Missing required fields
      });

      expect(result).toBe(false);
      expect(eventProcessed).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should handle command validation failures gracefully', async () => {
      const rejectedEvents = [];
      eventBus.on(EventTypes.ACTION.REJECTED, (event) => {
        rejectedEvents.push(event);
      });

      // Submit invalid command
      const invalidCommand = new AbilityCommand('player1', 'nonexistent_ability');
      await commandProcessor.submitCommand(invalidCommand);

      // Process commands
      await commandProcessor.processCommands();

      // Should emit rejection event
      expect(rejectedEvents).toHaveLength(1);
      expect(rejectedEvents[0].data.playerId).toBe('player1');
    });

    test('should handle event listener errors without stopping event processing', async () => {
      const errorListener = jest.fn(() => {
        throw new Error('Listener error');
      });
      const normalListener = jest.fn();

      eventBus.on(EventTypes.PLAYER.JOINED, errorListener);
      eventBus.on(EventTypes.PLAYER.JOINED, normalListener);

      const result = await eventBus.emit(EventTypes.PLAYER.JOINED, {
        playerId: 'player1',
        playerName: 'Test',
        gameCode: 'TEST_PHASE2',
        timestamp: new Date().toISOString()
      });

      expect(result).toBe(true);
      expect(errorListener).toHaveBeenCalledTimes(1);
      expect(normalListener).toHaveBeenCalledTimes(1);
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle high command volume efficiently', async () => {
      const commandCount = 50;
      const startTime = Date.now();

      // Submit many commands
      const promises = [];
      for (let i = 0; i < commandCount; i++) {
        promises.push(
          commandProcessor.submitAbilityCommand('player1', 'sword_strike', {
            targetId: 'player2'
          })
        );
      }

      await Promise.all(promises);
      
      // Process all commands
      await commandProcessor.processCommands();
      
      const endTime = Date.now();
      const stats = commandProcessor.getStats();

      expect(stats.commandsProcessed).toBe(commandCount);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    test('should track processing statistics', async () => {
      await commandProcessor.submitAbilityCommand('player1', 'sword_strike', {
        targetId: 'player2'
      });

      await commandProcessor.processCommands();

      const stats = commandProcessor.getStats();
      expect(stats.commandsProcessed).toBe(1);
      expect(stats.commandsFailed).toBe(0);
      expect(stats.averageExecutionTime).toBeGreaterThan(0);
    });
  });

  describe('Backward Compatibility', () => {
    test('should maintain compatibility with existing game mechanics', async () => {
      // Verify that event-driven commands still work with existing game systems
      const command = new AbilityCommand('player1', 'sword_strike', {
        targetId: 'player2'
      });

      await commandProcessor.submitCommand(command);
      await commandProcessor.processCommands();

      // Verify the ability registry was called
      expect(gameRoom.systems.abilityRegistry.executePlayerAbility).toHaveBeenCalledWith(
        expect.objectContaining({
          playerId: 'player1',
          abilityId: 'sword_strike',
          targetId: 'player2'
        })
      );
    });

    test('should support legacy action formats', async () => {
      const legacyActionData = {
        actionType: 'ability',
        abilityId: 'sword_strike',
        targetId: 'player2'
      };

      const commandId = await commandProcessor.submitActionData('player1', legacyActionData);
      expect(commandId).toBeDefined();

      const pendingCommands = commandProcessor.getPendingCommands('player1');
      expect(pendingCommands).toHaveLength(1);
      expect(pendingCommands[0]).toBeInstanceOf(AbilityCommand);
    });
  });

  describe('Phase 2 Steps 1 & 2 Completion Verification', () => {
    test('should verify Step 1 completion: Core Event Infrastructure', () => {
      // EventBus System
      expect(gameRoom.eventBus).toBeDefined();
      expect(gameRoom.eventBus.constructor.name).toBe('GameEventBus');
      
      // Event Schema Definition
      expect(EventTypes).toBeDefined();
      expect(EventTypes.GAME).toBeDefined();
      expect(EventTypes.PLAYER).toBeDefined();
      expect(EventTypes.ACTION).toBeDefined();
      
      // Event Middleware Framework
      expect(EventMiddleware).toBeDefined();
      expect(EventMiddleware.createStandardStack).toBeFunction();
      
      // Integration with GameRoom
      expect(gameRoom.getEventBus()).toBe(gameRoom.eventBus);
    });

    test('should verify Step 2 completion: Player Action Commands', () => {
      // Command Pattern Infrastructure
      expect(commandProcessor).toBeDefined();
      expect(commandProcessor.constructor.name).toBe('CommandProcessor');
      
      // Ability Command Handlers
      expect(AbilityCommand).toBeDefined();
      expect(AbilityCommand.fromActionData).toBeFunction();
      
      // Action Validation Commands
      const ValidationCommand = require('../../../server/models/commands/ValidationCommand');
      expect(ValidationCommand).toBeDefined();
      expect(ValidationCommand.create).toBeFunction();
      
      // Controller Integration (verified through submitActionData)
      expect(commandProcessor.submitActionData).toBeFunction();
    });

    test('should confirm architectural transformation is complete', async () => {
      // Event-driven communication
      const eventReceived = jest.fn();
      eventBus.on(EventTypes.ACTION.SUBMITTED, eventReceived);
      
      await commandProcessor.submitAbilityCommand('player1', 'sword_strike');
      expect(eventReceived).toHaveBeenCalledTimes(1);
      
      // Command pattern implementation
      const stats = commandProcessor.getStats();
      expect(stats.pendingCommands).toBe(1);
      
      // Middleware support
      const middleware = jest.fn((event, next) => next(event));
      eventBus.addMiddleware(middleware);
      
      await eventBus.emit(EventTypes.PLAYER.JOINED, { playerId: 'test' });
      expect(middleware).toHaveBeenCalledTimes(1);
    });
  });
});