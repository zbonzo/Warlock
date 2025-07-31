/**
 * @fileoverview Tests for PlayerActionCommand base class
 */
import { 
  PlayerActionCommand, 
  CommandOptions, 
  GameContext, 
  CommandResult, 
  CommandStatus,
  CommandSummary,
  ValidationResult
} from '../../../../server/models/commands/PlayerActionCommand';
import { EventTypes } from '../../../../server/models/events/EventTypes';

// Mock external dependencies
const mockLenientValidator = {
  validatePlayerAction: jest.fn()
};

const mockLogger = {
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
};

jest.mock('../validation/ValidationMiddleware', () => ({
  lenientValidator: mockLenientValidator
}));

jest.mock('../../utils/logger', () => mockLogger);

// Test implementation of PlayerActionCommand for testing
class TestPlayerActionCommand extends PlayerActionCommand {
  public testValidationCalled = false;
  public testExecutionCalled = false;
  public testUndoCalled = false;
  public testCaptureUndoCalled = false;
  public shouldFailExecution = false;
  public shouldFailValidation = false;

  protected async _validateAction(gameContext: GameContext): Promise<void> {
    this.testValidationCalled = true;
    if (this.shouldFailValidation) {
      this.validationErrors.push('Test validation failure');
    }
  }

  protected async _executeAction(gameContext: GameContext): Promise<CommandResult> {
    this.testExecutionCalled = true;
    if (this.shouldFailExecution) {
      throw new Error('Test execution failure');
    }
    return {
      success: true,
      data: { testResult: 'success' },
      message: 'Test execution completed'
    };
  }

  protected async _captureUndoData(gameContext: GameContext): Promise<Record<string, unknown> | null> {
    this.testCaptureUndoCalled = true;
    return { originalValue: 'test' };
  }

  protected async _undoAction(gameContext: GameContext): Promise<void> {
    this.testUndoCalled = true;
  }
}

describe('PlayerActionCommand', () => {
  let mockPlayer: any;
  let mockGame: any;
  let mockGameContext: GameContext;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock player
    mockPlayer = {
      id: 'player1',
      isAlive: true,
      name: 'TestPlayer'
    };

    // Mock game
    mockGame = {
      getPlayerById: jest.fn().mockReturnValue(mockPlayer),
      phase: 'action',
      emitEvent: jest.fn()
    };

    mockGameContext = { game: mockGame };

    // Setup validator mock
    mockLenientValidator.validatePlayerAction.mockReturnValue({
      success: true,
      errors: []
    });
  });

  describe('constructor', () => {
    it('should create command with basic parameters', () => {
      const command = new PlayerActionCommand('player1', 'attack');

      expect(command.playerId).toBe('player1');
      expect(command.actionType).toBe('attack');
      expect(command.targetId).toBeNull();
      expect(command.abilityId).toBeNull();
      expect(command.metadata).toEqual({});
      expect(command.priority).toBe(0);
      expect(command.canUndo).toBe(false);
      expect(command.status).toBe('pending');
      expect(command.id).toMatch(/^cmd_\d+_[a-z0-9]+$/);
      expect(command.timestamp).toBeDefined();
    });

    it('should create command with full options', () => {
      const options: CommandOptions = {
        targetId: 'player2',
        abilityId: 'fireball',
        metadata: { damage: 25 },
        priority: 5,
        canUndo: true
      };

      const command = new PlayerActionCommand('player1', 'attack', options);

      expect(command.playerId).toBe('player1');
      expect(command.actionType).toBe('attack');
      expect(command.targetId).toBe('player2');
      expect(command.abilityId).toBe('fireball');
      expect(command.metadata).toEqual({ damage: 25 });
      expect(command.priority).toBe(5);
      expect(command.canUndo).toBe(true);
    });

    it('should throw error for invalid player ID', () => {
      expect(() => new PlayerActionCommand('', 'attack')).toThrow('Player ID must be a non-empty string');
      expect(() => new PlayerActionCommand(null as any, 'attack')).toThrow('Player ID must be a non-empty string');
    });

    it('should throw error for invalid action type', () => {
      expect(() => new PlayerActionCommand('player1', '')).toThrow('Action type must be a non-empty string');
      expect(() => new PlayerActionCommand('player1', null as any)).toThrow('Action type must be a non-empty string');
    });

    it('should generate unique command IDs', () => {
      const command1 = new PlayerActionCommand('player1', 'attack');
      const command2 = new PlayerActionCommand('player1', 'attack');

      expect(command1.id).not.toBe(command2.id);
    });
  });

  describe('validation', () => {
    let testCommand: TestPlayerActionCommand;

    beforeEach(() => {
      testCommand = new TestPlayerActionCommand('player1', 'attack', { targetId: 'player2' });
    });

    it('should validate successfully with valid data', async () => {
      const isValid = await testCommand.validate(mockGameContext);

      expect(isValid).toBe(true);
      expect(testCommand.isValidated).toBe(true);
      expect(testCommand.validationErrors).toEqual([]);
      expect(testCommand.testValidationCalled).toBe(true);
      expect(mockLenientValidator.validatePlayerAction).toHaveBeenCalledWith({
        playerId: 'player1',
        actionType: 'attack',
        targetId: 'player2',
        timestamp: testCommand.timestamp
      });
    });

    it('should handle Zod validation errors', async () => {
      mockLenientValidator.validatePlayerAction.mockReturnValue({
        success: false,
        errors: ['Invalid player ID format']
      });

      const isValid = await testCommand.validate(mockGameContext);

      expect(isValid).toBe(false);
      expect(testCommand.validationErrors).toContain('Invalid player ID format');
    });

    it('should handle Zod validation exceptions gracefully', async () => {
      mockLenientValidator.validatePlayerAction.mockImplementation(() => {
        throw new Error('Zod parsing error');
      });

      const isValid = await testCommand.validate(mockGameContext);

      expect(mockLogger.warn).toHaveBeenCalledWith('Zod validation error in PlayerActionCommand', expect.any(Object));
      // Should still pass other validations
      expect(isValid).toBe(true);
    });

    it('should fail validation when player not found', async () => {
      mockGame.getPlayerById.mockReturnValue(null);

      const isValid = await testCommand.validate(mockGameContext);

      expect(isValid).toBe(false);
      expect(testCommand.validationErrors).toContain('Player player1 not found');
    });

    it('should fail validation when player is dead', async () => {
      mockPlayer.isAlive = false;

      const isValid = await testCommand.validate(mockGameContext);

      expect(isValid).toBe(false);
      expect(testCommand.validationErrors).toContain('Dead players cannot perform actions');
    });

    it('should allow dead players to spectate', async () => {
      mockPlayer.isAlive = false;
      const spectateCommand = new TestPlayerActionCommand('player1', 'spectate');

      const isValid = await spectateCommand.validate(mockGameContext);

      expect(isValid).toBe(true);
    });

    it('should fail validation in wrong game phase', async () => {
      mockGame.phase = 'preparation';

      const isValid = await testCommand.validate(mockGameContext);

      expect(isValid).toBe(false);
      expect(testCommand.validationErrors).toContain('Cannot perform attack during preparation phase');
    });

    it('should allow phase-independent actions', async () => {
      mockGame.phase = 'preparation';
      const chatCommand = new TestPlayerActionCommand('player1', 'chat');

      const isValid = await chatCommand.validate(mockGameContext);

      expect(isValid).toBe(true);
    });

    it('should validate target player exists', async () => {
      mockGame.getPlayerById
        .mockReturnValueOnce(mockPlayer) // For the acting player
        .mockReturnValueOnce(null); // For the target

      const isValid = await testCommand.validate(mockGameContext);

      expect(isValid).toBe(false);
      expect(testCommand.validationErrors).toContain('Target player2 not found');
    });

    it('should allow monster targets without validation', async () => {
      const monsterCommand = new TestPlayerActionCommand('player1', 'attack', { targetId: 'monster' });

      const isValid = await monsterCommand.validate(mockGameContext);

      expect(isValid).toBe(true);
    });

    it('should allow __monster__ internal target without validation', async () => {
      const monsterCommand = new TestPlayerActionCommand('player1', 'attack', { targetId: '__monster__' });

      const isValid = await monsterCommand.validate(mockGameContext);

      expect(isValid).toBe(true);
    });

    it('should call subclass validation', async () => {
      await testCommand.validate(mockGameContext);

      expect(testCommand.testValidationCalled).toBe(true);
    });

    it('should handle subclass validation errors', async () => {
      testCommand.shouldFailValidation = true;

      const isValid = await testCommand.validate(mockGameContext);

      expect(isValid).toBe(false);
      expect(testCommand.validationErrors).toContain('Test validation failure');
    });

    it('should handle validation exceptions', async () => {
      mockGame.getPlayerById.mockImplementation(() => {
        throw new Error('Database error');
      });

      const isValid = await testCommand.validate(mockGameContext);

      expect(isValid).toBe(false);
      expect(testCommand.validationErrors).toContain('Validation error: Database error');
      expect(mockLogger.error).toHaveBeenCalledWith('Command validation error:', expect.any(Object));
    });

    it('should reset validation state on re-validation', async () => {
      testCommand.shouldFailValidation = true;
      await testCommand.validate(mockGameContext);
      
      expect(testCommand.validationErrors.length).toBeGreaterThan(0);

      testCommand.shouldFailValidation = false;
      await testCommand.validate(mockGameContext);

      expect(testCommand.validationErrors).toEqual([]);
    });
  });

  describe('execution', () => {
    let testCommand: TestPlayerActionCommand;

    beforeEach(async () => {
      testCommand = new TestPlayerActionCommand('player1', 'attack', { targetId: 'player2' });
      await testCommand.validate(mockGameContext);
    });

    it('should execute successfully after validation', async () => {
      const result = await testCommand.execute(mockGameContext);

      expect(result.success).toBe(true);
      expect(result.data?.testResult).toBe('success');
      expect(result.message).toBe('Test execution completed');
      expect(testCommand.status).toBe('completed');
      expect(testCommand.executionTime).toBeGreaterThan(0);
      expect(testCommand.result).toBe(result);
      expect(testCommand.testExecutionCalled).toBe(true);
    });

    it('should emit action submitted event', async () => {
      await testCommand.execute(mockGameContext);

      expect(mockGame.emitEvent).toHaveBeenCalledWith(EventTypes.ACTION.SUBMITTED, {
        playerId: 'player1',
        actionType: 'attack',
        targetId: 'player2',
        abilityId: null,
        metadata: {},
        timestamp: testCommand.timestamp
      });
    });

    it('should emit action executed event on success', async () => {
      await testCommand.execute(mockGameContext);

      expect(mockGame.emitEvent).toHaveBeenCalledWith(EventTypes.ACTION.EXECUTED, {
        playerId: 'player1',
        actionType: 'attack',
        targetId: 'player2',
        abilityId: null,
        result: expect.any(Object),
        executionTime: expect.any(Number),
        timestamp: expect.any(String)
      });
    });

    it('should capture undo data for undoable commands', async () => {
      const undoableCommand = new TestPlayerActionCommand('player1', 'attack', { canUndo: true });
      await undoableCommand.validate(mockGameContext);

      await undoableCommand.execute(mockGameContext);

      expect(undoableCommand.testCaptureUndoCalled).toBe(true);
      expect(undoableCommand.undoData).toEqual({ originalValue: 'test' });
    });

    it('should not capture undo data for non-undoable commands', async () => {
      await testCommand.execute(mockGameContext);

      expect(testCommand.testCaptureUndoCalled).toBe(false);
      expect(testCommand.undoData).toBeNull();
    });

    it('should fail execution without validation', async () => {
      const unvalidatedCommand = new TestPlayerActionCommand('player1', 'attack');

      await expect(unvalidatedCommand.execute(mockGameContext)).rejects.toThrow('Command must be validated before execution');
    });

    it('should fail execution with validation errors', async () => {
      testCommand.shouldFailValidation = true;
      await testCommand.validate(mockGameContext);

      await expect(testCommand.execute(mockGameContext)).rejects.toThrow('Cannot execute invalid command');
    });

    it('should handle execution failure', async () => {
      testCommand.shouldFailExecution = true;

      await expect(testCommand.execute(mockGameContext)).rejects.toThrow('Test execution failure');

      expect(testCommand.status).toBe('failed');
      expect(testCommand.error).toBe('Test execution failure');
      expect(testCommand.executionTime).toBeGreaterThan(0);

      expect(mockGame.emitEvent).toHaveBeenCalledWith(EventTypes.ACTION.REJECTED, {
        playerId: 'player1',
        actionType: 'attack',
        error: 'Test execution failure',
        timestamp: expect.any(String)
      });

      expect(mockLogger.error).toHaveBeenCalledWith('Command execution failed:', expect.any(Object));
    });

    it('should track execution time', async () => {
      await testCommand.execute(mockGameContext);

      expect(testCommand.executionTime).toBeGreaterThan(0);
      expect(typeof testCommand.executionTime).toBe('number');
    });

    it('should update status during execution', async () => {
      const executionPromise = testCommand.execute(mockGameContext);
      
      // Status should be executing during execution
      expect(testCommand.status).toBe('executing');

      await executionPromise;

      expect(testCommand.status).toBe('completed');
    });
  });

  describe('undo functionality', () => {
    let undoableCommand: TestPlayerActionCommand;

    beforeEach(async () => {
      undoableCommand = new TestPlayerActionCommand('player1', 'attack', { canUndo: true });
      await undoableCommand.validate(mockGameContext);
      await undoableCommand.execute(mockGameContext);
    });

    it('should undo successfully', async () => {
      const result = await undoableCommand.undo(mockGameContext);

      expect(result).toBe(true);
      expect(undoableCommand.status).toBe('cancelled');
      expect(undoableCommand.testUndoCalled).toBe(true);

      expect(mockGame.emitEvent).toHaveBeenCalledWith(EventTypes.ACTION.CANCELLED, {
        playerId: 'player1',
        actionType: 'attack',
        timestamp: expect.any(String)
      });
    });

    it('should fail undo for non-undoable commands', async () => {
      const nonUndoableCommand = new TestPlayerActionCommand('player1', 'attack');

      await expect(nonUndoableCommand.undo(mockGameContext)).rejects.toThrow('Command does not support undo');
    });

    it('should fail undo for non-completed commands', async () => {
      const pendingCommand = new TestPlayerActionCommand('player1', 'attack', { canUndo: true });

      await expect(pendingCommand.undo(mockGameContext)).rejects.toThrow('Can only undo completed commands');
    });

    it('should fail undo without undo data', async () => {
      undoableCommand.undoData = null;

      await expect(undoableCommand.undo(mockGameContext)).rejects.toThrow('No undo data available');
    });

    it('should handle undo failure', async () => {
      const failingCommand = new (class extends TestPlayerActionCommand {
        protected async _undoAction(gameContext: GameContext): Promise<void> {
          throw new Error('Undo failed');
        }
      })('player1', 'attack', { canUndo: true });

      await failingCommand.validate(mockGameContext);
      await failingCommand.execute(mockGameContext);

      await expect(failingCommand.undo(mockGameContext)).rejects.toThrow('Undo failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Command undo failed:', expect.any(Object));
    });
  });

  describe('cancellation', () => {
    it('should cancel pending command', () => {
      const command = new TestPlayerActionCommand('player1', 'attack');

      command.cancel();

      expect(command.status).toBe('cancelled');
    });

    it('should cancel completed command', async () => {
      const command = new TestPlayerActionCommand('player1', 'attack');
      await command.validate(mockGameContext);
      await command.execute(mockGameContext);

      command.cancel();

      expect(command.status).toBe('cancelled');
    });

    it('should fail to cancel executing command', () => {
      const command = new TestPlayerActionCommand('player1', 'attack');
      command.status = 'executing';

      expect(() => command.cancel()).toThrow('Cannot cancel command that is currently executing');
    });
  });

  describe('command summary', () => {
    it('should provide complete command summary', async () => {
      const command = new TestPlayerActionCommand('player1', 'attack', {
        targetId: 'player2',
        abilityId: 'sword',
        priority: 3,
        canUndo: true
      });

      await command.validate(mockGameContext);
      await command.execute(mockGameContext);

      const summary = command.getSummary();

      expect(summary).toEqual({
        id: command.id,
        playerId: 'player1',
        actionType: 'attack',
        targetId: 'player2',
        abilityId: 'sword',
        status: 'completed',
        timestamp: command.timestamp,
        executionTime: expect.any(Number),
        priority: 3,
        validationErrors: [],
        validationWarnings: [],
        canUndo: true
      });
    });

    it('should include validation errors in summary', async () => {
      mockPlayer.isAlive = false;
      const command = new TestPlayerActionCommand('player1', 'attack');

      await command.validate(mockGameContext);

      const summary = command.getSummary();

      expect(summary.validationErrors).toContain('Dead players cannot perform actions');
    });
  });

  describe('phase independence', () => {
    it('should identify phase-independent actions', () => {
      const chatCommand = new TestPlayerActionCommand('player1', 'chat');
      const spectateCommand = new TestPlayerActionCommand('player1', 'spectate');
      const readyCommand = new TestPlayerActionCommand('player1', 'ready');
      const notReadyCommand = new TestPlayerActionCommand('player1', 'not_ready');
      const attackCommand = new TestPlayerActionCommand('player1', 'attack');

      expect((chatCommand as any)._isPhaseIndependentAction()).toBe(true);
      expect((spectateCommand as any)._isPhaseIndependentAction()).toBe(true);
      expect((readyCommand as any)._isPhaseIndependentAction()).toBe(true);
      expect((notReadyCommand as any)._isPhaseIndependentAction()).toBe(true);
      expect((attackCommand as any)._isPhaseIndependentAction()).toBe(false);
    });
  });

  describe('static factory methods', () => {
    it('should create command from action data', () => {
      const actionData = {
        actionType: 'heal',
        targetId: 'player2',
        abilityId: 'healing_potion',
        metadata: { amount: 50 }
      };

      const command = PlayerActionCommand.fromActionData('player1', actionData);

      expect(command.playerId).toBe('player1');
      expect(command.actionType).toBe('heal');
      expect(command.targetId).toBe('player2');
      expect(command.abilityId).toBe('healing_potion');
      expect(command.metadata).toEqual({ amount: 50 });
    });

    it('should create command with minimal action data', () => {
      const actionData = {
        actionType: 'defend'
      };

      const command = PlayerActionCommand.fromActionData('player1', actionData);

      expect(command.playerId).toBe('player1');
      expect(command.actionType).toBe('defend');
      expect(command.targetId).toBeNull();
      expect(command.abilityId).toBeNull();
    });
  });

  describe('priority comparison', () => {
    it('should sort by priority (higher first)', () => {
      const lowPriority = new TestPlayerActionCommand('player1', 'heal', { priority: 1 });
      const highPriority = new TestPlayerActionCommand('player2', 'attack', { priority: 5 });

      const comparison = PlayerActionCommand.comparePriority(lowPriority, highPriority);

      expect(comparison).toBeGreaterThan(0); // highPriority should come first
    });

    it('should sort by timestamp when priority is equal', () => {
      const command1 = new TestPlayerActionCommand('player1', 'heal', { priority: 3 });
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1));
      const command2 = new TestPlayerActionCommand('player2', 'attack', { priority: 3 });

      const comparison = PlayerActionCommand.comparePriority(command1, command2);

      expect(comparison).toBeLessThan(0); // command1 should come first (earlier timestamp)
    });
  });

  describe('base class abstract methods', () => {
    it('should throw error for unimplemented _executeAction', async () => {
      const baseCommand = new PlayerActionCommand('player1', 'test');
      await baseCommand.validate(mockGameContext);

      await expect(baseCommand.execute(mockGameContext)).rejects.toThrow('_executeAction must be implemented by subclass');
    });

    it('should return null for base _captureUndoData', async () => {
      const baseCommand = new PlayerActionCommand('player1', 'test');

      const undoData = await (baseCommand as any)._captureUndoData(mockGameContext);

      expect(undoData).toBeNull();
    });

    it('should throw error for unimplemented _undoAction', async () => {
      const baseCommand = new PlayerActionCommand('player1', 'test', { canUndo: true });

      await expect((baseCommand as any)._undoAction(mockGameContext)).rejects.toThrow('_undoAction must be implemented by subclass if canUndo is true');
    });

    it('should not call _validateAction in base class', async () => {
      const baseCommand = new PlayerActionCommand('player1', 'test');

      await baseCommand.validate(mockGameContext);

      // Base implementation should be empty, so no errors should be added
      expect(baseCommand.validationErrors.length).toBeLessThanOrEqual(1); // Only basic validation errors
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle missing game context properties', async () => {
      const incompleteContext = { game: { getPlayerById: () => null } };
      const command = new TestPlayerActionCommand('player1', 'attack');

      await command.validate(incompleteContext as GameContext);

      expect(command.validationErrors).toContain('Player player1 not found');
    });

    it('should handle null metadata gracefully', () => {
      const command = new PlayerActionCommand('player1', 'attack', { metadata: null as any });

      expect(command.metadata).toEqual({});
    });

    it('should handle undefined options gracefully', () => {
      const command = new PlayerActionCommand('player1', 'attack', undefined as any);

      expect(command.targetId).toBeNull();
      expect(command.abilityId).toBeNull();
      expect(command.metadata).toEqual({});
      expect(command.priority).toBe(0);
      expect(command.canUndo).toBe(false);
    });

    it('should maintain immutable properties', () => {
      const command = new PlayerActionCommand('player1', 'attack');

      // These should be readonly
      expect(() => {
        (command as any).playerId = 'player2';
      }).toThrow();
    });
  });
});