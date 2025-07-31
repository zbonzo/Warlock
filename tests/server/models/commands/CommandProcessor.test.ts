/**
 * @fileoverview Tests for CommandProcessor
 */
import { CommandProcessor, ProcessorStats } from '../../../../server/models/commands/CommandProcessor';
import { PlayerActionCommand, GameContext } from '../../../../server/models/commands/PlayerActionCommand';
import { AbilityCommand } from '../../../../server/models/commands/AbilityCommand';
import { EventTypes } from '../../../../server/models/events/EventTypes';

// Mock dependencies
jest.mock('@utils/logger', () => ({
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn()
}));

const mockLogger = require('@utils/logger');

describe('CommandProcessor', () => {
  let processor: CommandProcessor;
  let mockGameRoom: any;
  let mockEventBus: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockEventBus = {
      emit: jest.fn().mockResolvedValue(undefined),
      on: jest.fn()
    };

    mockGameRoom = {
      code: 'TEST123',
      phase: 'action',
      getEventBus: jest.fn().mockReturnValue(mockEventBus),
      getPlayerById: jest.fn(),
      gamePhase: {
        clearPendingActions: jest.fn()
      },
      systems: {
        combat: {},
        effects: {}
      }
    };

    processor = new CommandProcessor(mockGameRoom);
  });

  afterEach(() => {
    processor.destroy();
  });

  describe('constructor', () => {
    it('should initialize with game room and event bus', () => {
      expect(mockGameRoom.getEventBus).toHaveBeenCalled();
      expect(mockEventBus.on).toHaveBeenCalledWith(
        EventTypes.PLAYER.DISCONNECTED,
        expect.any(Function)
      );
    });
  });

  describe('command submission', () => {
    let mockCommand: jest.Mocked<PlayerActionCommand>;

    beforeEach(() => {
      mockCommand = {
        id: 'cmd-123',
        playerId: 'player1',
        actionType: 'ability',
        targetId: 'player2',
        abilityId: 'fireball',
        timestamp: new Date().toISOString(),
        status: 'pending',
        validationErrors: [],
        priority: 1,
        validate: jest.fn().mockResolvedValue(true),
        execute: jest.fn().mockResolvedValue({ success: true }),
        cancel: jest.fn(),
        getSummary: jest.fn().mockReturnValue({
          id: 'cmd-123',
          playerId: 'player1',
          actionType: 'ability',
          status: 'pending'
        })
      } as any;
    });

    describe('submitCommand', () => {
      it('should accept valid PlayerActionCommand', async () => {
        const commandId = await processor.submitCommand(mockCommand);

        expect(commandId).toBe('cmd-123');
        expect(mockEventBus.emit).toHaveBeenCalledWith(
          EventTypes.ACTION.SUBMITTED,
          expect.objectContaining({
            playerId: 'player1',
            actionType: 'ability',
            commandId: 'cmd-123'
          })
        );
        expect(mockLogger.debug).toHaveBeenCalledWith(
          'Command submitted:',
          expect.objectContaining({
            commandId: 'cmd-123',
            playerId: 'player1',
            actionType: 'ability'
          })
        );
      });

      it('should throw error for invalid command type', async () => {
        const invalidCommand = { id: 'invalid' } as any;

        await expect(processor.submitCommand(invalidCommand)).rejects.toThrow(
          'Command must be an instance of PlayerActionCommand'
        );
      });

      it('should initialize player queue if needed', async () => {
        await processor.submitCommand(mockCommand);
        
        const pendingCommands = processor.getPendingCommands('player1');
        expect(pendingCommands).toHaveLength(1);
        expect(pendingCommands[0]).toBe(mockCommand);
      });

      it('should add to existing player queue', async () => {
        const mockCommand2 = { ...mockCommand, id: 'cmd-456' } as any;

        await processor.submitCommand(mockCommand);
        await processor.submitCommand(mockCommand2);

        const pendingCommands = processor.getPendingCommands('player1');
        expect(pendingCommands).toHaveLength(2);
      });
    });

    describe('submitAbilityCommand', () => {
      it('should create and submit AbilityCommand', async () => {
        // Mock AbilityCommand constructor
        const mockAbilityCommand = { ...mockCommand, id: 'ability-cmd-123' } as any;
        jest.spyOn(AbilityCommand.prototype, 'constructor' as any).mockImplementation(() => {});
        jest.spyOn(processor, 'submitCommand').mockResolvedValue('ability-cmd-123');

        const commandId = await processor.submitAbilityCommand('player1', 'fireball', { power: 100 });

        expect(commandId).toBe('ability-cmd-123');
        expect(processor.submitCommand).toHaveBeenCalled();
      });
    });

    describe('submitActionData', () => {
      it('should create AbilityCommand for ability actions', async () => {
        const actionData = {
          actionType: 'ability',
          abilityId: 'fireball',
          targetId: 'player2'
        };

        jest.spyOn(AbilityCommand, 'fromActionData').mockReturnValue(mockCommand as any);
        jest.spyOn(processor, 'submitCommand').mockResolvedValue('cmd-123');

        const commandId = await processor.submitActionData('player1', actionData);

        expect(commandId).toBe('cmd-123');
        expect(AbilityCommand.fromActionData).toHaveBeenCalledWith('player1', actionData);
      });

      it('should create PlayerActionCommand for other actions', async () => {
        const actionData = {
          actionType: 'move',
          direction: 'north'
        };

        jest.spyOn(PlayerActionCommand, 'fromActionData').mockReturnValue(mockCommand as any);
        jest.spyOn(processor, 'submitCommand').mockResolvedValue('cmd-123');

        const commandId = await processor.submitActionData('player1', actionData);

        expect(commandId).toBe('cmd-123');
        expect(PlayerActionCommand.fromActionData).toHaveBeenCalledWith('player1', actionData);
      });
    });
  });

  describe('command management', () => {
    let mockCommand: jest.Mocked<PlayerActionCommand>;

    beforeEach(async () => {
      mockCommand = {
        id: 'cmd-123',
        playerId: 'player1',
        actionType: 'ability',
        targetId: 'player2',
        abilityId: 'fireball',
        timestamp: new Date().toISOString(),
        status: 'pending',
        validationErrors: [],
        priority: 1,
        validate: jest.fn().mockResolvedValue(true),
        execute: jest.fn().mockResolvedValue({ success: true }),
        cancel: jest.fn(),
        getSummary: jest.fn().mockReturnValue({
          id: 'cmd-123',
          playerId: 'player1',
          actionType: 'ability',
          status: 'pending'
        })
      } as any;

      await processor.submitCommand(mockCommand);
    });

    describe('cancelCommand', () => {
      it('should cancel pending command', () => {
        const cancelled = processor.cancelCommand('cmd-123');

        expect(cancelled).toBe(true);
        expect(mockCommand.cancel).toHaveBeenCalled();
        expect(mockEventBus.emit).toHaveBeenCalledWith(
          EventTypes.ACTION.CANCELLED,
          expect.objectContaining({
            playerId: 'player1',
            commandId: 'cmd-123'
          })
        );
      });

      it('should return false for non-existent command', () => {
        const cancelled = processor.cancelCommand('non-existent');
        expect(cancelled).toBe(false);
      });
    });

    describe('getCommandStatus', () => {
      it('should return status for pending command', () => {
        const status = processor.getCommandStatus('cmd-123');
        expect(status).toEqual({
          id: 'cmd-123',
          playerId: 'player1',
          actionType: 'ability',
          status: 'pending'
        });
      });

      it('should return null for non-existent command', () => {
        const status = processor.getCommandStatus('non-existent');
        expect(status).toBeNull();
      });
    });

    describe('getPendingCommands', () => {
      it('should return pending commands for player', () => {
        const commands = processor.getPendingCommands('player1');
        expect(commands).toHaveLength(1);
        expect(commands[0]).toBe(mockCommand);
      });

      it('should return empty array for player with no commands', () => {
        const commands = processor.getPendingCommands('player2');
        expect(commands).toEqual([]);
      });
    });

    describe('hasPlayerSubmittedAction', () => {
      it('should return true for player with pending ability action', () => {
        const hasSubmitted = processor.hasPlayerSubmittedAction('player1');
        expect(hasSubmitted).toBe(true);
      });

      it('should return false for player with no actions', () => {
        const hasSubmitted = processor.hasPlayerSubmittedAction('player2');
        expect(hasSubmitted).toBe(false);
      });
    });

    describe('getPlayersWithSubmittedActions', () => {
      it('should return set of players with submitted actions', () => {
        const players = processor.getPlayersWithSubmittedActions();
        expect(players).toEqual(new Set(['player1']));
      });
    });

    describe('clearPlayerCommands', () => {
      it('should clear all commands for player', () => {
        const cleared = processor.clearPlayerCommands('player1');

        expect(cleared).toBe(1);
        expect(mockCommand.cancel).toHaveBeenCalled();
        expect(processor.getPendingCommands('player1')).toEqual([]);
      });

      it('should return 0 for player with no commands', () => {
        const cleared = processor.clearPlayerCommands('player2');
        expect(cleared).toBe(0);
      });
    });
  });

  describe('command processing', () => {
    let mockCommand1: jest.Mocked<PlayerActionCommand>;
    let mockCommand2: jest.Mocked<PlayerActionCommand>;

    beforeEach(async () => {
      mockCommand1 = {
        id: 'cmd-1',
        playerId: 'player1',
        actionType: 'ability',
        status: 'pending',
        priority: 2,
        validate: jest.fn().mockResolvedValue(true),
        execute: jest.fn().mockResolvedValue({ success: true }),
        cancel: jest.fn(),
        getSummary: jest.fn(),
        validationErrors: []
      } as any;

      mockCommand2 = {
        id: 'cmd-2',
        playerId: 'player2',
        actionType: 'ability',
        status: 'pending',
        priority: 1,
        validate: jest.fn().mockResolvedValue(true),
        execute: jest.fn().mockResolvedValue({ success: true }),
        cancel: jest.fn(),
        getSummary: jest.fn(),
        validationErrors: []
      } as any;

      jest.spyOn(PlayerActionCommand, 'comparePriority').mockImplementation((a, b) => b.priority - a.priority);

      await processor.submitCommand(mockCommand1);
      await processor.submitCommand(mockCommand2);
    });

    describe('processCommands', () => {
      it('should process all pending commands', async () => {
        await processor.processCommands();

        expect(mockGameRoom.gamePhase.clearPendingActions).toHaveBeenCalled();
        expect(mockCommand1.validate).toHaveBeenCalled();
        expect(mockCommand1.execute).toHaveBeenCalled();
        expect(mockCommand2.validate).toHaveBeenCalled();
        expect(mockCommand2.execute).toHaveBeenCalled();
      });

      it('should sort commands by priority', async () => {
        await processor.processCommands();

        expect(PlayerActionCommand.comparePriority).toHaveBeenCalled();
      });

      it('should handle validation failures', async () => {
        mockCommand1.validate.mockResolvedValue(false);
        mockCommand1.validationErrors = ['Invalid target'];

        await processor.processCommands();

        expect(mockCommand1.execute).not.toHaveBeenCalled();
        expect(mockEventBus.emit).toHaveBeenCalledWith(
          EventTypes.ACTION.REJECTED,
          expect.objectContaining({
            playerId: 'player1',
            error: 'Command validation failed: Invalid target'
          })
        );
      });

      it('should handle execution failures', async () => {
        const error = new Error('Execution failed');
        mockCommand1.execute.mockRejectedValue(error);

        await processor.processCommands();

        expect(mockEventBus.emit).toHaveBeenCalledWith(
          EventTypes.ACTION.REJECTED,
          expect.objectContaining({
            playerId: 'player1',
            error: 'Execution failed'
          })
        );
      });

      it('should not process if already processing', async () => {
        const processPromise1 = processor.processCommands();
        const processPromise2 = processor.processCommands();

        await Promise.all([processPromise1, processPromise2]);

        // Should only process once (2 commands, not 4)
        expect(mockCommand1.execute).toHaveBeenCalledTimes(1);
        expect(mockCommand2.execute).toHaveBeenCalledTimes(1);
      });

      it('should clear processed commands from queues', async () => {
        await processor.processCommands();

        expect(processor.getPendingCommands('player1')).toEqual([]);
        expect(processor.getPendingCommands('player2')).toEqual([]);
      });

      it('should create proper game context', async () => {
        await processor.processCommands();

        const expectedContext: GameContext = {
          game: mockGameRoom,
          systems: mockGameRoom.systems,
          eventBus: mockEventBus
        };

        expect(mockCommand1.validate).toHaveBeenCalledWith(expectedContext);
        expect(mockCommand1.execute).toHaveBeenCalledWith(expectedContext);
      });
    });
  });

  describe('statistics and status', () => {
    beforeEach(async () => {
      const mockCommand = {
        id: 'cmd-123',
        playerId: 'player1',
        actionType: 'ability',
        status: 'pending',
        priority: 1,
        validate: jest.fn().mockResolvedValue(true),
        execute: jest.fn().mockResolvedValue({ success: true }),
        cancel: jest.fn(),
        getSummary: jest.fn(),
        validationErrors: []
      } as any;

      await processor.submitCommand(mockCommand);
    });

    describe('getStats', () => {
      it('should return processor statistics', () => {
        const stats: ProcessorStats = processor.getStats();

        expect(stats).toEqual({
          commandsProcessed: 0,
          commandsFailed: 0,
          averageExecutionTime: 0,
          totalExecutionTime: 0,
          pendingCommands: 1,
          executingCommands: 0,
          completedCommands: 0,
          isProcessing: false
        });
      });

      it('should update statistics after processing', async () => {
        await processor.processCommands();
        
        const stats = processor.getStats();
        expect(stats.commandsProcessed).toBe(1);
        expect(stats.pendingCommands).toBe(0);
        expect(stats.completedCommands).toBe(1);
      });
    });
  });

  describe('event handling', () => {
    it('should clear commands on player disconnection', async () => {
      const mockCommand = {
        id: 'cmd-123',
        playerId: 'player1',
        actionType: 'ability',
        status: 'pending',
        cancel: jest.fn(),
        getSummary: jest.fn()
      } as any;

      await processor.submitCommand(mockCommand);

      // Simulate player disconnection event
      const disconnectHandler = mockEventBus.on.mock.calls.find(
        call => call[0] === EventTypes.PLAYER.DISCONNECTED
      )?.[1];

      disconnectHandler({ data: { playerId: 'player1' } });

      expect(mockCommand.cancel).toHaveBeenCalled();
      expect(processor.getPendingCommands('player1')).toEqual([]);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Cleared 1 commands for disconnected player:',
        expect.objectContaining({ playerId: 'player1' })
      );
    });
  });

  describe('destroy', () => {
    it('should clean up all resources', async () => {
      const mockCommand = {
        id: 'cmd-123',
        playerId: 'player1',
        cancel: jest.fn(),
        getSummary: jest.fn()
      } as any;

      await processor.submitCommand(mockCommand);

      processor.destroy();

      expect(mockCommand.cancel).toHaveBeenCalled();
      expect(processor.getPendingCommands('player1')).toEqual([]);
      expect(processor.getStats().pendingCommands).toBe(0);
      expect(processor.getStats().isProcessing).toBe(false);
    });
  });
});