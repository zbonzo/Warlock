/**
 * @fileoverview Base class for player action commands with TypeScript type safety
 * Implements command pattern for encapsulating player actions
 * Part of Phase 4 refactoring - TypeScript Migration with strong typing for command processing
 * Enhanced with Zod validation for runtime data integrity
 */
import { EventTypes } from '../events/EventTypes.js';
import { z } from 'zod';

import { lenientValidator } from '../validation/ValidationMiddleware.js';
import logger from '../../utils/logger.js';

/**
 * Command status enumeration
 */
export type CommandStatus = 'pending' | 'executing' | 'completed' | 'failed' | 'cancelled';

/**
 * Command options interface
 */
export interface CommandOptions {
  targetId?: string;
  abilityId?: string;
  metadata?: Record<string, unknown>;
  priority?: number;
  canUndo?: boolean;
}

/**
 * Game context interface for command execution
 */
export interface GameContext {
  game: any; // TODO: Type this properly when GameRoom is migrated
  systems?: any; // TODO: Type this properly when systems are migrated
  eventBus?: any; // TODO: Type this properly when GameEventBus is integrated
}

/**
 * Command execution result interface
 */
export interface CommandResult {
  success: boolean;
  data?: Record<string, unknown>;
  message?: string;
}

/**
 * Command summary interface
 */
export interface CommandSummary {
  id: string;
  playerId: string;
  actionType: string;
  targetId: string | null;
  abilityId: string | null;
  status: CommandStatus;
  timestamp: string;
  executionTime: number | null;
  priority: number;
  validationErrors: string[];
  validationWarnings: string[];
  canUndo: boolean;
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Base class for all player action commands
 * Encapsulates player actions with validation, execution, and rollback capabilities
 */
export class PlayerActionCommand {
  public readonly id: string;
  public readonly playerId: string;
  public readonly actionType: string;
  public readonly targetId: string | null;
  public readonly abilityId: string | null;
  public readonly metadata: Record<string, unknown>;
  public readonly priority: number;
  public readonly canUndo: boolean;
  public readonly timestamp: string;

  // Command state tracking
  public status: CommandStatus = 'pending';
  public executionTime: number | null = null;
  public result: CommandResult | null = null;
  public error: string | null = null;
  public undoData: Record<string, unknown> | null = null;
  
  // Validation state
  public validationErrors: string[] = [];
  public validationWarnings: string[] = [];
  public isValidated: boolean = false;

  /**
   * Create a new player action command
   * @param playerId - ID of the player executing the action
   * @param actionType - Type of action (attack, heal, defend, etc.)
   * @param options - Command options
   */
  constructor(playerId: string, actionType: string, options: CommandOptions = {}) {
    // Basic parameter validation
    if (!playerId || typeof playerId !== 'string') {
      throw new Error('Player ID must be a non-empty string');
    }
    if (!actionType || typeof actionType !== 'string') {
      throw new Error('Action type must be a non-empty string');
    }
    
    this.id = this._generateCommandId();
    this.playerId = playerId;
    this.actionType = actionType;
    this.targetId = options.targetId || null;
    this.abilityId = options.abilityId || null;
    this.metadata = options.metadata || {};
    this.priority = options.priority || 0;
    this.canUndo = options.canUndo || false;
    this.timestamp = new Date().toISOString();
  }

  /**
   * Validate the command before execution
   * @param gameContext - Current game context (game room, systems, etc.)
   * @returns True if command is valid
   */
  async validate(gameContext: GameContext): Promise<boolean> {
    this.validationErrors = [];
    this.validationWarnings = [];
    
    try {
      // Zod validation for basic command structure
      try {
        const validationResult = lenientValidator.validatePlayerAction({
          playerId: this.playerId,
          actionType: this.actionType,
          targetId: this.targetId,
          timestamp: this.timestamp
        });
        
        if (!validationResult.success) {
          this.validationErrors.push(...validationResult.errors);
        }
      } catch (zodError: any) {
        // If Zod validation fails, log but continue with basic validation
        logger.warn('Zod validation error in PlayerActionCommand', {
          error: zodError.message,
          playerId: this.playerId,
          actionType: this.actionType
        });
        // Fall back to basic validation only
      }
      
      // Basic validation (keep as fallback)
      if (!this.playerId) {
        this.validationErrors.push('Player ID is required');
      }
      
      if (!this.actionType) {
        this.validationErrors.push('Action type is required');
      }

      // Get player from game context
      const player = gameContext.game.getPlayerById(this.playerId);
      if (!player) {
        this.validationErrors.push(`Player ${this.playerId} not found`);
        return false;
      }

      // Check if player is alive (for most actions)
      if (!player.isAlive && this.actionType !== 'spectate') {
        this.validationErrors.push('Dead players cannot perform actions');
      }

      // Check game phase (most actions require action phase)
      if (gameContext.game.phase !== 'action' && !this._isPhaseIndependentAction()) {
        this.validationErrors.push(`Cannot perform ${this.actionType} during ${gameContext.game.phase} phase`);
      }

      // Validate target if specified (exclude monster targets)
      if (this.targetId && this.targetId !== 'monster' && this.targetId !== '__monster__') {
        const target = gameContext.game.getPlayerById(this.targetId);
        if (!target) {
          this.validationErrors.push(`Target ${this.targetId} not found`);
        }
      }

      // Call subclass validation
      await this._validateAction(gameContext);

      this.isValidated = this.validationErrors.length === 0;
      return this.isValidated;
    } catch (error: any) {
      this.validationErrors.push(`Validation error: ${error.message}`);
      logger.error('Command validation error:', {
        commandId: this.id,
        playerId: this.playerId,
        actionType: this.actionType,
        error: error.message,
        validationErrors: this.validationErrors
      });
      return false;
    }
  }

  /**
   * Execute the command
   * @param gameContext - Current game context
   * @returns Execution result
   */
  async execute(gameContext: GameContext): Promise<CommandResult> {
    if (!this.isValidated) {
      throw new Error('Command must be validated before execution');
    }

    if (this.validationErrors.length > 0) {
      throw new Error(`Cannot execute invalid command: ${this.validationErrors.join(', ')}`);
    }

    this.status = 'executing';
    const startTime = Date.now();

    try {
      // Emit action submitted event
      await gameContext.game.emitEvent(EventTypes.ACTION.SUBMITTED, {
        playerId: this.playerId,
        actionType: this.actionType,
        targetId: this.targetId,
        abilityId: this.abilityId,
        metadata: this.metadata,
        timestamp: this.timestamp
      });

      // Execute the actual command logic
      this.result = await this._executeAction(gameContext);

      // Store undo data if command supports undo
      if (this.canUndo) {
        this.undoData = await this._captureUndoData(gameContext);
      }

      this.status = 'completed';
      this.executionTime = Date.now() - startTime;

      // Emit action executed event
      await gameContext.game.emitEvent(EventTypes.ACTION.EXECUTED, {
        playerId: this.playerId,
        actionType: this.actionType,
        targetId: this.targetId,
        abilityId: this.abilityId,
        result: this.result,
        executionTime: this.executionTime,
        timestamp: new Date().toISOString()
      });

      return this.result;
    } catch (error: any) {
      this.status = 'failed';
      this.error = error.message;
      this.executionTime = Date.now() - startTime;

      // Emit action failed event
      await gameContext.game.emitEvent(EventTypes.ACTION.REJECTED, {
        playerId: this.playerId,
        actionType: this.actionType,
        error: error.message,
        timestamp: new Date().toISOString()
      });

      logger.error('Command execution failed:', {
        commandId: this.id,
        playerId: this.playerId,
        actionType: this.actionType,
        error: error.message,
        stack: error.stack
      });

      throw error;
    }
  }

  /**
   * Undo the command (if supported)
   * @param gameContext - Current game context
   * @returns True if successfully undone
   */
  async undo(gameContext: GameContext): Promise<boolean> {
    if (!this.canUndo) {
      throw new Error('Command does not support undo');
    }

    if (this.status !== 'completed') {
      throw new Error('Can only undo completed commands');
    }

    if (!this.undoData) {
      throw new Error('No undo data available');
    }

    try {
      await this._undoAction(gameContext);
      this.status = 'cancelled';
      
      // Emit action cancelled event
      await gameContext.game.emitEvent(EventTypes.ACTION.CANCELLED, {
        playerId: this.playerId,
        actionType: this.actionType,
        timestamp: new Date().toISOString()
      });

      return true;
    } catch (error: any) {
      logger.error('Command undo failed:', {
        commandId: this.id,
        playerId: this.playerId,
        actionType: this.actionType,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Cancel the command before execution
   */
  cancel(): void {
    if (this.status === 'executing') {
      throw new Error('Cannot cancel command that is currently executing');
    }
    
    this.status = 'cancelled';
  }

  /**
   * Get command summary for logging/debugging
   * @returns Command summary
   */
  getSummary(): CommandSummary {
    return {
      id: this.id,
      playerId: this.playerId,
      actionType: this.actionType,
      targetId: this.targetId,
      abilityId: this.abilityId,
      status: this.status,
      timestamp: this.timestamp,
      executionTime: this.executionTime,
      priority: this.priority,
      validationErrors: this.validationErrors,
      validationWarnings: this.validationWarnings,
      canUndo: this.canUndo
    };
  }

  // Protected methods for subclasses to override

  /**
   * Subclass-specific validation logic
   * @param gameContext - Current game context
   * @protected
   */
  protected async _validateAction(gameContext: GameContext): Promise<void> {
    // Override in subclasses
  }

  /**
   * Subclass-specific execution logic
   * @param gameContext - Current game context
   * @returns Execution result
   * @protected
   */
  protected async _executeAction(gameContext: GameContext): Promise<CommandResult> {
    throw new Error('_executeAction must be implemented by subclass');
  }

  /**
   * Capture data needed to undo this command
   * @param gameContext - Current game context
   * @returns Undo data
   * @protected
   */
  protected async _captureUndoData(gameContext: GameContext): Promise<Record<string, unknown> | null> {
    return null; // Override in subclasses that support undo
  }

  /**
   * Undo the action using captured undo data
   * @param gameContext - Current game context
   * @protected
   */
  protected async _undoAction(gameContext: GameContext): Promise<void> {
    throw new Error('_undoAction must be implemented by subclass if canUndo is true');
  }

  /**
   * Check if this action can be performed regardless of game phase
   * @returns True if phase-independent
   * @protected
   */
  protected _isPhaseIndependentAction(): boolean {
    const phaseIndependentActions = ['spectate', 'chat', 'ready', 'not_ready'];
    return phaseIndependentActions.includes(this.actionType);
  }

  /**
   * Generate unique command ID
   * @returns Unique command ID
   * @private
   */
  private _generateCommandId(): string {
    return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Static helper methods

  /**
   * Create a command from action data
   * @param playerId - Player ID
   * @param actionData - Action data from client
   * @returns Appropriate command instance
   */
  static fromActionData(playerId: string, actionData: Record<string, unknown>): PlayerActionCommand {
    const { actionType, targetId, abilityId, metadata } = actionData;
    
    // This will be expanded as we add specific command types
    return new PlayerActionCommand(playerId, actionType as string, {
      targetId: targetId as string,
      abilityId: abilityId as string,
      metadata: metadata as Record<string, unknown>
    });
  }

  /**
   * Compare commands for priority sorting
   * @param a - First command
   * @param b - Second command
   * @returns Sort comparison result
   */
  static comparePriority(a: PlayerActionCommand, b: PlayerActionCommand): number {
    // Higher priority first, then by timestamp for tie-breaking
    if (a.priority !== b.priority) {
      return b.priority - a.priority;
    }
    return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
  }
}

// ES module export
export default PlayerActionCommand;