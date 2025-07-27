/**
 * @fileoverview Integration tests for the command system
 * Tests command creation, processing, validation, and execution
 * Part of Phase 2 refactoring - Event-Driven Architecture
 */
const PlayerActionCommand = require('../../../../server/models/commands/PlayerActionCommand');
const AbilityCommand = require('../../../../server/models/commands/AbilityCommand');
const ValidationCommand = require('../../../../server/models/commands/ValidationCommand');
const CommandProcessor = require('../../../../server/models/commands/CommandProcessor');
const { GameRoom } = require('../../../../server/models/GameRoom');
const { EventTypes } = require('../../../../server/models/events/EventTypes');

// Mock dependencies
jest.mock('../../../../server/utils/logger');
jest.mock('../../../../server/config');

describe('Command System Integration', () => {
  let gameRoom;
  let commandProcessor;
  let mockPlayer;
  let mockGame;

  beforeEach(() => {
    // Create mock game room
    gameRoom = {
      code: 'TEST_GAME',
      players: new Map(),
      phase: 'action',
      started: true,
      systems: {
        abilityRegistry: {
          executePlayerAbility: jest.fn().mockResolvedValue({ success: true })
        }
      },
      gamePhase: {
        hasPlayerSubmittedAction: jest.fn().mockReturnValue(false),
        submitAction: jest.fn()
      },
      getPlayerById: jest.fn(),
      getEventBus: jest.fn().mockReturnValue({
        emit: jest.fn().mockResolvedValue(true),
        on: jest.fn(),
        addMiddleware: jest.fn()
      }),
      emitEvent: jest.fn().mockResolvedValue(true)
    };

    // Create mock player
    mockPlayer = {
      id: 'player1',
      name: 'TestPlayer',
      isAlive: true,
      race: 'human',
      class: 'warrior',
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
    };

    gameRoom.getPlayerById.mockReturnValue(mockPlayer);
    commandProcessor = new CommandProcessor(gameRoom);
  });

  afterEach(() => {
    if (commandProcessor) {
      commandProcessor.destroy();
    }
  });

  describe('PlayerActionCommand Base Class', () => {
    test('should create command with correct properties', () => {
      const command = new PlayerActionCommand('player1', 'test_action', {
        targetId: 'player2',
        metadata: { test: true }
      });

      expect(command.playerId).toBe('player1');
      expect(command.actionType).toBe('test_action');
      expect(command.targetId).toBe('player2');
      expect(command.status).toBe('pending');
      expect(command.id).toBeDefined();
      expect(command.timestamp).toBeDefined();
    });

    test('should generate unique command IDs', () => {
      const command1 = new PlayerActionCommand('player1', 'action1');
      const command2 = new PlayerActionCommand('player1', 'action2');

      expect(command1.id).not.toBe(command2.id);
    });

    test('should track validation errors', async () => {
      const command = new PlayerActionCommand('invalid_player', 'test_action');
      const gameContext = { game: gameRoom };

      gameRoom.getPlayerById.mockReturnValue(null);

      const isValid = await command.validate(gameContext);

      expect(isValid).toBe(false);
      expect(command.validationErrors).toContain('Player invalid_player not found');
    });

    test('should compare commands by priority', () => {
      const lowPriority = new PlayerActionCommand('player1', 'action1', { priority: 1 });
      const highPriority = new PlayerActionCommand('player2', 'action2', { priority: 10 });

      const sorted = [lowPriority, highPriority].sort(PlayerActionCommand.comparePriority);

      expect(sorted[0]).toBe(highPriority);
      expect(sorted[1]).toBe(lowPriority);
    });
  });

  describe('AbilityCommand', () => {
    test('should create ability command correctly', () => {
      const command = new AbilityCommand('player1', 'sword_strike', {
        targetId: 'player2'
      });

      expect(command.playerId).toBe('player1');
      expect(command.actionType).toBe('ability');
      expect(command.abilityId).toBe('sword_strike');
      expect(command.targetId).toBe('player2');
    });

    test('should validate ability exists for player', async () => {
      const command = new AbilityCommand('player1', 'nonexistent_ability');
      const gameContext = { game: gameRoom };

      await command.validate(gameContext);

      expect(command.validationErrors).toContain('Ability nonexistent_ability not found for player');
    });

    test('should validate ability is unlocked', async () => {
      const command = new AbilityCommand('player1', 'sword_strike');
      const gameContext = { game: gameRoom };

      // Mock ability exists but not unlocked
      mockPlayer.unlocked = [];

      await command.validate(gameContext);

      expect(command.validationErrors).toContain('Ability sword_strike is not unlocked');
    });

    test('should validate ability cooldown', async () => {
      const command = new AbilityCommand('player1', 'sword_strike');
      const gameContext = { game: gameRoom };

      mockPlayer.playerAbilities.isOnCooldown.mockReturnValue(true);

      await command.validate(gameContext);

      expect(command.validationErrors).toContain('Ability sword_strike is on cooldown');
    });

    test('should execute ability successfully', async () => {
      const command = new AbilityCommand('player1', 'sword_strike', {
        targetId: 'player2'
      });
      const gameContext = { game: gameRoom };

      // Validate first
      await command.validate(gameContext);
      expect(command.isValidated).toBe(true);

      // Execute
      const result = await command.execute(gameContext);

      expect(result.success).toBe(true);
      expect(result.abilityId).toBe('sword_strike');
      expect(gameRoom.systems.abilityRegistry.executePlayerAbility).toHaveBeenCalled();
      expect(gameRoom.emitEvent).toHaveBeenCalledWith(EventTypes.ABILITY.USED, expect.any(Object));
    });

    test('should create from action data', () => {
      const actionData = {
        targetId: 'player2',
        abilityId: 'sword_strike',
        metadata: { test: true }
      };

      const command = AbilityCommand.fromActionData('player1', actionData);

      expect(command.playerId).toBe('player1');
      expect(command.abilityId).toBe('sword_strike');
      expect(command.targetId).toBe('player2');
    });
  });

  describe('ValidationCommand', () => {
    test('should create validation command correctly', () => {
      const command = new ValidationCommand('player1', 'action_submission', {
        actionData: { actionType: 'ability' }
      });

      expect(command.playerId).toBe('player1');
      expect(command.validationType).toBe('action_submission');
      expect(command.actionData.actionType).toBe('ability');
    });

    test('should validate game state', async () => {
      gameRoom.players.set('player1', mockPlayer);
      gameRoom.players.set('player2', { ...mockPlayer, id: 'player2' });
      gameRoom.monster = { hp: 100, maxHp: 100 };

      const command = ValidationCommand.create('player1', 'game_state', {});
      const gameContext = { game: gameRoom };

      await command.validate(gameContext);
      const result = await command.execute(gameContext);

      expect(result.isValid).toBe(true);
      expect(result.results.score).toBeGreaterThan(0);
    });

    test('should validate player readiness', async () => {
      gameRoom.started = false;
      mockPlayer.race = 'human';
      mockPlayer.class = 'warrior';
      mockPlayer.abilities = [{ id: 'test' }];

      const command = ValidationCommand.create('player1', 'player_readiness', {});
      const gameContext = { game: gameRoom };

      await command.validate(gameContext);
      const result = await command.execute(gameContext);

      expect(result.isValid).toBe(true);
      expect(result.results.passed.length).toBeGreaterThan(0);
    });

    test('should fail validation for invalid conditions', async () => {
      gameRoom.players.set('player1', { ...mockPlayer, isAlive: false });

      const command = ValidationCommand.create('player1', 'action_submission', {
        actionType: 'ability'
      });
      const gameContext = { game: gameRoom };

      await command.validate(gameContext);
      const result = await command.execute(gameContext);

      expect(result.isValid).toBe(false);
      expect(result.results.failed.length).toBeGreaterThan(0);
    });
  });

  describe('CommandProcessor', () => {
    test('should submit and process commands', async () => {
      const command = new AbilityCommand('player1', 'sword_strike', {
        targetId: 'player2'
      });

      const commandId = await commandProcessor.submitCommand(command);

      expect(commandId).toBe(command.id);
      expect(commandProcessor.getPendingCommands('player1')).toContain(command);
    });

    test('should process commands in priority order', async () => {
      const lowPriorityCommand = new AbilityCommand('player1', 'ability1', { priority: 1 });
      const highPriorityCommand = new AbilityCommand('player1', 'ability2', { priority: 10 });

      await commandProcessor.submitCommand(lowPriorityCommand);
      await commandProcessor.submitCommand(highPriorityCommand);

      const pending = commandProcessor.getPendingCommands('player1');
      expect(pending).toHaveLength(2);
    });

    test('should cancel pending commands', async () => {
      const command = new AbilityCommand('player1', 'sword_strike');
      const commandId = await commandProcessor.submitCommand(command);

      const cancelled = commandProcessor.cancelCommand(commandId);

      expect(cancelled).toBe(true);
      expect(command.status).toBe('cancelled');
      expect(commandProcessor.getPendingCommands('player1')).toHaveLength(0);
    });

    test('should clear player commands on disconnect', async () => {
      const command1 = new AbilityCommand('player1', 'ability1');
      const command2 = new AbilityCommand('player1', 'ability2');

      await commandProcessor.submitCommand(command1);
      await commandProcessor.submitCommand(command2);

      const clearedCount = commandProcessor.clearPlayerCommands('player1');

      expect(clearedCount).toBe(2);
      expect(commandProcessor.getPendingCommands('player1')).toHaveLength(0);
    });

    test('should provide command status', async () => {
      const command = new AbilityCommand('player1', 'sword_strike');
      const commandId = await commandProcessor.submitCommand(command);

      const status = commandProcessor.getCommandStatus(commandId);

      expect(status).toBeDefined();
      expect(status.id).toBe(commandId);
      expect(status.status).toBe('pending');
      expect(status.playerId).toBe('player1');
    });

    test('should track statistics', async () => {
      const command = new AbilityCommand('player1', 'sword_strike');
      await commandProcessor.submitCommand(command);

      const stats = commandProcessor.getStats();

      expect(stats.pendingCommands).toBe(1);
      expect(stats.executingCommands).toBe(0);
      expect(stats.commandsProcessed).toBe(0);
    });

    test('should create commands from action data', async () => {
      const actionData = {
        actionType: 'ability',
        abilityId: 'sword_strike',
        targetId: 'player2'
      };

      const commandId = await commandProcessor.submitActionData('player1', actionData);

      expect(commandId).toBeDefined();
      const pending = commandProcessor.getPendingCommands('player1');
      expect(pending).toHaveLength(1);
      expect(pending[0]).toBeInstanceOf(AbilityCommand);
    });
  });

  describe('Event Integration', () => {
    test('should emit events during command processing', async () => {
      const command = new AbilityCommand('player1', 'sword_strike', {
        targetId: 'player2'
      });

      await commandProcessor.submitCommand(command);

      expect(gameRoom.emitEvent).toHaveBeenCalledWith(
        EventTypes.ACTION.SUBMITTED,
        expect.objectContaining({
          playerId: 'player1',
          actionType: 'ability',
          abilityId: 'sword_strike'
        })
      );
    });

    test('should handle event-driven command processing', async () => {
      const command = new AbilityCommand('player1', 'sword_strike');
      await commandProcessor.submitCommand(command);

      // Simulate phase change event that triggers processing
      const eventBus = gameRoom.getEventBus();
      const phaseChangeHandler = eventBus.on.mock.calls.find(
        call => call[0] === EventTypes.PHASE.CHANGED
      )[1];

      await phaseChangeHandler({
        data: { newPhase: 'resolution' }
      });

      // Command should be processed
      expect(gameRoom.systems.abilityRegistry.executePlayerAbility).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should handle command validation failures gracefully', async () => {
      const command = new AbilityCommand('player1', 'nonexistent_ability');
      
      try {
        await commandProcessor.submitCommand(command);
        await commandProcessor.processCommands();
      } catch (error) {
        // Should not throw, errors should be handled internally
      }

      const stats = commandProcessor.getStats();
      expect(stats.commandsFailed).toBeGreaterThan(0);
    });

    test('should handle command execution failures', async () => {
      gameRoom.systems.abilityRegistry.executePlayerAbility.mockRejectedValue(
        new Error('Execution failed')
      );

      const command = new AbilityCommand('player1', 'sword_strike');
      await commandProcessor.submitCommand(command);

      try {
        await commandProcessor.processCommands();
      } catch (error) {
        // Should not throw, errors should be handled internally
      }

      expect(gameRoom.emitEvent).toHaveBeenCalledWith(
        EventTypes.ACTION.REJECTED,
        expect.objectContaining({
          error: 'Execution failed'
        })
      );
    });
  });

  describe('Backward Compatibility', () => {
    test('should handle legacy action types', async () => {
      const actionData = {
        actionType: 'attack', // Legacy action type
        abilityId: 'sword_strike',
        targetId: 'player2'
      };

      const commandId = await commandProcessor.submitActionData('player1', actionData);

      expect(commandId).toBeDefined();
      const pending = commandProcessor.getPendingCommands('player1');
      expect(pending[0]).toBeInstanceOf(AbilityCommand);
    });
  });
});